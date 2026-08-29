import sql from '../db';
import {
  buildContestKey,
  contestProviderLabel,
  fetchClassroomContestRank,
  normalizeContestProvider,
  type ClassroomContestProvider,
} from '../services/classroomContestRankService';
import { ENROLLMENT_ACTIVE, ensurePreEnrollmentSchema } from '../utils/classroomPreEnrollment';
import {
  codeforcesApiKeyHint,
  decryptCodeforcesCredential,
  encryptCodeforcesCredential,
} from '../utils/codeforcesCredentialCrypto';
import {
  BASE_SCORING_VARIABLES,
  buildScoredContestReport,
  DEFAULT_COMPOSITE_FORMULA,
  DEFAULT_COMPOSITE_PENALTY_FORMULA,
  defaultScoringConfigForScope,
  normalizeScoringConfig,
  SORTABLE_SCORING_KEYS,
  type ContestScoringConfigInput,
  type ContestSourceInput,
} from '../services/contestScoringService';
import { isValidFormulaIdentifier, parseFormula } from '../services/contestFormula';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTEST_TYPES = new Set(['TFC', 'TSC', 'TPC']);

function normalizeText(value: unknown, maxLength = 500): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeUuid(value: unknown): string | null {
  const text = normalizeText(value, 80);
  return UUID_REGEX.test(text) ? text : null;
}

function normalizeContestType(value: unknown): string {
  const normalized = normalizeText(value, 20).toUpperCase();
  return CONTEST_TYPES.has(normalized) ? normalized : 'TFC';
}

function normalizeExternalContestIdForProvider(provider: ClassroomContestProvider, value: unknown): string {
  const text = normalizeText(value, 300);
  if (provider !== 'codeforces') return normalizeText(text, 40);

  const urlMatch = text.match(/codeforces\.com\/(?:group\/[A-Za-z0-9]+\/contest|contest|gym)\/(\d+)/i);
  if (urlMatch?.[1]) return urlMatch[1];

  const pathMatch = text.match(/^(?:group\/[A-Za-z0-9]+\/contest|contest|gym)\/(\d+)/i);
  if (pathMatch?.[1]) return pathMatch[1];

  return normalizeText(text, 40);
}

function clampPercentage(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric < 0) return 0;
  if (numeric > 100) return 100;
  return numeric;
}

function normalizeWeight(value: unknown, fallback = 1): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return numeric;
}

function normalizePoints(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.floor(numeric);
}

function normalizeSolveCount(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.floor(numeric);
}

function normalizeSortOrder(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return Math.floor(numeric);
}

function normalizeScorePrecision(value: unknown, fallback = 0): number {
  const numeric = Math.floor(Number(value));
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric < 0) return 0;
  if (numeric > 4) return 4;
  return numeric;
}

function normalizeDropWorstCount(value: unknown, fallback = 0): number {
  const numeric = Math.floor(Number(value));
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return numeric;
}

function normalizeFormulaKey(value: unknown): string | null {
  const key = normalizeText(value, 48).toLowerCase();
  return isValidFormulaIdentifier(key) ? key : null;
}

function formulaKeyForContest(provider: ClassroomContestProvider, externalContestId: string) {
  const prefix = provider === 'codeforces' ? 'cf' : 'vj';
  const normalized = `${prefix}_${externalContestId}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 48);
  return isValidFormulaIdentifier(normalized) ? normalized : `${prefix}_contest`;
}

function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeHandle(value: unknown, maxLength = 160): string {
  return normalizeText(value, maxLength).toLowerCase();
}

function providerHandleKey(provider: ClassroomContestProvider, handle: unknown): string {
  const normalized = normalizeHandle(handle, 160);
  return normalized ? `${provider}:${normalized}` : '';
}

function uniqueStrings(values: unknown[], maxLength = 160): string[] {
  return Array.from(new Set(values.map((value) => normalizeText(value, maxLength)).filter(Boolean)));
}

function getRankRowSourceHandles(row: any): string[] {
  return uniqueStrings([
    ...(Array.isArray(row?.sourceHandles) ? row.sourceHandles : []),
    row?.username,
    row?.realName,
    row?.providerMeta?.party?.teamName,
  ]);
}

function getRankRowCandidateKeys(row: any): string[] {
  return Array.from(new Set(getRankRowSourceHandles(row).map((handle) => normalizeHandle(handle)).filter(Boolean)));
}

function normalizeProblemWeights(value: unknown): { ok: boolean; weights: number[]; error?: string } {
  if (value === undefined || value === null || value === '') {
    return { ok: true, weights: [] };
  }

  let raw = value;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return { ok: true, weights: [] };
    if (text.startsWith('[')) {
      try {
        raw = JSON.parse(text);
      } catch {
        return { ok: false, weights: [], error: 'problemWeights must be a JSON array or comma-separated numbers' };
      }
    } else {
      raw = text.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  if (!Array.isArray(raw)) {
    return { ok: false, weights: [], error: 'problemWeights must be an array' };
  }

  const weights = raw.map((item) => Number(item));
  if (weights.some((item) => !Number.isFinite(item) || item < 0)) {
    return { ok: false, weights: [], error: 'problemWeights must contain non-negative numbers' };
  }

  return { ok: true, weights };
}

async function readJsonBody(c: any): Promise<any> {
  return c.req.json().catch(() => ({}));
}

function getUserId(c: any): string | null {
  const payload = c.get('jwtPayload') as { id?: string } | undefined;
  return payload?.id ? String(payload.id) : null;
}

async function canManageContestClassroom(userId: string, classroomId: string): Promise<boolean> {
  const rows = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM public.users actor
      WHERE actor.id = ${userId}
        AND (
          actor.admin IS TRUE
          OR (
            actor.trainer IS TRUE
            AND (
              EXISTS (
                SELECT 1
                FROM public.classrooms classroom
                WHERE classroom.id = ${classroomId}
                  AND classroom.created_by = ${userId}
              )
              OR EXISTS (
                SELECT 1
                FROM public.classroom_substitutes substitute
                WHERE substitute.classroom_id = ${classroomId}
                  AND substitute.trainer_id = ${userId}
              )
            )
          )
        )
    ) AS can_manage
  `;
  return Boolean(rows[0]?.can_manage);
}

async function canAccessContestClassroom(userId: string, classroomId: string): Promise<boolean> {
  await ensurePreEnrollmentSchema();
  const rows = await sql`
    SELECT cr.created_by,
           u.admin,
           u.is_pre_enrolled,
           cs.id AS student_check,
           substitute.trainer_id AS substitute_check
    FROM public.classrooms cr
    JOIN public.users u ON u.id = ${userId}
    LEFT JOIN public.classroom_students cs
      ON cr.id = cs.classroom_id
     AND cs.student_id = ${userId}
     AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}
    LEFT JOIN public.classroom_substitutes substitute
      ON substitute.classroom_id = cr.id
     AND substitute.trainer_id = ${userId}
    WHERE cr.id = ${classroomId}
  `;

  if (rows.length === 0) return false;
  const activeRealStudent = Boolean(rows[0].student_check) && !Boolean(rows[0].is_pre_enrolled);
  return rows[0].created_by === userId || Boolean(rows[0].admin || rows[0].substitute_check || activeRealStudent);
}

async function getManagedActor(c: any, classroomId: string) {
  const userId = getUserId(c);
  if (!userId) return { error: 'Unauthorized', status: 401 as const };
  if (!(await canManageContestClassroom(userId, classroomId))) {
    return { error: 'Classroom manager access required', status: 403 as const };
  }
  return { userId };
}

async function loadRoom(classroomId: string, roomId: string) {
  const rows = await sql`
    SELECT *
    FROM public.classroom_contest_rooms
    WHERE classroom_id = ${classroomId}
      AND id = ${roomId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function loadContestItem(classroomId: string, roomId: string, contestItemId: string) {
  const rows = await sql`
    SELECT *
    FROM public.classroom_contests
    WHERE classroom_id = ${classroomId}
      AND room_id = ${roomId}
      AND id = ${contestItemId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function nextClassroomContestFormulaKey(classroomId: string, roomId: string, provider: ClassroomContestProvider, externalContestId: string) {
  const base = formulaKeyForContest(provider, externalContestId);
  const rows = await sql`
    SELECT formula_key
    FROM public.classroom_contests
    WHERE classroom_id = ${classroomId}
      AND room_id = ${roomId}
      AND formula_key LIKE ${`${base}%`}
    UNION
    SELECT formula_key
    FROM public.classroom_contest_merge_groups
    WHERE classroom_id = ${classroomId}
      AND room_id = ${roomId}
      AND formula_key LIKE ${`${base}%`}
  `;
  const used = new Set(rows.map((row: any) => String(row.formula_key)));
  if (!used.has(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const suffix = `_${index}`;
    const candidate = `${base.slice(0, 48 - suffix.length)}${suffix}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error('Unable to allocate a contest formula key');
}

async function loadTrainerCodeforcesCredentialRow(trainerId: string) {
  const rows = await sql`
    SELECT *
    FROM public.classroom_codeforces_credentials
    WHERE trainer_id = ${trainerId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function loadTrainerCodeforcesCredentials(trainerId: string) {
  const row = await loadTrainerCodeforcesCredentialRow(trainerId);
  if (!row) return null;

  const [apiKey, apiSecret] = await Promise.all([
    decryptCodeforcesCredential(row.api_key_ciphertext),
    decryptCodeforcesCredential(row.api_secret_ciphertext),
  ]);

  await sql`
    UPDATE public.classroom_codeforces_credentials
    SET last_used_at = now()
    WHERE trainer_id = ${trainerId}
  `;

  return { apiKey, apiSecret };
}

function roomToApi(row: any, contests: any[] = [], report: any = null) {
  return {
    id: row.id,
    classroomId: row.classroom_id,
    name: row.name,
    contestType: row.contest_type,
    tfcReferenceRoomId: row.tfc_reference_room_id,
    tfcPercentage: Number(row.tfc_percentage || 0),
    tscPercentage: Number(row.tsc_percentage || 100),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contests,
    report: report
      ? {
        id: report.id,
        visibleToStudents: Boolean(report.visible_to_students),
        updatedAt: report.updated_at,
        sharedAt: report.shared_at,
      }
      : null,
  };
}

function contestToApi(row: any) {
  return {
    id: row.id,
    classroomId: row.classroom_id,
    roomId: row.room_id,
    provider: row.provider,
    externalContestId: row.external_contest_id,
    title: row.title,
    weight: Number(row.weight || 1),
    problemWeights: Array.isArray(row.problem_weights) ? row.problem_weights : [],
    formulaKey: row.formula_key || null,
    mergeGroupId: row.merge_group_id || null,
    sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : null,
    lastFetchedAt: row.last_fetched_at,
    latestSnapshotAt: row.latest_snapshot_at || null,
    latestSnapshotId: row.latest_snapshot_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function handleOverrideToApi(row: any) {
  const provider = normalizeContestProvider(row.provider);
  const targetType = normalizeText(row.target_type, 20).toLowerCase();
  return {
    id: row.id,
    classroomId: row.classroom_id,
    provider,
    handle: row.vjudge_handle,
    vjudgeHandle: row.vjudge_handle,
    targetType,
    studentId: row.student_id,
    groupId: row.group_id,
    targetName: targetType === 'ignore' ? 'Ignored' : targetType === 'group' ? row.group_name : row.student_name,
    studentName: row.student_name,
    studentEmail: row.student_email,
    studentMistId: row.student_mist_id,
    groupName: row.group_name,
    ignored: targetType === 'ignore',
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function demeritToApi(row: any) {
  const provider = normalizeContestProvider(row.provider);
  return {
    id: row.id,
    classroomId: row.classroom_id,
    roomId: row.room_id,
    contestItemId: row.contest_id,
    provider,
    externalContestId: row.external_contest_id,
    contestTitle: row.contest_title,
    handle: row.vjudge_handle,
    vjudgeHandle: row.vjudge_handle,
    points: Number(row.points || 0),
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function solveOverrideToApi(row: any) {
  const targetType = normalizeText(row.target_type, 20).toLowerCase();
  return {
    id: row.id,
    classroomId: row.classroom_id,
    roomId: row.room_id,
    contestItemId: row.contest_id,
    provider: normalizeContestProvider(row.provider),
    externalContestId: row.external_contest_id,
    contestTitle: row.contest_title,
    targetType,
    studentId: row.student_id,
    groupId: row.group_id,
    targetName: targetType === 'group' ? row.group_name : row.student_name,
    studentName: row.student_name,
    studentEmail: row.student_email,
    studentMistId: row.student_mist_id,
    groupName: row.group_name,
    solveCount: Number(row.solve_count || 0),
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function codeforcesCredentialStatusToApi(row: any = null) {
  return {
    configured: Boolean(row),
    apiKeyHint: row?.api_key_hint || null,
    updatedAt: row?.updated_at || null,
    lastUsedAt: row?.last_used_at || null,
  };
}

function normalizeCodeforcesCredential(value: unknown, maxLength = 1000): string {
  return normalizeText(value, maxLength);
}

function reportToApi(row: any) {
  return {
    id: row.id,
    classroomId: row.classroom_id,
    roomId: row.room_id,
    data: row.data,
    visibleToStudents: Boolean(row.visible_to_students),
    isStale: Boolean(row.is_stale),
    scoringConfigVersion: Number(row.scoring_config_version || row.data?.scoring?.version || 0),
    sharedAt: row.shared_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function validateRoomSettings(classroomId: string, payload: any, existingRow: any = null, roomIdForUpdate: string | null = null) {
  const contestType = normalizeContestType(payload?.contestType ?? payload?.contest_type ?? existingRow?.contest_type);
  const roomName = normalizeText(payload?.name ?? payload?.room_name ?? existingRow?.name, 160);
  let referenceRoomId = normalizeUuid(payload?.tfcReferenceRoomId ?? payload?.tfc_reference_room_id ?? existingRow?.tfc_reference_room_id);
  const tfcPercentage = clampPercentage(payload?.tfcPercentage ?? payload?.tfc_percentage ?? existingRow?.tfc_percentage ?? 0, 0);
  const tscPercentage = clampPercentage(payload?.tscPercentage ?? payload?.tsc_percentage ?? existingRow?.tsc_percentage ?? (100 - tfcPercentage), 100 - tfcPercentage);

  if (!roomName) {
    return { error: 'Room name is required' };
  }

  if (contestType !== 'TSC') {
    return {
      name: roomName,
      contestType,
      tfcReferenceRoomId: null,
      tfcPercentage: 0,
      tscPercentage: 100,
    };
  }

  if (roomIdForUpdate && referenceRoomId === roomIdForUpdate) {
    return { error: 'A TSC room cannot reference itself as TFC room' };
  }

  if (tfcPercentage > 0 && !referenceRoomId) {
    return { error: 'tfcReferenceRoomId is required when TFC percentage is greater than 0' };
  }

  if (referenceRoomId) {
    const referenceRows = await sql`
      SELECT id, contest_type
      FROM public.classroom_contest_rooms
      WHERE classroom_id = ${classroomId}
        AND id = ${referenceRoomId}
      LIMIT 1
    `;
    if (referenceRows.length === 0) {
      return { error: 'Selected TFC reference room was not found in this classroom' };
    }
    if (normalizeContestType(referenceRows[0].contest_type) !== 'TFC') {
      return { error: 'Selected reference room must be a TFC room' };
    }
  } else {
    referenceRoomId = null;
  }

  return {
    name: roomName,
    contestType,
    tfcReferenceRoomId: referenceRoomId,
    tfcPercentage,
    tscPercentage,
  };
}

async function listRoomContests(classroomId: string) {
  const rows = await sql`
    SELECT contest.*,
           latest.id AS latest_snapshot_id,
           latest.fetched_at AS latest_snapshot_at
    FROM public.classroom_contests contest
    LEFT JOIN LATERAL (
      SELECT snapshot.id, snapshot.fetched_at
      FROM public.classroom_contest_snapshots snapshot
      WHERE snapshot.contest_id = contest.id
      ORDER BY snapshot.fetched_at DESC
      LIMIT 1
    ) latest ON TRUE
    WHERE contest.classroom_id = ${classroomId}
    ORDER BY contest.sort_order ASC NULLS LAST, contest.created_at ASC, contest.id ASC
  `;
  return rows.map(contestToApi);
}

async function listReportsByClassroom(classroomId: string) {
  const rows = await sql`
    SELECT id, room_id, visible_to_students, shared_at, updated_at, is_stale, scoring_config_version
    FROM public.classroom_contest_reports
    WHERE classroom_id = ${classroomId}
  `;
  const byRoom = new Map<string, any>();
  rows.forEach((row: any) => byRoom.set(String(row.room_id), row));
  return byRoom;
}

export const listClassroomContestRooms = async (c: any) => {
  const classroomId = c.req.param('id');
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!(await canAccessContestClassroom(userId, classroomId))) {
      return c.json({ error: 'Unauthorized' }, 403);
    }
    const isManager = await canManageContestClassroom(userId, classroomId);

    const [roomRows, contestRows, reportsByRoom] = await Promise.all([
      sql`
        SELECT *
        FROM public.classroom_contest_rooms
        WHERE classroom_id = ${classroomId}
        ORDER BY created_at DESC
      `,
      listRoomContests(classroomId),
      listReportsByClassroom(classroomId),
    ]);

    const visibleRoomRows = isManager
      ? roomRows
      : roomRows.filter((room: any) => Boolean(reportsByRoom.get(String(room.id))?.visible_to_students));
    const visibleRoomIds = new Set(visibleRoomRows.map((room: any) => String(room.id)));

    const contestsByRoom = new Map<string, any[]>();
    contestRows.forEach((contest: any) => {
      if (!visibleRoomIds.has(String(contest.roomId))) return;
      const roomContests = contestsByRoom.get(contest.roomId) || [];
      roomContests.push(contest);
      contestsByRoom.set(contest.roomId, roomContests);
    });

    const rooms = visibleRoomRows.map((room: any) => roomToApi(
      room,
      contestsByRoom.get(String(room.id)) || [],
      reportsByRoom.get(String(room.id)) || null,
    ));

    return c.json({ success: true, rooms });
  } catch (error: any) {
    console.error('Error listing classroom contest rooms:', error);
    return c.json({ error: error?.message || 'Failed to list contest rooms' }, 500);
  }
};

export const createClassroomContestRoom = async (c: any) => {
  const classroomId = c.req.param('id');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const body = await readJsonBody(c);
    const settings = await validateRoomSettings(classroomId, body);
    if ('error' in settings) return c.json({ error: settings.error }, 400);

    const rows = await sql`
      INSERT INTO public.classroom_contest_rooms (
        classroom_id,
        name,
        contest_type,
        tfc_reference_room_id,
        tfc_percentage,
        tsc_percentage,
        created_by,
        updated_by
      )
      VALUES (
        ${classroomId},
        ${settings.name},
        ${settings.contestType},
        ${settings.tfcReferenceRoomId},
        ${settings.tfcPercentage},
        ${settings.tscPercentage},
        ${actor.userId},
        ${actor.userId}
      )
      RETURNING *
    `;

    return c.json({ success: true, room: roomToApi(rows[0], [], null) });
  } catch (error: any) {
    console.error('Error creating classroom contest room:', error);
    return c.json({ error: error?.message || 'Failed to create contest room' }, 500);
  }
};

export const updateClassroomContestRoom = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const current = await loadRoom(classroomId, roomId);
    if (!current) return c.json({ error: 'Contest room not found' }, 404);

    const body = await readJsonBody(c);
    const settings = await validateRoomSettings(classroomId, body, current, roomId);
    if ('error' in settings) return c.json({ error: settings.error }, 400);

    const rows = await sql`
      UPDATE public.classroom_contest_rooms
      SET name = ${settings.name},
          contest_type = ${settings.contestType},
          tfc_reference_room_id = ${settings.tfcReferenceRoomId},
          tfc_percentage = ${settings.tfcPercentage},
          tsc_percentage = ${settings.tscPercentage},
          updated_by = ${actor.userId},
          updated_at = now()
      WHERE classroom_id = ${classroomId}
        AND id = ${roomId}
      RETURNING *
    `;

    return c.json({ success: true, room: roomToApi(rows[0], [], null) });
  } catch (error: any) {
    console.error('Error updating classroom contest room:', error);
    return c.json({ error: error?.message || 'Failed to update contest room' }, 500);
  }
};

export const deleteClassroomContestRoom = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const rows = await sql`
      DELETE FROM public.classroom_contest_rooms
      WHERE classroom_id = ${classroomId}
        AND id = ${roomId}
      RETURNING *
    `;
    if (rows.length === 0) return c.json({ error: 'Contest room not found' }, 404);

    return c.json({ success: true, room: roomToApi(rows[0], [], null) });
  } catch (error: any) {
    console.error('Error deleting classroom contest room:', error);
    return c.json({ error: error?.message || 'Failed to delete contest room' }, 500);
  }
};

function codeforcesCredentialStorageError(error: any) {
  const message = String(error?.message || '');
  if (message.includes('CODEFORCES_CREDENTIAL_ENCRYPTION_KEY')) {
    return {
      statusCode: 500,
      body: {
        status: 'error',
        code: 'CODEFORCES_CREDENTIAL_ENCRYPTION_MISSING',
        error: 'Codeforces credential encryption is not configured on the server.',
      },
    };
  }

  return null;
}

export const getClassroomCodeforcesCredentials = async (c: any) => {
  const classroomId = c.req.param('id');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const row = await loadTrainerCodeforcesCredentialRow(actor.userId);
    return c.json({
      success: true,
      credential: codeforcesCredentialStatusToApi(row),
      setupUrl: 'https://codeforces.com/settings/api',
      instructions: [
        'Open Codeforces API settings.',
        'Create or copy an API key and secret from the Codeforces account that can view the Gym or mashup contest.',
        'Paste both values here. MCC stores them encrypted and uses them only for authenticated Codeforces standings fetches.',
      ],
    });
  } catch (error: any) {
    console.error('Error loading trainer Codeforces API credential status:', error);
    return c.json({ error: error?.message || 'Failed to load Codeforces API credential status' }, 500);
  }
};

export const saveClassroomCodeforcesCredentials = async (c: any) => {
  const classroomId = c.req.param('id');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const body = await readJsonBody(c);
    const apiKey = normalizeCodeforcesCredential(body?.apiKey ?? body?.api_key ?? body?.key, 200);
    const apiSecret = normalizeCodeforcesCredential(body?.apiSecret ?? body?.api_secret ?? body?.secret, 1000);
    if (!apiKey || !apiSecret) {
      return c.json({
        status: 'error',
        code: 'CODEFORCES_CREDENTIALS_REQUIRED',
        error: 'Codeforces API key and secret are required.',
      }, 400);
    }

    const [apiKeyCiphertext, apiSecretCiphertext] = await Promise.all([
      encryptCodeforcesCredential(apiKey),
      encryptCodeforcesCredential(apiSecret),
    ]);
    const keyHint = codeforcesApiKeyHint(apiKey);

    const rows = await sql`
      INSERT INTO public.classroom_codeforces_credentials (
        trainer_id,
        api_key_ciphertext,
        api_secret_ciphertext,
        api_key_hint,
        created_by,
        updated_by
      )
      VALUES (
        ${actor.userId},
        ${apiKeyCiphertext},
        ${apiSecretCiphertext},
        ${keyHint},
        ${actor.userId},
        ${actor.userId}
      )
      ON CONFLICT (trainer_id)
      DO UPDATE SET
        api_key_ciphertext = EXCLUDED.api_key_ciphertext,
        api_secret_ciphertext = EXCLUDED.api_secret_ciphertext,
        api_key_hint = EXCLUDED.api_key_hint,
        updated_by = EXCLUDED.updated_by,
        updated_at = now()
      RETURNING *
    `;

    return c.json({
      success: true,
      credential: codeforcesCredentialStatusToApi(rows[0]),
    });
  } catch (error: any) {
    const storageError = codeforcesCredentialStorageError(error);
    if (storageError) return c.json(storageError.body, storageError.statusCode as any);

    console.error('Error saving trainer Codeforces API credentials:', error);
    return c.json({ error: error?.message || 'Failed to save Codeforces API credentials' }, 500);
  }
};

export const deleteClassroomCodeforcesCredentials = async (c: any) => {
  const classroomId = c.req.param('id');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    await sql`
      DELETE FROM public.classroom_codeforces_credentials
      WHERE trainer_id = ${actor.userId}
    `;

    return c.json({
      success: true,
      credential: codeforcesCredentialStatusToApi(null),
    });
  } catch (error: any) {
    console.error('Error deleting trainer Codeforces API credentials:', error);
    return c.json({ error: error?.message || 'Failed to delete Codeforces API credentials' }, 500);
  }
};

export const createClassroomContestItem = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const room = await loadRoom(classroomId, roomId);
    if (!room) return c.json({ error: 'Contest room not found' }, 404);

    const body = await readJsonBody(c);
    const provider = normalizeContestProvider(body?.provider ?? body?.contestProvider);
    const externalContestId = normalizeExternalContestIdForProvider(
      provider,
      body?.externalContestId ?? body?.contestId ?? body?.contest_id,
    );
    if (!/^\d+$/.test(externalContestId)) {
      return c.json({ error: `${contestProviderLabel(provider)} contest id must be numeric${provider === 'codeforces' ? ' or a Codeforces contest URL' : ''}` }, 400);
    }

    const title = normalizeText(body?.title ?? body?.name ?? body?.contestName, 180) || `${contestProviderLabel(provider)} ${externalContestId}`;
    const weight = normalizeWeight(body?.weight, 1);
    const problemWeights = normalizeProblemWeights(body?.problemWeights ?? body?.problem_weights);
    if (!problemWeights.ok) return c.json({ error: problemWeights.error }, 400);
    const formulaKey = await nextClassroomContestFormulaKey(classroomId, roomId, provider, externalContestId);

    const rows = await sql`
      INSERT INTO public.classroom_contests (
        classroom_id,
        room_id,
        provider,
        external_contest_id,
        title,
        weight,
        problem_weights,
        formula_key,
        sort_order,
        created_by,
        updated_by
      )
      VALUES (
        ${classroomId},
        ${roomId},
        ${provider},
        ${externalContestId},
        ${title},
        ${weight},
        ${sql.json(problemWeights.weights)},
        ${formulaKey},
        (
          SELECT COALESCE(MAX(sort_order) + 1, COUNT(*)::integer)
          FROM public.classroom_contests
          WHERE classroom_id = ${classroomId}
            AND room_id = ${roomId}
        ),
        ${actor.userId},
        ${actor.userId}
      )
      ON CONFLICT (room_id, provider, external_contest_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        weight = EXCLUDED.weight,
        problem_weights = EXCLUDED.problem_weights,
        formula_key = COALESCE(classroom_contests.formula_key, EXCLUDED.formula_key),
        updated_by = EXCLUDED.updated_by,
        updated_at = now()
      RETURNING *
    `;

    return c.json({ success: true, contest: contestToApi(rows[0]) });
  } catch (error: any) {
    console.error('Error creating classroom contest item:', error);
    return c.json({ error: error?.message || 'Failed to save contest item' }, 500);
  }
};

export const updateClassroomContestItem = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  const body = await readJsonBody(c);
  const contestItemId = c.req.param('contestItemId') || normalizeUuid(body?.contestItemId ?? body?.id);
  if (!contestItemId) return c.json({ error: 'contestItemId is required' }, 400);

  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const current = await loadContestItem(classroomId, roomId, contestItemId);
    if (!current) return c.json({ error: 'Contest item not found' }, 404);

    const nextProvider = normalizeContestProvider(body?.provider ?? body?.contestProvider ?? current.provider);
    const nextExternalContestId = normalizeExternalContestIdForProvider(
      nextProvider,
      body?.externalContestId ?? body?.contestId ?? body?.contest_id ?? current.external_contest_id,
    );
    if (!/^\d+$/.test(nextExternalContestId)) {
      return c.json({ error: `${contestProviderLabel(nextProvider)} contest id must be numeric${nextProvider === 'codeforces' ? ' or a Codeforces contest URL' : ''}` }, 400);
    }
    const nextTitle = normalizeText(body?.title ?? body?.name ?? body?.contestName ?? current.title, 180) || `${contestProviderLabel(nextProvider)} ${nextExternalContestId}`;
    const nextWeight = normalizeWeight(body?.weight ?? current.weight, Number(current.weight || 1));
    const nextProblemWeights = normalizeProblemWeights(body?.problemWeights ?? body?.problem_weights ?? current.problem_weights);
    if (!nextProblemWeights.ok) return c.json({ error: nextProblemWeights.error }, 400);
    const nextSortOrder = body?.sortOrder === undefined && body?.sort_order === undefined
      ? current.sort_order
      : normalizeSortOrder(body?.sortOrder ?? body?.sort_order);
    const identityChanged = nextProvider !== normalizeContestProvider(current.provider)
      || nextExternalContestId !== String(current.external_contest_id);

    const rows = await sql.begin(async (tx) => {
      if (identityChanged) {
        await tx`
          DELETE FROM public.classroom_contest_snapshots
          WHERE classroom_id = ${classroomId}
            AND room_id = ${roomId}
            AND contest_id = ${contestItemId}
        `;
      }

      return tx`
        UPDATE public.classroom_contests
        SET provider = ${nextProvider},
            external_contest_id = ${nextExternalContestId},
            title = ${nextTitle},
            weight = ${nextWeight},
            problem_weights = ${tx.json(nextProblemWeights.weights)},
            sort_order = ${nextSortOrder},
            last_fetched_at = ${identityChanged ? null : current.last_fetched_at},
            updated_by = ${actor.userId},
            updated_at = now()
        WHERE classroom_id = ${classroomId}
          AND room_id = ${roomId}
          AND id = ${contestItemId}
        RETURNING *
      `;
    });

    return c.json({ success: true, contest: contestToApi(rows[0]) });
  } catch (error: any) {
    console.error('Error updating classroom contest item:', error);
    return c.json({ error: error?.message || 'Failed to update contest item' }, 500);
  }
};

export const updateClassroomContestItemOrder = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const room = await loadRoom(classroomId, roomId);
    if (!room) return c.json({ error: 'Contest room not found' }, 404);

    const body = await readJsonBody(c);
    const rawIds = Array.isArray(body?.contestItemIds)
      ? body.contestItemIds
      : Array.isArray(body?.contest_item_ids)
        ? body.contest_item_ids
        : [];
    const orderedIds = rawIds.map(normalizeUuid).filter(Boolean) as string[];
    const uniqueOrderedIds = Array.from(new Set(orderedIds));
    if (uniqueOrderedIds.length !== rawIds.length) {
      return c.json({ error: 'Contest order must include unique contest item ids' }, 400);
    }

    const currentRows = await sql`
      SELECT id
      FROM public.classroom_contests
      WHERE classroom_id = ${classroomId}
        AND room_id = ${roomId}
      ORDER BY sort_order ASC NULLS LAST, created_at ASC, id ASC
    `;
    const currentIds = currentRows.map((row: any) => String(row.id));
    const currentSet = new Set(currentIds);
    const postedSet = new Set(uniqueOrderedIds);

    if (
      uniqueOrderedIds.length !== currentIds.length
      || currentIds.some((id) => !postedSet.has(id))
      || uniqueOrderedIds.some((id) => !currentSet.has(id))
    ) {
      return c.json({ error: 'Contest order must include every contest in this room exactly once' }, 400);
    }

    await sql.begin(async (tx) => {
      for (let index = 0; index < uniqueOrderedIds.length; index += 1) {
        await tx`
          UPDATE public.classroom_contests
          SET sort_order = ${index},
              updated_by = ${actor.userId},
              updated_at = now()
          WHERE classroom_id = ${classroomId}
            AND room_id = ${roomId}
            AND id = ${uniqueOrderedIds[index]}
        `;
      }
    });

    const contests = (await listRoomContests(classroomId))
      .filter((contest: any) => String(contest.roomId) === String(roomId));

    return c.json({ success: true, contests });
  } catch (error: any) {
    console.error('Error updating classroom contest order:', error);
    return c.json({ error: error?.message || 'Failed to update contest order' }, 500);
  }
};

export const deleteClassroomContestItem = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  const body = await readJsonBody(c);
  const contestItemId = c.req.param('contestItemId') || normalizeUuid(body?.contestItemId ?? body?.id);
  if (!contestItemId) return c.json({ error: 'contestItemId is required' }, 400);

  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const rows = await sql`
      DELETE FROM public.classroom_contests
      WHERE classroom_id = ${classroomId}
        AND room_id = ${roomId}
        AND id = ${contestItemId}
      RETURNING *
    `;
    if (rows.length === 0) return c.json({ error: 'Contest item not found' }, 404);

    return c.json({ success: true, contest: contestToApi(rows[0]) });
  } catch (error: any) {
    console.error('Error deleting classroom contest item:', error);
    return c.json({ error: error?.message || 'Failed to delete contest item' }, 500);
  }
};

export const fetchClassroomContestItem = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  const contestItemId = c.req.param('contestItemId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const contest = await loadContestItem(classroomId, roomId, contestItemId);
    if (!contest) return c.json({ error: 'Contest item not found' }, 404);

    const body = await readJsonBody(c);
    const bodyWeights = body?.problemWeights !== undefined || body?.problem_weights !== undefined
      ? normalizeProblemWeights(body?.problemWeights ?? body?.problem_weights)
      : null;
    if (bodyWeights && !bodyWeights.ok) return c.json({ error: bodyWeights.error }, 400);

    const savedWeights = normalizeProblemWeights(contest.problem_weights);
    const problemWeights = bodyWeights?.weights ?? savedWeights.weights;
    const provider = normalizeContestProvider(contest.provider);
    const session = provider === 'vjudge' ? c.req.header('X-VJudge-Session') : undefined;
    const result = await fetchClassroomContestRank({
      provider,
      externalContestId: String(contest.external_contest_id),
      problemWeights,
      vjudgeSession: session,
      codeforcesCredentialProvider: provider === 'codeforces'
        ? () => loadTrainerCodeforcesCredentials(actor.userId)
        : undefined,
    });
    if (result.statusCode !== 200) {
      return c.json(result.body, result.statusCode as any);
    }

    const baseRankData = {
      ...result.body,
      provider,
      fullParticipantCount: result.body?.fullParticipantCount ?? result.body?.providerMeta?.fullParticipantCount ?? result.body?.totalTeams,
      contestInfo: {
        ...(result.body?.contestInfo || {}),
        id: buildContestKey(provider, String(contest.external_contest_id)),
        provider,
        externalContestId: String(contest.external_contest_id),
        title: contest.title || result.body?.contestInfo?.title || `Contest ${contest.external_contest_id}`,
      },
    };
    let rankData = baseRankData;

    if (provider === 'codeforces') {
      const rosterMaps = await getClassroomRosterMaps(classroomId);
      const overrideMaps = await getClassroomHandleOverrideMaps(classroomId, rosterMaps);
      const maps = { ...rosterMaps, ...overrideMaps };
      rankData = applyRankDataClassroomMappings(baseRankData, maps, provider, false);
    }

    const rows = await sql`
      INSERT INTO public.classroom_contest_snapshots (
        classroom_id,
        room_id,
        contest_id,
        external_contest_id,
        rank_data,
        fetched_by
      )
      VALUES (
        ${classroomId},
        ${roomId},
        ${contestItemId},
        ${String(contest.external_contest_id)},
        ${sql.json(rankData)},
        ${actor.userId}
      )
      RETURNING *
    `;

    const itemRows = await sql`
      UPDATE public.classroom_contests
      SET last_fetched_at = ${rows[0].fetched_at},
          problem_weights = ${sql.json(problemWeights)},
          updated_by = ${actor.userId},
          updated_at = now()
      WHERE id = ${contestItemId}
      RETURNING *
    `;

    return c.json({
      success: true,
      snapshot: rows[0],
      contest: contestToApi({ ...itemRows[0], latest_snapshot_id: rows[0].id, latest_snapshot_at: rows[0].fetched_at }),
      data: rankData,
    });
  } catch (error: any) {
    console.error('Error fetching classroom contest item:', error);
    return c.json({ error: error?.message || 'Failed to fetch classroom contest rank' }, 500);
  }
};

async function getClassroomRosterMaps(classroomId: string) {
  await ensurePreEnrollmentSchema();
  const [students, groups] = await Promise.all([
    sql`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.mist_id,
        u.vjudge_id,
        u.vjudge_verified,
        u.cf_id,
        u.cf_verified,
        cs.enrollment_status,
        u.is_pre_enrolled
      FROM public.classroom_students cs
      JOIN public.users u ON u.id = cs.student_id
      WHERE cs.classroom_id = ${classroomId}
        AND u.admin IS NOT TRUE
        AND u.trainer IS NOT TRUE
      ORDER BY u.full_name ASC
    `,
    sql`
      SELECT
        t.id AS group_id,
        t.name AS group_name,
        u.id AS student_id,
        u.full_name,
        u.email,
        u.mist_id,
        u.vjudge_id,
        u.vjudge_verified,
        u.cf_id,
        u.cf_verified
      FROM public.trainer_teams t
      LEFT JOIN public.trainer_team_members tm ON tm.team_id = t.id
      LEFT JOIN public.users u ON u.id = tm.student_id AND u.admin IS NOT TRUE AND u.trainer IS NOT TRUE
      WHERE t.classroom_id = ${classroomId}
      ORDER BY t.name ASC, u.full_name ASC
    `,
  ]);

  const verifiedStudentByHandle = new Map<string, any>();
  const verifiedStudentByProviderHandle = new Map<string, any>();
  const studentById = new Map<string, any>();
  const groupById = new Map<string, any>();
  const groupByName = new Map<string, any>();

  students.forEach((student: any) => {
    const apiStudent = {
      id: student.id,
      name: student.full_name,
      fullName: student.full_name,
      email: student.email,
      mistId: student.mist_id,
      vjudgeId: student.vjudge_id,
      vjudgeVerified: Boolean(student.vjudge_verified),
      cfId: student.cf_id,
      cfVerified: Boolean(student.cf_verified),
      enrollmentStatus: student.enrollment_status,
    };
    studentById.set(String(student.id), apiStudent);
    const vjudgeHandle = normalizeHandle(student.vjudge_id, 120);
    const codeforcesHandle = normalizeHandle(student.cf_id, 120);
    if (student.enrollment_status === ENROLLMENT_ACTIVE && !student.is_pre_enrolled) {
      if (vjudgeHandle && student.vjudge_verified) {
        verifiedStudentByHandle.set(vjudgeHandle, apiStudent);
        verifiedStudentByProviderHandle.set(providerHandleKey('vjudge', vjudgeHandle), apiStudent);
      }
      if (codeforcesHandle && student.cf_verified) {
        verifiedStudentByProviderHandle.set(providerHandleKey('codeforces', codeforcesHandle), apiStudent);
      }
    }
  });

  groups.forEach((row: any) => {
    if (!row.group_id) return;
    const groupId = String(row.group_id);
    if (!groupById.has(groupId)) {
      const group = {
        id: groupId,
        name: row.group_name,
        members: [],
      };
      groupById.set(groupId, group);
      const normalizedName = normalizeText(row.group_name, 160).toLowerCase();
      if (normalizedName) groupByName.set(normalizedName, group);
    }

    if (row.student_id) {
      groupById.get(groupId).members.push({
        id: row.student_id,
        name: row.full_name,
        fullName: row.full_name,
        email: row.email,
        mistId: row.mist_id,
        vjudgeId: row.vjudge_id,
        vjudgeVerified: Boolean(row.vjudge_verified),
        cfId: row.cf_id,
        cfVerified: Boolean(row.cf_verified),
      });
    }
  });

  return {
    verifiedStudentByHandle,
    verifiedStudentByProviderHandle,
    studentById,
    groupById,
    groupByName,
  };
}

async function getClassroomHandleOverrideMaps(classroomId: string, rosterMaps: any) {
  const rows = await sql`
    SELECT o.*,
           COALESCE(o.provider, 'vjudge') AS provider,
           student.full_name AS student_name,
           student.email AS student_email,
           student.mist_id AS student_mist_id,
           student.vjudge_id AS student_vjudge_id,
           student.cf_id AS student_cf_id,
           team.name AS group_name
    FROM public.classroom_contest_handle_overrides o
    LEFT JOIN public.users student ON student.id = o.student_id
    LEFT JOIN public.trainer_teams team ON team.id = o.group_id
    WHERE o.classroom_id = ${classroomId}
    ORDER BY lower(o.vjudge_handle) ASC
  `;

  const overrideByHandle = new Map<string, any>();
  const overrideByProviderHandle = new Map<string, any>();
  rows.forEach((row: any) => {
    const provider = normalizeContestProvider(row.provider);
    const handle = normalizeHandle(row.vjudge_handle, 120);
    if (!handle) return;
    const key = providerHandleKey(provider, handle);
    if (row.target_type === 'ignore') {
      const mapping = mappingWithIdentity({
        matchedBy: 'handle_ignore',
        targetType: 'ignore',
        studentId: null,
        groupId: null,
        targetName: 'Ignored',
        student: null,
        group: null,
        isIgnored: true,
      });
      overrideByProviderHandle.set(key, mapping);
      if (provider === 'vjudge') overrideByHandle.set(handle, mapping);
      return;
    }

    if (row.target_type === 'student') {
      const student = rosterMaps.studentById.get(String(row.student_id)) || {
        id: row.student_id,
        name: row.student_name,
        fullName: row.student_name,
        email: row.student_email,
        mistId: row.student_mist_id,
        vjudgeId: row.student_vjudge_id,
        cfId: row.student_cf_id,
      };
      const mapping = {
        matchedBy: 'handle_override',
        targetType: 'student',
        studentId: row.student_id,
        groupId: null,
        targetName: student.name,
        student,
        group: null,
      };
      overrideByProviderHandle.set(key, mapping);
      if (provider === 'vjudge') overrideByHandle.set(handle, mapping);
      return;
    }

    const group = rosterMaps.groupById.get(String(row.group_id)) || {
      id: row.group_id,
      name: row.group_name,
      members: [],
    };
    const mapping = {
      matchedBy: 'handle_override',
      targetType: 'group',
      studentId: null,
      groupId: row.group_id,
      targetName: group.name,
      student: null,
      group,
    };
    overrideByProviderHandle.set(key, mapping);
    if (provider === 'vjudge') overrideByHandle.set(handle, mapping);
  });

  return { overrides: rows.map(handleOverrideToApi), overrideByHandle, overrideByProviderHandle };
}

function emptyClassroomMapping() {
  return {
    matchedBy: null,
    targetType: null,
    studentId: null,
    groupId: null,
    targetName: null,
    student: null,
    group: null,
    identityKey: null,
    isIgnored: false,
  };
}

function mappingWithIdentity(mapping: any) {
  if (!mapping?.targetType) return { ...emptyClassroomMapping(), ...(mapping || {}) };
  if (mapping.targetType === 'ignore') {
    return { ...mapping, identityKey: null, isIgnored: true };
  }
  if (mapping.targetType === 'student' && mapping.studentId) {
    return { ...mapping, identityKey: `student:${mapping.studentId}`, isIgnored: false };
  }
  if (mapping.targetType === 'group' && mapping.groupId) {
    return { ...mapping, identityKey: `group:${mapping.groupId}`, isIgnored: false };
  }
  return { ...mapping, identityKey: null, isIgnored: false };
}

function verifiedStudentMapping(provider: ClassroomContestProvider, key: string, maps: any) {
  const student = provider === 'vjudge'
    ? maps.verifiedStudentByHandle.get(key)
    : maps.verifiedStudentByProviderHandle.get(providerHandleKey(provider, key));
  if (!student) return null;
  return mappingWithIdentity({
    matchedBy: provider === 'codeforces' ? 'verified_codeforces_id' : 'verified_vjudge_id',
    targetType: 'student',
    studentId: student.id,
    groupId: null,
    targetName: student.name,
    student,
    group: null,
  });
}

function overrideMapping(provider: ClassroomContestProvider, key: string, maps: any) {
  return maps.overrideByProviderHandle?.get(providerHandleKey(provider, key))
    || (provider === 'vjudge' ? maps.overrideByHandle?.get(key) : null)
    || null;
}

function groupNameMapping(key: string, maps: any, matchedBy = 'group_name') {
  const group = maps.groupByName.get(key);
  if (!group) return null;
  return mappingWithIdentity({
    matchedBy,
    targetType: 'group',
    studentId: null,
    groupId: group.id,
    targetName: group.name,
    student: null,
    group,
  });
}

function findGroupByCodeforcesMembers(sourceHandles: string[], maps: any) {
  const normalizedHandles = sourceHandles.map((handle) => normalizeHandle(handle, 120)).filter(Boolean);
  if (normalizedHandles.length === 0) return null;

  const matchedStudents = normalizedHandles
    .map((handle) => maps.verifiedStudentByProviderHandle.get(providerHandleKey('codeforces', handle)))
    .filter(Boolean);
  if (matchedStudents.length !== normalizedHandles.length) return null;

  const matchedIds = new Set(matchedStudents.map((student: any) => String(student.id)));
  const groups = Array.from(maps.groupById.values()).filter((group: any) => {
    const memberIds = new Set((group.members || []).map((member: any) => String(member.id)));
    return memberIds.size === matchedIds.size
      && Array.from(matchedIds).every((studentId) => memberIds.has(studentId));
  });

  if (groups.length !== 1) return null;
  const group: any = groups[0];
  return mappingWithIdentity({
    matchedBy: 'verified_codeforces_team_members',
    targetType: 'group',
    studentId: null,
    groupId: group.id,
    targetName: group.name,
    student: null,
    group,
  });
}

function resolveVjudgeMapping(user: any, maps: any) {
  const uniqueCandidates = getRankRowCandidateKeys(user);

  for (const key of uniqueCandidates) {
    const student = verifiedStudentMapping('vjudge', key, maps);
    if (student) return student;
  }

  for (const key of uniqueCandidates) {
    const override = overrideMapping('vjudge', key, maps);
    if (override) return mappingWithIdentity(override);
  }

  for (const key of uniqueCandidates) {
    const group = groupNameMapping(key, maps);
    if (group) return group;
  }

  return emptyClassroomMapping();
}

function resolveCodeforcesMapping(user: any, maps: any) {
  const uniqueCandidates = getRankRowCandidateKeys(user);
  const sourceHandles = Array.isArray(user?.sourceHandles) ? user.sourceHandles : [];
  const isTeam = Boolean(user?.providerMeta?.party?.teamId || user?.providerMeta?.party?.teamName || sourceHandles.length > 1);

  for (const key of uniqueCandidates) {
    const override = overrideMapping('codeforces', key, maps);
    if (override) return mappingWithIdentity(override);
  }

  if (isTeam) {
    for (const key of uniqueCandidates) {
      const group = groupNameMapping(key, maps);
      if (group) return group;
    }

    const memberGroup = findGroupByCodeforcesMembers(sourceHandles, maps);
    if (memberGroup) return memberGroup;
  }

  for (const key of uniqueCandidates) {
    const student = verifiedStudentMapping('codeforces', key, maps);
    if (student) return student;
  }

  return emptyClassroomMapping();
}

function resolveClassroomMapping(user: any, maps: any, providerValue: unknown = user?.provider) {
  const provider = normalizeContestProvider(providerValue);
  return provider === 'codeforces'
    ? resolveCodeforcesMapping(user, maps)
    : resolveVjudgeMapping(user, maps);
}

function unmatchedIdentityKey(provider: ClassroomContestProvider, username: unknown) {
  const handle = normalizeHandle(username, 160);
  if (!handle) return null;
  return provider === 'vjudge' ? `vjudge:${handle}` : null;
}

function applyRankDataClassroomMappings(rankData: any, maps: any, providerValue: unknown, filterUnmatched = false) {
  const provider = normalizeContestProvider(providerValue);
  const cloned = JSON.parse(JSON.stringify(rankData || {}));
  const teams = Array.isArray(cloned.teams) ? cloned.teams : [];
  let matchedRows = 0;
  const mappedTeams = teams.map((team: any) => {
    const sourceHandles = getRankRowSourceHandles(team);
    const existingMapping = team?.classroomMapping?.targetType ? mappingWithIdentity(team.classroomMapping) : null;
    const mapping = existingMapping || resolveClassroomMapping({ ...team, sourceHandles }, maps, provider);
    const isIgnored = Boolean(mapping.isIgnored || mapping.targetType === 'ignore');
    const isClassroomParticipant = Boolean(mapping.identityKey && !isIgnored);
    if (isClassroomParticipant) matchedRows += 1;

    const identityKey = isIgnored ? null : mapping.identityKey || unmatchedIdentityKey(provider, team?.username);
    return {
      ...team,
      provider,
      sourceHandles,
      identityKey,
      targetType: mapping.targetType,
      studentId: mapping.studentId,
      groupId: mapping.groupId,
      isClassroomParticipant,
      isIgnored,
      matchedBy: mapping.matchedBy,
      classroomMapping: {
        ...mapping,
        isClassroomParticipant,
        isIgnored,
      },
    };
  });

  cloned.teams = filterUnmatched
    ? mappedTeams.filter((team: any) => Boolean(team.isClassroomParticipant))
    : mappedTeams;
  if (filterUnmatched) {
    cloned.classroomMatchedTeams = cloned.teams.length;
    cloned.totalTeams = cloned.teams.length;
  }
  cloned.mappingSummary = {
    matchedRows,
    unmatchedRows: Math.max(0, teams.length - matchedRows),
    totalRows: teams.length,
  };
  return cloned;
}

function applyClassroomMappings(merged: any, maps: any) {
  let matchedRows = 0;
  const users = Array.isArray(merged?.users) ? merged.users : [];
  users.forEach((user: any) => {
    const provider = normalizeContestProvider(Array.isArray(user.providers) ? user.providers[0] : user.provider);
    const existingMapping = user?.classroomMapping?.targetType ? mappingWithIdentity(user.classroomMapping) : null;
    const mapping = existingMapping || resolveClassroomMapping(user, maps, provider);
    const isIgnored = Boolean(mapping.isIgnored || mapping.targetType === 'ignore');
    const isClassroomParticipant = Boolean(mapping.identityKey && !isIgnored);
    if (isClassroomParticipant) matchedRows += 1;

    user.identityKey = isIgnored ? null : user.identityKey || mapping.identityKey || unmatchedIdentityKey(provider, user?.username);
    user.targetType = mapping.targetType;
    user.studentId = mapping.studentId;
    user.groupId = mapping.groupId;
    user.isClassroomParticipant = isClassroomParticipant;
    user.isIgnored = isIgnored;
    user.matchedBy = mapping.matchedBy;
    user.classroomMapping = {
      ...mapping,
      isClassroomParticipant,
      isIgnored,
    };
  });

  merged.mappingSummary = {
    matchedRows,
    unmatchedRows: Math.max(0, users.length - matchedRows),
    totalRows: users.length,
  };

  return merged;
}

function applyDemeritsToRankData(rankData: any, contestDemerits: any[]) {
  const cloned = JSON.parse(JSON.stringify(rankData || {}));
  const demeritsByHandle = new Map<string, any[]>();
  contestDemerits.forEach((demerit: any) => {
    const handle = normalizeHandle(demerit.handle ?? demerit.vjudge_id, 160);
    if (!handle) return;
    const rows = demeritsByHandle.get(handle) || [];
    rows.push(demerit);
    demeritsByHandle.set(handle, rows);
  });

  if (!Array.isArray(cloned.teams)) cloned.teams = [];
  cloned.teams.forEach((team: any) => {
    const handles = getRankRowCandidateKeys(team);
    const userDemerits = Array.from(new Set(
      handles.flatMap((handle) => demeritsByHandle.get(handle) || []),
    ));
    const points = userDemerits.reduce((sum, item) => sum + Number(item.demerit_point || 0), 0);
    team.demeritPoints = Number(team.demeritPoints || 0) + points;
    team.demerits = userDemerits;
    if (points > 0) {
      team.originalFinalScore = Number(team.finalScore || 0);
      team.finalScore = Math.max(0, Number(team.finalScore || 0) - points);
      team.penalty = Number(team.penalty || 0) + points * 100;
    }
  });

  return cloned;
}

function computeStdDeviation(values: number[]): number {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function demeritsForRankRow(row: any, contestDemerits: any[]) {
  const candidateKeys = new Set(getRankRowCandidateKeys(row));
  return contestDemerits.filter((demerit: any) => {
    const handle = normalizeHandle(demerit.handle ?? demerit.vjudge_id, 160);
    return handle && candidateKeys.has(handle);
  });
}

function mergeUniqueStrings(current: any, next: unknown[]) {
  return uniqueStrings([
    ...(Array.isArray(current) ? current : []),
    ...next,
  ], 180);
}

function mergeProviders(current: any, provider: ClassroomContestProvider) {
  return mergeUniqueStrings(current, [provider]) as ClassroomContestProvider[];
}

function mergeResultsByUser(results: any[], contestIdToWeight: Record<string, number> = {}, allDemerits: Record<string, any[]> = {}) {
  if (!Array.isArray(results) || results.length === 0) {
    return {
      users: [],
      contestIds: [],
      contestIdToTitle: {},
      contestMetaById: {},
    };
  }

  const contests = results.map((result: any) => result?.contestInfo).filter(Boolean);
  const contestIdToTitle = Object.fromEntries(contests.map((contest: any) => [String(contest.id), contest.title]));
  const contestIds = contests.map((contest: any) => String(contest.id));
  const contestMetaById = Object.fromEntries(results.map((result: any) => {
    const contestId = String(result?.contestInfo?.id || '');
    return [contestId, {
      ...(result?.contestInfo || {}),
      provider: normalizeContestProvider(result?.provider ?? result?.contestInfo?.provider),
      externalContestId: result?.contestInfo?.externalContestId,
      fullParticipantCount: result?.fullParticipantCount ?? result?.providerMeta?.fullParticipantCount ?? result?.totalTeams,
      totalProblems: result?.totalProblems,
      problems: result?.problems,
    }];
  }).filter(([contestId]) => contestId));
  const userMap: Record<string, any> = {};

  for (const contest of results) {
    if (!contest?.contestInfo || !Array.isArray(contest?.teams)) continue;
    const contestId = String(contest.contestInfo.id);
    const provider = normalizeContestProvider(contest.provider ?? contest.contestInfo.provider);

    for (const team of contest.teams) {
      const username = normalizeText(team?.username, 160);
      if (!username) continue;
      const identityKey = team.identityKey || unmatchedIdentityKey(provider, username);
      if (!identityKey) continue;

      if (!userMap[identityKey]) {
        userMap[identityKey] = {
          identityKey,
          username: team.classroomMapping?.targetName || username,
          realName: team.classroomMapping?.targetName || team.realName || username,
          avatarUrl: team.avatarUrl,
          contests: {},
          totalSolved: 0,
          totalPenalty: 0,
          totalScore: 0,
          attended: 0,
          totalDemeritPoints: 0,
          demerits: {},
          originalTotalScore: 0,
          providers: [],
          sourceHandles: [],
          targetType: team.targetType || null,
          studentId: team.studentId || null,
          groupId: team.groupId || null,
          matchedBy: team.matchedBy || null,
          isClassroomParticipant: Boolean(team.isClassroomParticipant),
          classroomMapping: team.classroomMapping || null,
        };
      }

      const weight = contestIdToWeight[contestId] ?? 1;
      const finalScore = Number(team.finalScore || 0) * weight;
      const contestDemerits = allDemerits[contestId] || [];
      const userDemerits = demeritsForRankRow(team, contestDemerits);

      userMap[identityKey].providers = mergeProviders(userMap[identityKey].providers, provider);
      userMap[identityKey].sourceHandles = mergeUniqueStrings(userMap[identityKey].sourceHandles, getRankRowSourceHandles(team));
      userMap[identityKey].contests[contestId] = {
        solved: Number(team.solvedCount || 0),
        penalty: Number(team.penalty || 0),
        finalScore,
        submissions: team.submissions || [],
        contestId,
        contestTitle: contest.contestInfo.title,
        provider,
        externalContestId: contest.contestInfo.externalContestId || contest.providerMeta?.contest?.id || contestId,
        nativeRank: team.nativeRank,
        nativePoints: team.nativePoints,
        sourceHandles: getRankRowSourceHandles(team),
        fullParticipantCount: contest.fullParticipantCount ?? contest.providerMeta?.fullParticipantCount ?? contest.totalTeams,
        demeritPoints: Number(team.demeritPoints || 0),
        demerits: userDemerits,
      };

      userMap[identityKey].demerits[contestId] = userDemerits;
      userMap[identityKey].totalDemeritPoints += Number(team.demeritPoints || 0);
      userMap[identityKey].totalSolved += Number(team.solvedCount || 0);
      userMap[identityKey].totalPenalty += Number(team.penalty || 0);
      userMap[identityKey].totalScore += finalScore;
      userMap[identityKey].attended += 1;
    }
  }

  Object.values(userMap).forEach((user: any) => {
    contestIds.forEach((cid) => {
      if (user.contests[cid]) return;
      const contestDemerits = allDemerits[cid] || [];
      const userDemerits = demeritsForRankRow(user, contestDemerits);
      const userDemeritPoints = userDemerits.reduce((sum: number, demerit: any) => sum + Number(demerit.demerit_point || 0), 0);

      user.contests[cid] = {
        solved: 0,
        penalty: userDemeritPoints * 100,
        finalScore: Math.max(0, 0 - userDemeritPoints),
        submissions: [],
        contestId: cid,
        contestTitle: contestIdToTitle[cid] || 'Unknown Contest',
        provider: contestMetaById[cid]?.provider || 'vjudge',
        externalContestId: contestMetaById[cid]?.externalContestId || cid,
        demeritPoints: userDemeritPoints,
        demerits: userDemerits,
      };

      user.demerits[cid] = userDemerits;
      user.totalDemeritPoints += userDemeritPoints;
      user.totalPenalty += userDemeritPoints * 100;
      user.totalScore += Math.max(0, 0 - userDemeritPoints);
    });

    if (contestIds.length === 0) {
      user.stdDeviationPen = 0;
      user.stdDeviationScore = 0;
      user.effectiveSolved = user.totalScore;
      user.effectivePenalty = user.totalPenalty;
      return;
    }

    const scores = contestIds.map((cid) => Number(user.contests[cid]?.finalScore || 0));
    const penalties = contestIds.map((cid) => Number(user.contests[cid]?.penalty || 0));
    user.stdDeviationScore = computeStdDeviation(scores);
    user.stdDeviationPen = computeStdDeviation(penalties);
    user.effectiveSolved = user.totalScore - user.stdDeviationScore;
    user.effectivePenalty = user.totalPenalty + user.stdDeviationPen;
  });

  const sortedUsers = Object.values(userMap).sort((a: any, b: any) => {
    if (b.effectiveSolved !== a.effectiveSolved) return b.effectiveSolved - a.effectiveSolved;
    if (a.effectivePenalty !== b.effectivePenalty) return a.effectivePenalty - b.effectivePenalty;
    return b.attended - a.attended;
  });

  return { users: sortedUsers, contestIds, contestIdToTitle, contestMetaById };
}

function mergeResultsForTsc(
  results: any[],
  contestIdToWeight: Record<string, number> = {},
  allDemerits: Record<string, any[]> = {},
  tfcScoreByTeam = new Map<string, number>(),
  tfcPercentage = 0,
  tscPercentage = 100,
) {
  if (!Array.isArray(results) || results.length === 0) {
    return {
      users: [],
      contestIds: [],
      contestIdToTitle: {},
      contestMetaById: {},
      scoringMode: 'TSC_COMBINED',
      tscConfig: {
        tfcPercentage,
        tscPercentage,
        highestTfcScore: 0,
        highestTscScore: 0,
      },
    };
  }

  const contests = results.map((result: any) => result?.contestInfo).filter(Boolean);
  const contestIdToTitle = Object.fromEntries(contests.map((contest: any) => [String(contest.id), contest.title]));
  const contestIds = contests.map((contest: any) => String(contest.id));
  const contestMetaById = Object.fromEntries(results.map((result: any) => {
    const contestId = String(result?.contestInfo?.id || '');
    return [contestId, {
      ...(result?.contestInfo || {}),
      provider: normalizeContestProvider(result?.provider ?? result?.contestInfo?.provider),
      externalContestId: result?.contestInfo?.externalContestId,
      fullParticipantCount: result?.fullParticipantCount ?? result?.providerMeta?.fullParticipantCount ?? result?.totalTeams,
      totalProblems: result?.totalProblems,
      problems: result?.problems,
    }];
  }).filter(([contestId]) => contestId));
  const teamMap: Record<string, any> = {};

  for (const contest of results) {
    if (!contest?.contestInfo || !Array.isArray(contest?.teams)) continue;
    const contestId = String(contest.contestInfo.id);
    const provider = normalizeContestProvider(contest.provider ?? contest.contestInfo.provider);

    for (const team of contest.teams) {
      const teamName = normalizeText(team?.username, 160);
      if (!teamName) continue;
      const identityKey = team.identityKey || unmatchedIdentityKey(provider, teamName);
      if (!identityKey) continue;

      if (!teamMap[identityKey]) {
        teamMap[identityKey] = {
          identityKey,
          username: team.classroomMapping?.targetName || teamName,
          realName: team.classroomMapping?.targetName || team.realName || teamName,
          avatarUrl: team.avatarUrl || null,
          contests: {},
          totalSolved: 0,
          totalPenalty: 0,
          totalScore: 0,
          attended: 0,
          totalDemeritPoints: 0,
          demerits: {},
          providers: [],
          sourceHandles: [],
          targetType: team.targetType || null,
          studentId: team.studentId || null,
          groupId: team.groupId || null,
          matchedBy: team.matchedBy || null,
          isClassroomParticipant: Boolean(team.isClassroomParticipant),
          classroomMapping: team.classroomMapping || null,
        };
      }

      const weight = contestIdToWeight[contestId] ?? 1;
      const finalScore = Number(team.finalScore || 0) * weight;
      const contestDemerits = allDemerits[contestId] || [];
      const userDemerits = demeritsForRankRow(team, contestDemerits);

      teamMap[identityKey].providers = mergeProviders(teamMap[identityKey].providers, provider);
      teamMap[identityKey].sourceHandles = mergeUniqueStrings(teamMap[identityKey].sourceHandles, getRankRowSourceHandles(team));
      teamMap[identityKey].contests[contestId] = {
        solved: Number(team.solvedCount || 0),
        penalty: Number(team.penalty || 0),
        finalScore,
        submissions: team.submissions || [],
        contestId,
        contestTitle: contest.contestInfo.title,
        provider,
        externalContestId: contest.contestInfo.externalContestId || contest.providerMeta?.contest?.id || contestId,
        nativeRank: team.nativeRank,
        nativePoints: team.nativePoints,
        sourceHandles: getRankRowSourceHandles(team),
        fullParticipantCount: contest.fullParticipantCount ?? contest.providerMeta?.fullParticipantCount ?? contest.totalTeams,
        demeritPoints: Number(team.demeritPoints || 0),
        demerits: userDemerits,
      };

      teamMap[identityKey].demerits[contestId] = userDemerits;
      teamMap[identityKey].totalDemeritPoints += Number(team.demeritPoints || 0);
      teamMap[identityKey].totalSolved += Number(team.solvedCount || 0);
      teamMap[identityKey].totalPenalty += Number(team.penalty || 0);
      teamMap[identityKey].totalScore += finalScore;
      teamMap[identityKey].attended += 1;
    }
  }

  Object.values(teamMap).forEach((team: any) => {
    contestIds.forEach((cid) => {
      if (team.contests[cid]) return;
      team.contests[cid] = {
        solved: 0,
        penalty: 0,
        finalScore: 0,
        submissions: [],
        contestId: cid,
        contestTitle: contestIdToTitle[cid] || 'Unknown Contest',
        provider: contestMetaById[cid]?.provider || 'vjudge',
        externalContestId: contestMetaById[cid]?.externalContestId || cid,
        demeritPoints: 0,
        demerits: [],
      };
      team.demerits[cid] = [];
    });
  });

  const highestTscScore = Math.max(...Object.values(teamMap).map((team: any) => Number(team.totalScore) || 0), 0);
  const highestTfcScore = Math.max(...Array.from(tfcScoreByTeam.values()).map((value) => Number(value) || 0), 0);

  Object.values(teamMap).forEach((team: any) => {
    const tfcRawScore = Number(
      tfcScoreByTeam.get(String(team.identityKey || '').toLowerCase())
      || tfcScoreByTeam.get(String(team.username).toLowerCase())
      || 0,
    );
    const tscRawScore = Number(team.totalScore) || 0;
    const tfcComponent = tfcPercentage > 0 && highestTfcScore > 0
      ? (tfcRawScore / highestTfcScore) * tfcPercentage
      : 0;
    const tscComponent = tscPercentage > 0 && highestTscScore > 0
      ? (tscRawScore / highestTscScore) * tscPercentage
      : 0;
    const combinedScore = tfcComponent + tscComponent;

    team.tfcScore = tfcRawScore;
    team.tscScore = tscRawScore;
    team.tfcComponent = tfcComponent;
    team.tscComponent = tscComponent;
    team.totalScore = combinedScore;
    team.stdDeviationPen = 0;
    team.stdDeviationScore = 0;
    team.effectiveSolved = combinedScore;
    team.effectivePenalty = team.totalPenalty;
  });

  const sortedUsers = Object.values(teamMap).sort((a: any, b: any) => {
    if (b.effectiveSolved !== a.effectiveSolved) return b.effectiveSolved - a.effectiveSolved;
    if (a.effectivePenalty !== b.effectivePenalty) return a.effectivePenalty - b.effectivePenalty;
    if (b.attended !== a.attended) return b.attended - a.attended;
    return String(a.username).localeCompare(String(b.username));
  });

  return {
    users: sortedUsers,
    contestIds,
    contestIdToTitle,
    contestMetaById,
    scoringMode: 'TSC_COMBINED',
    tscConfig: {
      tfcPercentage,
      tscPercentage,
      highestTfcScore,
      highestTscScore,
    },
  };
}

function buildTfcScoreMap(referenceReport: any) {
  const scoreByTeam = new Map<string, number>();
  const users = Array.isArray(referenceReport?.data?.users) ? referenceReport.data.users : [];
  users.forEach((user: any) => {
    const score = Number(user?.effectiveTotalScore ?? user?.effectiveSolved ?? user?.totalScore ?? 0);
    const normalizedScore = Number.isFinite(score) ? score : 0;
    [
      user?.identityKey,
      user?.username,
      user?.realName,
      user?.classroomMapping?.targetName,
      user?.classroomMapping?.group?.name,
      ...(Array.isArray(user?.sourceHandles) ? user.sourceHandles : []),
    ].forEach((key) => {
      const normalized = normalizeText(key, 180).toLowerCase();
      if (normalized) scoreByTeam.set(normalized, normalizedScore);
    });
  });
  return scoreByTeam;
}

function overrideTargetMapping(override: any, rosterMaps: any) {
  const targetType = normalizeText(override?.target_type, 20).toLowerCase();
  if (targetType === 'student') {
    const student = rosterMaps.studentById.get(String(override.student_id)) || {
      id: override.student_id,
      name: override.student_name,
      fullName: override.student_name,
      email: override.student_email,
      mistId: override.student_mist_id,
    };
    return mappingWithIdentity({
      matchedBy: 'manual_solve_override',
      targetType: 'student',
      studentId: override.student_id,
      groupId: null,
      targetName: student.name || student.fullName || 'Student',
      student,
      group: null,
    });
  }

  if (targetType === 'group') {
    const group = rosterMaps.groupById.get(String(override.group_id)) || {
      id: override.group_id,
      name: override.group_name,
      members: [],
    };
    return mappingWithIdentity({
      matchedBy: 'manual_solve_override',
      targetType: 'group',
      studentId: null,
      groupId: override.group_id,
      targetName: group.name || 'Group',
      student: null,
      group,
    });
  }

  return null;
}

function defaultContestPerformance(contestId: string, merged: any) {
  return {
    solved: 0,
    penalty: 0,
    finalScore: 0,
    submissions: [],
    contestId,
    contestTitle: merged?.contestIdToTitle?.[contestId] || 'Unknown Contest',
    provider: merged?.contestMetaById?.[contestId]?.provider || normalizeContestProvider(contestId.split(':')[0]),
    externalContestId: merged?.contestMetaById?.[contestId]?.externalContestId || contestId,
    demeritPoints: 0,
    demerits: [],
  };
}

function recalculateSolveTotals(merged: any) {
  const contestIds = Array.isArray(merged?.contestIds) ? merged.contestIds : [];
  const users = Array.isArray(merged?.users) ? merged.users : [];

  users.forEach((user: any) => {
    const performances = contestIds.map((contestId: string) => user.contests?.[contestId]).filter(Boolean);
    user.totalSolved = performances.reduce((sum: number, performance: any) => sum + Number(performance?.solved || 0), 0);
    user.totalContestsAttended = performances.filter((performance: any) => (
      Number(performance?.solved || 0) > 0
      || Boolean(performance?.manualSolveOverride)
      || (Array.isArray(performance?.submissions) && performance.submissions.length > 0)
    )).length;
    user.attended = user.totalContestsAttended;
    user.solveOnlyTotalSolved = user.totalSolved;
  });
}

function sortMergedUsersBySolveSerial(merged: any) {
  const contestIds = Array.isArray(merged?.contestIds) ? merged.contestIds : [];
  if (!Array.isArray(merged?.users)) return;

  merged.users.sort((a: any, b: any) => {
    for (const contestId of contestIds) {
      const contestDelta = Number(b.contests?.[contestId]?.solved || 0) - Number(a.contests?.[contestId]?.solved || 0);
      if (contestDelta !== 0) return contestDelta;
    }

    const aSolved = Number(a.solveOnlyTotalSolved ?? a.totalSolved ?? 0);
    const bSolved = Number(b.solveOnlyTotalSolved ?? b.totalSolved ?? 0);
    if (aSolved !== bSolved) return bSolved - aSolved;

    const aAttended = Number(a.totalContestsAttended ?? a.attended ?? 0);
    const bAttended = Number(b.totalContestsAttended ?? b.attended ?? 0);
    if (aAttended !== bAttended) return bAttended - aAttended;

    return String(a.username || '').localeCompare(String(b.username || ''));
  });
}

function applySolveOverridesToMergedReport(merged: any, solveOverrides: any[], rosterMaps: any) {
  if (!merged || !Array.isArray(solveOverrides) || solveOverrides.length === 0) {
    recalculateSolveTotals(merged);
    sortMergedUsersBySolveSerial(merged);
    return merged;
  }

  if (!Array.isArray(merged.users)) merged.users = [];
  if (!Array.isArray(merged.contestIds)) merged.contestIds = [];
  if (!merged.contestIdToTitle) merged.contestIdToTitle = {};
  if (!merged.contestMetaById) merged.contestMetaById = {};

  const usersByIdentity = new Map<string, any>();
  merged.users.forEach((user: any) => {
    const identityKey = String(user?.identityKey || '');
    if (identityKey) usersByIdentity.set(identityKey, user);
  });

  let appliedCount = 0;
  solveOverrides.forEach((override: any) => {
    const solveCount = normalizeSolveCount(override.solve_count);
    if (solveCount === null) return;

    const provider = normalizeContestProvider(override.provider);
    const externalContestId = String(override.external_contest_id || '');
    if (!externalContestId) return;
    const contestKey = buildContestKey(provider, externalContestId);
    if (!merged.contestIds.includes(contestKey)) return;

    const mapping = overrideTargetMapping(override, rosterMaps);
    const identityKey = mapping?.identityKey;
    if (!identityKey) return;

    let user = usersByIdentity.get(identityKey);
    if (!user) {
      user = {
        identityKey,
        username: mapping.targetName || identityKey,
        realName: mapping.targetName || identityKey,
        avatarUrl: null,
        contests: {},
        totalSolved: 0,
        totalPenalty: 0,
        totalScore: 0,
        attended: 0,
        totalDemeritPoints: 0,
        demerits: {},
        originalTotalScore: 0,
        providers: [],
        sourceHandles: [],
        targetType: mapping.targetType,
        studentId: mapping.studentId,
        groupId: mapping.groupId,
        matchedBy: mapping.matchedBy,
        isClassroomParticipant: true,
        classroomMapping: {
          ...mapping,
          isClassroomParticipant: true,
          isIgnored: false,
        },
      };
      merged.contestIds.forEach((contestId: string) => {
        user.contests[contestId] = defaultContestPerformance(contestId, merged);
        user.demerits[contestId] = [];
      });
      merged.users.push(user);
      usersByIdentity.set(identityKey, user);
    }

    user.providers = mergeProviders(user.providers, provider);
    user.targetType = mapping.targetType;
    user.studentId = mapping.studentId;
    user.groupId = mapping.groupId;
    user.matchedBy = user.matchedBy || mapping.matchedBy;
    user.isClassroomParticipant = true;
    user.classroomMapping = {
      ...mapping,
      isClassroomParticipant: true,
      isIgnored: false,
    };

    const performance = user.contests[contestKey] || defaultContestPerformance(contestKey, merged);
    user.contests[contestKey] = {
      ...performance,
      solved: solveCount,
      manualSolveOverride: {
        id: override.id,
        solveCount,
        note: override.note,
        targetType: mapping.targetType,
      },
    };
    appliedCount += 1;
  });

  recalculateSolveTotals(merged);
  sortMergedUsersBySolveSerial(merged);
  merged.manualSolveOverrideCount = appliedCount;
  merged.mappingSummary = {
    ...(merged.mappingSummary || {}),
    matchedRows: merged.users.filter((user: any) => Boolean(user.isClassroomParticipant || user.classroomMapping?.isClassroomParticipant)).length,
    totalRows: merged.users.length,
  };
  merged.mappingSummary.unmatchedRows = Math.max(0, merged.mappingSummary.totalRows - merged.mappingSummary.matchedRows);

  return merged;
}

async function loadLatestSnapshotsForRoom(classroomId: string, roomId: string) {
  return sql`
    WITH latest AS (
      SELECT DISTINCT ON (snapshot.contest_id)
        snapshot.id AS snapshot_id,
        snapshot.rank_data,
        snapshot.fetched_at,
        contest.id AS contest_item_id,
        contest.provider,
        contest.external_contest_id,
        contest.title,
        contest.weight,
        contest.formula_key,
        contest.merge_group_id,
        contest.sort_order,
        contest.created_at AS contest_created_at
      FROM public.classroom_contest_snapshots snapshot
      JOIN public.classroom_contests contest ON contest.id = snapshot.contest_id
      WHERE snapshot.classroom_id = ${classroomId}
        AND snapshot.room_id = ${roomId}
      ORDER BY snapshot.contest_id, snapshot.fetched_at DESC
    )
    SELECT *
    FROM latest
    ORDER BY sort_order ASC NULLS LAST, contest_created_at ASC
  `;
}

async function loadRoomDemerits(classroomId: string, roomId: string) {
  const rows = await sql`
    SELECT d.*,
           contest.provider,
           contest.external_contest_id,
           contest.title AS contest_title
    FROM public.classroom_contest_demerits d
    JOIN public.classroom_contests contest ON contest.id = d.contest_id
    WHERE d.classroom_id = ${classroomId}
      AND d.room_id = ${roomId}
    ORDER BY d.created_at ASC
  `;

  return rows.map((row: any) => ({
    id: row.id,
    contest_id: String(row.external_contest_id),
    provider: normalizeContestProvider(row.provider),
    contest_item_id: row.contest_id,
    handle: row.vjudge_handle,
    vjudge_id: row.vjudge_handle,
    demerit_point: Number(row.points || 0),
    reason: row.reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

async function loadRoomSolveOverrides(classroomId: string, roomId: string, contestItemId: string | null = null) {
  const rows = contestItemId
    ? await sql`
        SELECT override.*,
               contest.provider,
               contest.external_contest_id,
               contest.title AS contest_title,
               student.full_name AS student_name,
               student.email AS student_email,
               student.mist_id AS student_mist_id,
               team.name AS group_name
        FROM public.classroom_contest_solve_overrides override
        JOIN public.classroom_contests contest ON contest.id = override.contest_id
        LEFT JOIN public.users student ON student.id = override.student_id
        LEFT JOIN public.trainer_teams team ON team.id = override.group_id
        WHERE override.classroom_id = ${classroomId}
          AND override.room_id = ${roomId}
          AND override.contest_id = ${contestItemId}
        ORDER BY override.updated_at DESC, override.created_at DESC
      `
    : await sql`
        SELECT override.*,
               contest.provider,
               contest.external_contest_id,
               contest.title AS contest_title,
               student.full_name AS student_name,
               student.email AS student_email,
               student.mist_id AS student_mist_id,
               team.name AS group_name
        FROM public.classroom_contest_solve_overrides override
        JOIN public.classroom_contests contest ON contest.id = override.contest_id
        LEFT JOIN public.users student ON student.id = override.student_id
        LEFT JOIN public.trainer_teams team ON team.id = override.group_id
        WHERE override.classroom_id = ${classroomId}
          AND override.room_id = ${roomId}
        ORDER BY contest.sort_order ASC NULLS LAST, contest.created_at ASC, override.updated_at DESC
      `;

  return rows;
}

function classroomItemsToScoringSources(items: any[], merged: any = null): ContestSourceInput[] {
  return items.map((item: any) => {
    const provider = normalizeContestProvider(item.provider);
    const externalContestId = String(item.external_contest_id || '');
    const contestKey = buildContestKey(provider, externalContestId);
    const rankData = merged
      ? {
        contestInfo: {
          id: contestKey,
          provider,
          externalContestId,
          title: item.title || merged?.contestIdToTitle?.[contestKey] || `Contest ${externalContestId}`,
        },
        teams: (Array.isArray(merged.users) ? merged.users : []).map((user: any) => {
          const performance = user.contests?.[contestKey] || defaultContestPerformance(contestKey, merged);
          return {
            identityKey: user.identityKey,
            username: user.username,
            realName: user.realName || user.username,
            avatarUrl: user.avatarUrl,
            sourceHandles: Array.isArray(performance.sourceHandles) && performance.sourceHandles.length > 0
              ? performance.sourceHandles
              : user.sourceHandles,
            targetType: user.targetType || null,
            studentId: user.studentId || null,
            groupId: user.groupId || null,
            matchedBy: user.matchedBy || null,
            isClassroomParticipant: Boolean(user.isClassroomParticipant || user.classroomMapping?.isClassroomParticipant),
            classroomMapping: user.classroomMapping || null,
            solvedCount: Number(performance.solved || 0),
            penalty: Number(performance.penalty || 0),
            finalScore: Number(performance.finalScore ?? performance.rawScore ?? 0),
            submissions: Array.isArray(performance.submissions) ? performance.submissions : [],
            demeritPoints: Number(performance.demeritPoints || 0),
            demerits: Array.isArray(performance.demerits) ? performance.demerits : [],
            manualSolveOverride: performance.manualSolveOverride || null,
            nativeRank: performance.nativeRank,
            nativePoints: performance.nativePoints,
          };
        }),
      }
      : {
        contestInfo: {
          id: contestKey,
          provider,
          externalContestId,
          title: item.title || `Contest ${externalContestId}`,
        },
        teams: [],
      };

    return {
      itemId: String(item.id),
      contestKey,
      formulaKey: item.formula_key || formulaKeyForContest(provider, externalContestId),
      title: item.title || `Contest ${externalContestId}`,
      provider,
      externalContestId,
      weight: merged ? 1 : Number(item.weight || 1),
      sortOrder: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : null,
      rankData,
      demerits: [],
    };
  });
}

async function loadClassroomScoringGroups(classroomId: string, roomId: string) {
  const rows = await sql`
    SELECT merge_group.*,
           COALESCE(
             jsonb_agg(contest.id ORDER BY contest.sort_order ASC NULLS LAST, contest.created_at ASC, contest.id ASC)
               FILTER (WHERE contest.id IS NOT NULL),
             '[]'::jsonb
           ) AS contest_item_ids
    FROM public.classroom_contest_merge_groups merge_group
    LEFT JOIN public.classroom_contests contest
      ON contest.merge_group_id = merge_group.id
     AND contest.classroom_id = merge_group.classroom_id
     AND contest.room_id = merge_group.room_id
    WHERE merge_group.classroom_id = ${classroomId}
      AND merge_group.room_id = ${roomId}
    GROUP BY merge_group.id
    ORDER BY MIN(contest.sort_order) ASC NULLS LAST, merge_group.created_at ASC, merge_group.id ASC
  `;

  return rows.map((row: any) => ({
    id: String(row.id),
    name: row.name,
    formulaKey: row.formula_key,
    formula: row.formula || row.solved_score_formula || DEFAULT_COMPOSITE_FORMULA,
    solvedScoreFormula: row.formula || row.solved_score_formula || DEFAULT_COMPOSITE_FORMULA,
    penaltyScoreFormula: row.penalty_score_formula || DEFAULT_COMPOSITE_PENALTY_FORMULA,
    contestItemIds: parseJsonArray(row.contest_item_ids).map(String),
  }));
}

async function loadClassroomRoomItemsForScoring(classroomId: string, roomId: string) {
  return sql`
    SELECT id, provider, external_contest_id, title, weight, formula_key, merge_group_id, sort_order, created_at
    FROM public.classroom_contests
    WHERE classroom_id = ${classroomId}
      AND room_id = ${roomId}
    ORDER BY sort_order ASC NULLS LAST, created_at ASC, id ASC
  `;
}

function rowToScoringConfig(row: any, groups: any[], fallback: ContestScoringConfigInput): Required<ContestScoringConfigInput> {
  if (!row) {
    return normalizeScoringConfig({ ...fallback, groups, version: 0 }, fallback);
  }

  return normalizeScoringConfig({
    groups,
    formula: row.formula || row.solved_score_formula,
    solvedScoreFormula: row.formula || row.solved_score_formula,
    penaltyScoreFormula: row.penalty_score_formula,
    scorePrecision: Number(row.score_precision),
    sortRules: parseJsonArray(row.sort_rules),
    excludedUnitKeys: parseJsonArray(row.excluded_unit_keys),
    dropWorstCount: Number(row.drop_worst_count || 0),
    version: Number(row.version || 0),
  }, fallback);
}

async function loadClassroomScoringConfig(classroomId: string, roomId: string, roomType: string, items: any[]) {
  const [groups, configRows] = await Promise.all([
    loadClassroomScoringGroups(classroomId, roomId),
    sql`
      SELECT *
      FROM public.classroom_contest_scoring_configs
      WHERE classroom_id = ${classroomId}
        AND room_id = ${roomId}
      LIMIT 1
    `,
  ]);
  const unitKeys = items.map((item: any) => item.formula_key || formulaKeyForContest(normalizeContestProvider(item.provider), String(item.external_contest_id || '')));
  const fallback = defaultScoringConfigForScope('classroom', roomType, unitKeys);
  const config = rowToScoringConfig(configRows[0] || null, groups, fallback);
  return { config, groups, version: Number(configRows[0]?.version || 0), exists: configRows.length > 0 };
}

function normalizeScoringGroupPayload(group: any) {
  const name = normalizeText(group?.name, 160);
  const formulaKey = normalizeFormulaKey(group?.formulaKey ?? group?.formula_key);
  const solvedScoreFormula = normalizeText(group?.solvedScoreFormula ?? group?.solved_score_formula ?? group?.formula, 1000) || DEFAULT_COMPOSITE_FORMULA;
  const penaltyScoreFormula = normalizeText(group?.penaltyScoreFormula ?? group?.penalty_score_formula, 1000) || DEFAULT_COMPOSITE_PENALTY_FORMULA;
  const contestItemIds = parseJsonArray(group?.contestItemIds ?? group?.contest_item_ids)
    .map((item) => normalizeUuid(item))
    .filter(Boolean) as string[];

  if (!name) throw new Error('Composite name is required');
  if (!formulaKey) throw new Error('Composite key must match ^[a-z][a-z0-9_]{0,47}$');
  parseFormula(solvedScoreFormula);
  parseFormula(penaltyScoreFormula);
  if (contestItemIds.length < 2) throw new Error(`Composite "${name}" must include at least two contests`);

  return {
    name,
    formulaKey,
    formula: solvedScoreFormula,
    solvedScoreFormula,
    penaltyScoreFormula,
    contestItemIds: Array.from(new Set(contestItemIds)),
  };
}

function normalizeScoringPayload(body: any, fallback: ContestScoringConfigInput): ContestScoringConfigInput {
  const source = body?.config && typeof body.config === 'object' ? body.config : body || {};
  const groups = parseJsonArray(source.groups).map(normalizeScoringGroupPayload);
  const solvedScoreFormula = normalizeText(source.solvedScoreFormula ?? source.solved_score_formula ?? source.formula ?? fallback.solvedScoreFormula ?? fallback.formula, 1000);
  const penaltyScoreFormula = normalizeText(source.penaltyScoreFormula ?? source.penalty_score_formula ?? fallback.penaltyScoreFormula, 1000);
  parseFormula(solvedScoreFormula);
  parseFormula(penaltyScoreFormula);

  return {
    groups,
    formula: solvedScoreFormula,
    solvedScoreFormula,
    penaltyScoreFormula,
    scorePrecision: normalizeScorePrecision(source.scorePrecision ?? source.score_precision, fallback.scorePrecision),
    sortRules: parseJsonArray(source.sortRules ?? source.sort_rules).slice(0, 8).map((rule) => ({
      key: normalizeText(rule?.key, 80),
      direction: rule?.direction === 'asc' ? 'asc' : 'desc',
    })).filter((rule) => rule.key),
    excludedUnitKeys: parseJsonArray(source.excludedUnitKeys ?? source.excluded_unit_keys)
      .map((key) => normalizeFormulaKey(key))
      .filter(Boolean) as string[],
    dropWorstCount: normalizeDropWorstCount(source.dropWorstCount ?? source.drop_worst_count, fallback.dropWorstCount),
  };
}

async function buildClassroomScoredReportSnapshot(
  classroomId: string,
  roomId: string,
  configOverride: ContestScoringConfigInput | null = null,
) {
  const room = await loadRoom(classroomId, roomId);
  if (!room) throw Object.assign(new Error('Contest room not found'), { statusCode: 404 });

  const [items, latestSnapshots, demerits, rosterMaps, solveOverrides] = await Promise.all([
    loadClassroomRoomItemsForScoring(classroomId, roomId),
    loadLatestSnapshotsForRoom(classroomId, roomId),
    loadRoomDemerits(classroomId, roomId),
    getClassroomRosterMaps(classroomId),
    loadRoomSolveOverrides(classroomId, roomId),
  ]);
  const overrideMaps = await getClassroomHandleOverrideMaps(classroomId, rosterMaps);
  const maps = { ...rosterMaps, ...overrideMaps };

  const snapshotByContestItem = new Map<string, any>();
  latestSnapshots.forEach((snapshot: any) => snapshotByContestItem.set(String(snapshot.contest_item_id), snapshot));

  const contestIdToWeight: Record<string, number> = {};
  const allDemerits: Record<string, any[]> = {};
  const results: any[] = [];
  const missingContests: any[] = [];

  items.forEach((item: any) => {
    const snapshot = snapshotByContestItem.get(String(item.id));
    if (!snapshot) {
      missingContests.push({
        id: item.id,
        provider: normalizeContestProvider(item.provider),
        externalContestId: item.external_contest_id,
        title: item.title,
      });
      return;
    }

    const provider = normalizeContestProvider(item.provider);
    const externalContestId = String(item.external_contest_id);
    const contestKey = buildContestKey(provider, externalContestId);
    const contestDemerits = demerits.filter((demerit: any) => String(demerit.contest_item_id) === String(item.id));
    allDemerits[contestKey] = contestDemerits;
    contestIdToWeight[contestKey] = Number(item.weight || 1);

    const rankData = applyDemeritsToRankData(
      applyRankDataClassroomMappings({
        ...(snapshot.rank_data || {}),
        provider,
        fullParticipantCount: snapshot.rank_data?.fullParticipantCount ?? snapshot.rank_data?.providerMeta?.fullParticipantCount,
        contestInfo: {
          ...(snapshot.rank_data?.contestInfo || {}),
          id: contestKey,
          provider,
          externalContestId,
          title: item.title || snapshot.rank_data?.contestInfo?.title || `Contest ${externalContestId}`,
        },
      }, maps, provider, false),
      contestDemerits,
    );
    results.push(rankData);
  });

  if (results.length === 0) {
    throw Object.assign(new Error('Fetch at least one contest before generating a report'), {
      statusCode: 400,
      missingContests,
    });
  }

  const roomType = normalizeContestType(room.contest_type);
  let legacyTsc: {
    tfcScoreByParticipant?: Map<string, number>;
    tfcPercentage?: number;
    tscPercentage?: number;
  } | null = null;
  let merged: any;
  if (roomType === 'TSC') {
    const referenceReportRows = room.tfc_reference_room_id
      ? await sql`
          SELECT data
          FROM public.classroom_contest_reports
          WHERE classroom_id = ${classroomId}
            AND room_id = ${room.tfc_reference_room_id}
          LIMIT 1
        `
      : [];
    const tfcScoreByTeam = buildTfcScoreMap(referenceReportRows[0] || null);
    const tfcPercentage = clampPercentage(room.tfc_percentage, 0);
    const tscPercentage = clampPercentage(room.tsc_percentage, 100 - tfcPercentage);

    legacyTsc = {
      tfcScoreByParticipant: tfcScoreByTeam,
      tfcPercentage,
      tscPercentage,
    };
    merged = mergeResultsByUser(results, contestIdToWeight, allDemerits);
    merged.tscConfig = {
      tfcRoomId: room.tfc_reference_room_id,
      tfcPercentage,
      tscPercentage,
    };
  } else {
    merged = mergeResultsByUser(results, contestIdToWeight, allDemerits);
  }

  merged.name = room.name;
  merged.roomType = roomType;
  merged.classroomId = classroomId;
  merged.classroomContestRoomId = roomId;
  merged.generatedAt = new Date().toISOString();
  merged.missingContests = missingContests;
  merged.snapshotIds = latestSnapshots.map((snapshot: any) => snapshot.snapshot_id);
  merged.rankingMode = 'solve_count';
  applyClassroomMappings(merged, maps);
  applySolveOverridesToMergedReport(merged, solveOverrides, rosterMaps);

  const scoringSources = classroomItemsToScoringSources(items, merged);
  const savedScoring = await loadClassroomScoringConfig(classroomId, roomId, roomType, items);
  const config = configOverride
    ? normalizeScoringConfig(configOverride, savedScoring.config)
    : savedScoring.config;
  const scored = buildScoredContestReport({
    classroomId,
    roomId,
    roomName: room.name,
    roomType,
    scope: 'classroom',
    sources: scoringSources,
    config,
    defaultConfig: defaultScoringConfigForScope(
      'classroom',
      roomType,
      scoringSources.map((source) => String(source.formulaKey || '')),
    ),
    legacyTsc,
    missingContests,
    snapshotIds: latestSnapshots.map((snapshot: any) => String(snapshot.snapshot_id)),
    generatedAt: merged.generatedAt,
  });

  return {
    room,
    items,
    config,
    configVersion: savedScoring.version,
    merged,
    scored: {
      ...scored,
      mappingSummary: merged.mappingSummary,
      manualSolveOverrideCount: merged.manualSolveOverrideCount || 0,
      tscConfig: merged.tscConfig || null,
    },
    missingContests,
  };
}

export const generateClassroomContestReport = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const snapshot = await buildClassroomScoredReportSnapshot(classroomId, roomId);

    const reportRows = await sql`
      INSERT INTO public.classroom_contest_reports (
        classroom_id,
        room_id,
        data,
        visible_to_students,
        generated_by,
        scoring_config_version,
        is_stale
      )
      VALUES (
        ${classroomId},
        ${roomId},
        ${sql.json(snapshot.scored)},
        false,
        ${actor.userId},
        ${snapshot.configVersion},
        false
      )
      ON CONFLICT (room_id)
      DO UPDATE SET
        data = EXCLUDED.data,
        generated_by = EXCLUDED.generated_by,
        scoring_config_version = EXCLUDED.scoring_config_version,
        is_stale = false,
        updated_at = now()
      RETURNING *
    `;

    return c.json({ success: true, report: reportToApi(reportRows[0]), merged: snapshot.scored });
  } catch (error: any) {
    console.error('Error generating classroom contest report:', error);
    return c.json({
      error: error?.message || 'Failed to generate classroom contest report',
      missingContests: error?.missingContests,
    }, error?.statusCode || 500);
  }
};

export const getClassroomContestScoring = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const room = await loadRoom(classroomId, roomId);
    if (!room) return c.json({ error: 'Contest room not found' }, 404);

    const items = await loadClassroomRoomItemsForScoring(classroomId, roomId);
    const scoring = await loadClassroomScoringConfig(classroomId, roomId, normalizeContestType(room.contest_type), items);
    const previewSources = classroomItemsToScoringSources(items);
    const scaffold = previewSources.length > 0
      ? buildScoredContestReport({
        classroomId,
        roomId,
        roomName: room.name,
        roomType: normalizeContestType(room.contest_type),
        scope: 'classroom',
        sources: previewSources,
        config: scoring.config,
        defaultConfig: defaultScoringConfigForScope(
          'classroom',
          normalizeContestType(room.contest_type),
          previewSources.map((source) => String(source.formulaKey || '')),
        ),
      })
      : null;

    return c.json({
      success: true,
      config: scoring.config,
      expectedVersion: scoring.version,
      variables: scaffold?.scoring?.variables || BASE_SCORING_VARIABLES,
      sortKeys: scaffold?.scoring?.sortKeys || SORTABLE_SCORING_KEYS,
      metrics: scaffold?.scoring?.metrics || [],
      filterFields: scaffold?.scoring?.filterFields || [],
      functions: scaffold?.scoring?.functions || [],
      resultUnits: scaffold?.scoring?.resultUnits || [],
    });
  } catch (error: any) {
    console.error('Error reading classroom contest scoring config:', error);
    return c.json({ error: error?.message || 'Failed to read scoring config' }, 500);
  }
};

export const previewClassroomContestScoring = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const room = await loadRoom(classroomId, roomId);
    if (!room) return c.json({ error: 'Contest room not found' }, 404);
    const items = await loadClassroomRoomItemsForScoring(classroomId, roomId);
    if (items.length === 0) return c.json({ error: 'Add at least one contest before previewing scoring' }, 400);

    const saved = await loadClassroomScoringConfig(classroomId, roomId, normalizeContestType(room.contest_type), items);
    const body = await readJsonBody(c);
    const requestedConfig = normalizeScoringPayload(body?.config ? body : { config: body }, saved.config);
    const snapshot = await buildClassroomScoredReportSnapshot(classroomId, roomId, {
      ...requestedConfig,
      version: saved.version,
    });

    return c.json({
      success: true,
      preview: snapshot.scored,
      before: snapshot.merged,
      config: snapshot.config,
      expectedVersion: saved.version,
    });
  } catch (error: any) {
    console.error('Error previewing classroom contest scoring:', error);
    return c.json({
      error: error?.message || 'Failed to preview scoring config',
      missingContests: error?.missingContests,
    }, error?.statusCode || 400);
  }
};

export const updateClassroomContestScoring = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const room = await loadRoom(classroomId, roomId);
    if (!room) return c.json({ error: 'Contest room not found' }, 404);

    const items = await loadClassroomRoomItemsForScoring(classroomId, roomId);
    if (items.length === 0) return c.json({ error: 'Add at least one contest before configuring scoring' }, 400);

    const saved = await loadClassroomScoringConfig(classroomId, roomId, normalizeContestType(room.contest_type), items);
    const body = await readJsonBody(c);
    const expectedVersion = Number(body?.expectedVersion ?? body?.expected_version ?? saved.version);
    const requestedConfig = normalizeScoringPayload(body?.config ? body : { config: body }, saved.config);

    buildScoredContestReport({
      classroomId,
      roomId,
      roomName: room.name,
      roomType: normalizeContestType(room.contest_type),
      scope: 'classroom',
      sources: classroomItemsToScoringSources(items),
      config: requestedConfig,
      defaultConfig: saved.config,
    });

    const result = await sql.begin(async (tx) => {
      const lockedRows = await tx`
        SELECT version
        FROM public.classroom_contest_scoring_configs
        WHERE classroom_id = ${classroomId}
          AND room_id = ${roomId}
        FOR UPDATE
      `;
      const currentVersion = Number(lockedRows[0]?.version || 0);
      if (expectedVersion !== currentVersion) {
        return { conflict: true, currentVersion };
      }

      const nextVersion = currentVersion + 1;
      await tx`
        UPDATE public.classroom_contests
        SET merge_group_id = null,
            updated_by = ${actor.userId},
            updated_at = now()
        WHERE classroom_id = ${classroomId}
          AND room_id = ${roomId}
      `;
      await tx`
        DELETE FROM public.classroom_contest_merge_groups
        WHERE classroom_id = ${classroomId}
          AND room_id = ${roomId}
      `;

      for (const group of requestedConfig.groups || []) {
        const inserted = await tx`
          INSERT INTO public.classroom_contest_merge_groups (
            classroom_id,
            room_id,
            name,
            formula_key,
            formula,
            solved_score_formula,
            penalty_score_formula,
            created_by,
            updated_by
          )
          VALUES (
            ${classroomId},
            ${roomId},
            ${group.name},
            ${group.formulaKey},
            ${group.solvedScoreFormula || group.formula || DEFAULT_COMPOSITE_FORMULA},
            ${group.solvedScoreFormula || group.formula || DEFAULT_COMPOSITE_FORMULA},
            ${group.penaltyScoreFormula || DEFAULT_COMPOSITE_PENALTY_FORMULA},
            ${actor.userId},
            ${actor.userId}
          )
          RETURNING id
        `;
        await tx`
          UPDATE public.classroom_contests
          SET merge_group_id = ${inserted[0].id},
              updated_by = ${actor.userId},
              updated_at = now()
          WHERE classroom_id = ${classroomId}
            AND room_id = ${roomId}
            AND id = ANY(${group.contestItemIds})
        `;
      }

      await tx`
        INSERT INTO public.classroom_contest_scoring_configs (
          classroom_id,
          room_id,
          formula,
          solved_score_formula,
          penalty_score_formula,
          score_precision,
          sort_rules,
          excluded_unit_keys,
          drop_worst_count,
          version,
          created_by,
          updated_by
        )
        VALUES (
          ${classroomId},
          ${roomId},
          ${requestedConfig.formula},
          ${requestedConfig.solvedScoreFormula},
          ${requestedConfig.penaltyScoreFormula},
          ${requestedConfig.scorePrecision},
          ${tx.json(requestedConfig.sortRules || [])},
          ${tx.json(requestedConfig.excludedUnitKeys || [])},
          ${requestedConfig.dropWorstCount || 0},
          ${nextVersion},
          ${actor.userId},
          ${actor.userId}
        )
        ON CONFLICT (room_id)
        DO UPDATE SET
          formula = EXCLUDED.formula,
          solved_score_formula = EXCLUDED.solved_score_formula,
          penalty_score_formula = EXCLUDED.penalty_score_formula,
          score_precision = EXCLUDED.score_precision,
          sort_rules = EXCLUDED.sort_rules,
          excluded_unit_keys = EXCLUDED.excluded_unit_keys,
          drop_worst_count = EXCLUDED.drop_worst_count,
          version = EXCLUDED.version,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
      `;
      await tx`
        UPDATE public.classroom_contest_reports
        SET is_stale = true,
            updated_at = now()
        WHERE classroom_id = ${classroomId}
          AND room_id = ${roomId}
      `;

      return { conflict: false, version: nextVersion };
    });

    if (result.conflict) {
      return c.json({
        error: 'Scoring config changed while you were editing',
        expectedVersion,
        currentVersion: result.currentVersion,
      }, 409);
    }

    const refreshedItems = await loadClassroomRoomItemsForScoring(classroomId, roomId);
    const refreshed = await loadClassroomScoringConfig(classroomId, roomId, normalizeContestType(room.contest_type), refreshedItems);
    return c.json({
      success: true,
      config: refreshed.config,
      expectedVersion: refreshed.version,
    });
  } catch (error: any) {
    console.error('Error saving classroom contest scoring config:', error);
    return c.json({ error: error?.message || 'Failed to save scoring config' }, 400);
  }
};

export const getClassroomContestReport = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const userId = getUserId(c);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    if (!(await canAccessContestClassroom(userId, classroomId))) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const reportRows = await sql`
      SELECT report.*
      FROM public.classroom_contest_reports report
      JOIN public.classroom_contest_rooms room ON room.id = report.room_id
      WHERE report.classroom_id = ${classroomId}
        AND report.room_id = ${roomId}
        AND room.classroom_id = ${classroomId}
      LIMIT 1
    `;
    if (reportRows.length === 0) return c.json({ success: true, report: null, merged: null });

    const isManager = await canManageContestClassroom(userId, classroomId);
    if (!isManager && !reportRows[0].visible_to_students) {
      return c.json({ error: 'Contest report is not shared with students' }, 403);
    }

    return c.json({ success: true, report: reportToApi(reportRows[0]), merged: reportRows[0].data });
  } catch (error: any) {
    console.error('Error reading classroom contest report:', error);
    return c.json({ error: error?.message || 'Failed to read classroom contest report' }, 500);
  }
};

export const shareClassroomContestReport = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const body = await readJsonBody(c);
    const visibleToStudents = Boolean(body?.visibleToStudents ?? body?.visible_to_students);

    const rows = await sql`
      UPDATE public.classroom_contest_reports
      SET visible_to_students = ${visibleToStudents},
          shared_by = ${visibleToStudents ? actor.userId : null},
          shared_at = ${visibleToStudents ? sql`now()` : null},
          updated_at = now()
      WHERE classroom_id = ${classroomId}
        AND room_id = ${roomId}
      RETURNING *
    `;
    if (rows.length === 0) return c.json({ error: 'Generate the classroom report before sharing it' }, 404);

    return c.json({ success: true, report: reportToApi(rows[0]) });
  } catch (error: any) {
    console.error('Error updating classroom contest share:', error);
    return c.json({ error: error?.message || 'Failed to update classroom contest sharing' }, 500);
  }
};

async function validateTarget(classroomId: string, targetType: string, targetId: string | null) {
  if (targetType === 'ignore') {
    return { ok: true };
  }

  if (targetType === 'student') {
    if (!targetId) return { error: 'studentId is required' };
    const rows = await sql`
      SELECT cs.student_id
      FROM public.classroom_students cs
      JOIN public.users u ON u.id = cs.student_id
      WHERE cs.classroom_id = ${classroomId}
        AND cs.student_id = ${targetId}
        AND cs.enrollment_status = ${ENROLLMENT_ACTIVE}
        AND u.admin IS NOT TRUE
        AND u.trainer IS NOT TRUE
        AND u.is_pre_enrolled IS NOT TRUE
      LIMIT 1
    `;
    return rows.length > 0 ? { ok: true } : { error: 'Student target was not found in this classroom' };
  }

  if (targetType === 'group') {
    if (!targetId) return { error: 'groupId is required' };
    const rows = await sql`
      SELECT id
      FROM public.trainer_teams
      WHERE classroom_id = ${classroomId}
        AND id = ${targetId}
      LIMIT 1
    `;
    return rows.length > 0 ? { ok: true } : { error: 'Group target was not found in this classroom' };
  }

  return { error: 'targetType must be student, group, or ignore' };
}

export const listClassroomContestHandleOverrides = async (c: any) => {
  const classroomId = c.req.param('id');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const rosterMaps = await getClassroomRosterMaps(classroomId);
    const { overrides } = await getClassroomHandleOverrideMaps(classroomId, rosterMaps);
    return c.json({ success: true, overrides });
  } catch (error: any) {
    console.error('Error listing classroom contest handle overrides:', error);
    return c.json({ error: error?.message || 'Failed to list handle overrides' }, 500);
  }
};

function primaryRankRowHandle(row: any) {
  return normalizeText(
    Array.isArray(row?.sourceHandles) && row.sourceHandles[0]
      ? row.sourceHandles[0]
      : row?.username || row?.realName,
    120,
  );
}

export const listClassroomContestUnmatchedRows = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const room = await loadRoom(classroomId, roomId);
    if (!room) return c.json({ error: 'Contest room not found' }, 404);

    const [latestSnapshots, rosterMaps] = await Promise.all([
      loadLatestSnapshotsForRoom(classroomId, roomId),
      getClassroomRosterMaps(classroomId),
    ]);
    const overrideMaps = await getClassroomHandleOverrideMaps(classroomId, rosterMaps);
    const maps = { ...rosterMaps, ...overrideMaps };
    const unmappedRows: any[] = [];
    const ignoredRows: any[] = [];

    latestSnapshots.forEach((snapshot: any) => {
      const provider = normalizeContestProvider(snapshot.provider);
      if (provider !== 'codeforces') return;

      const externalContestId = String(snapshot.external_contest_id);
      const rankData = applyRankDataClassroomMappings({
        ...(snapshot.rank_data || {}),
        provider,
        fullParticipantCount: snapshot.rank_data?.fullParticipantCount ?? snapshot.rank_data?.providerMeta?.fullParticipantCount,
        contestInfo: {
          ...(snapshot.rank_data?.contestInfo || {}),
          id: buildContestKey(provider, externalContestId),
          provider,
          externalContestId,
          title: snapshot.title || snapshot.rank_data?.contestInfo?.title || `Contest ${externalContestId}`,
        },
      }, maps, provider, false);

      (Array.isArray(rankData.teams) ? rankData.teams : []).forEach((row: any) => {
        if (row.isClassroomParticipant) return;
        const handle = primaryRankRowHandle(row);
        if (!handle) return;

        const apiRow = {
          provider,
          handle,
          sourceHandles: Array.isArray(row.sourceHandles) ? row.sourceHandles : [],
          username: row.username,
          realName: row.realName,
          nativeRank: row.nativeRank,
          nativePoints: row.nativePoints,
          solvedCount: row.solvedCount,
          finalScore: row.finalScore,
          contestItemId: snapshot.contest_item_id,
          contestTitle: snapshot.title || rankData.contestInfo?.title || `Contest ${externalContestId}`,
          externalContestId,
          matchedBy: row.matchedBy || null,
          targetType: row.targetType || null,
          ignored: Boolean(row.isIgnored || row.classroomMapping?.isIgnored),
        };

        if (apiRow.ignored) {
          ignoredRows.push(apiRow);
        } else {
          unmappedRows.push(apiRow);
        }
      });
    });

    return c.json({
      success: true,
      unmappedRows,
      ignoredRows,
      summary: {
        unmappedRows: unmappedRows.length,
        ignoredRows: ignoredRows.length,
      },
    });
  } catch (error: any) {
    console.error('Error listing classroom contest unmatched rows:', error);
    return c.json({ error: error?.message || 'Failed to list unmatched contest rows' }, 500);
  }
};

export const createClassroomContestHandleOverride = async (c: any) => {
  const classroomId = c.req.param('id');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const body = await readJsonBody(c);
    const provider = normalizeContestProvider(body?.provider ?? body?.contestProvider);
    const vjudgeHandle = normalizeText(body?.handle ?? body?.vjudgeHandle ?? body?.vjudge_handle, 120);
    const targetType = normalizeText(body?.targetType ?? body?.target_type, 20).toLowerCase();
    const studentId = normalizeUuid(body?.studentId ?? body?.student_id ?? body?.targetId);
    const groupId = normalizeUuid(body?.groupId ?? body?.group_id ?? body?.teamId ?? body?.targetId);
    const targetId = targetType === 'ignore' ? null : targetType === 'student' ? studentId : groupId;
    const note = normalizeText(body?.note, 300) || null;

    if (!vjudgeHandle) return c.json({ error: `${contestProviderLabel(provider)} handle is required` }, 400);
    const target = await validateTarget(classroomId, targetType, targetId);
    if ('error' in target) return c.json({ error: target.error }, 400);

    const rows = await sql`
      INSERT INTO public.classroom_contest_handle_overrides (
        classroom_id,
        provider,
        vjudge_handle,
        target_type,
        student_id,
        group_id,
        note,
        created_by,
        updated_by
      )
      VALUES (
        ${classroomId},
        ${provider},
        ${vjudgeHandle},
        ${targetType},
        ${targetType === 'student' ? studentId : null},
        ${targetType === 'group' ? groupId : null},
        ${note},
        ${actor.userId},
        ${actor.userId}
      )
      ON CONFLICT (classroom_id, provider, (lower(vjudge_handle)))
      DO UPDATE SET
        provider = EXCLUDED.provider,
        target_type = EXCLUDED.target_type,
        student_id = EXCLUDED.student_id,
        group_id = EXCLUDED.group_id,
        note = EXCLUDED.note,
        updated_by = EXCLUDED.updated_by,
        updated_at = now()
      RETURNING *
    `;

    return c.json({ success: true, override: handleOverrideToApi(rows[0]) });
  } catch (error: any) {
    console.error('Error creating classroom contest handle override:', error);
    return c.json({ error: error?.message || 'Failed to save handle override' }, 500);
  }
};

export const updateClassroomContestHandleOverride = async (c: any) => {
  const classroomId = c.req.param('id');
  const handleId = c.req.param('handleId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const currentRows = await sql`
      SELECT *
      FROM public.classroom_contest_handle_overrides
      WHERE classroom_id = ${classroomId}
        AND id = ${handleId}
      LIMIT 1
    `;
    if (currentRows.length === 0) return c.json({ error: 'Handle override not found' }, 404);

    const body = await readJsonBody(c);
    const provider = normalizeContestProvider(body?.provider ?? body?.contestProvider ?? currentRows[0].provider);
    const vjudgeHandle = normalizeText(body?.handle ?? body?.vjudgeHandle ?? body?.vjudge_handle ?? currentRows[0].vjudge_handle, 120);
    const targetType = normalizeText(body?.targetType ?? body?.target_type ?? currentRows[0].target_type, 20).toLowerCase();
    const studentId = normalizeUuid(body?.studentId ?? body?.student_id ?? body?.targetId ?? currentRows[0].student_id);
    const groupId = normalizeUuid(body?.groupId ?? body?.group_id ?? body?.teamId ?? body?.targetId ?? currentRows[0].group_id);
    const targetId = targetType === 'ignore' ? null : targetType === 'student' ? studentId : groupId;
    const note = body?.note === undefined ? currentRows[0].note : (normalizeText(body?.note, 300) || null);

    if (!vjudgeHandle) return c.json({ error: `${contestProviderLabel(provider)} handle is required` }, 400);
    const target = await validateTarget(classroomId, targetType, targetId);
    if ('error' in target) return c.json({ error: target.error }, 400);

    const rows = await sql`
      UPDATE public.classroom_contest_handle_overrides
      SET provider = ${provider},
          vjudge_handle = ${vjudgeHandle},
          target_type = ${targetType},
          student_id = ${targetType === 'student' ? studentId : null},
          group_id = ${targetType === 'group' ? groupId : null},
          note = ${note},
          updated_by = ${actor.userId},
          updated_at = now()
      WHERE classroom_id = ${classroomId}
        AND id = ${handleId}
      RETURNING *
    `;

    return c.json({ success: true, override: handleOverrideToApi(rows[0]) });
  } catch (error: any) {
    console.error('Error updating classroom contest handle override:', error);
    return c.json({ error: error?.message || 'Failed to update handle override' }, 500);
  }
};

export const deleteClassroomContestHandleOverride = async (c: any) => {
  const classroomId = c.req.param('id');
  const handleId = c.req.param('handleId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const rows = await sql`
      DELETE FROM public.classroom_contest_handle_overrides
      WHERE classroom_id = ${classroomId}
        AND id = ${handleId}
      RETURNING *
    `;
    if (rows.length === 0) return c.json({ error: 'Handle override not found' }, 404);

    return c.json({ success: true, override: handleOverrideToApi(rows[0]) });
  } catch (error: any) {
    console.error('Error deleting classroom contest handle override:', error);
    return c.json({ error: error?.message || 'Failed to delete handle override' }, 500);
  }
};

async function upsertSolveOverrideRow(db: any, payload: {
  classroomId: string;
  roomId: string;
  contestItemId: string;
  targetType: string;
  studentId: string | null;
  groupId: string | null;
  solveCount: number;
  note: string | null;
  actorId: string;
}) {
  if (payload.targetType === 'student') {
    return db`
      INSERT INTO public.classroom_contest_solve_overrides (
        classroom_id,
        room_id,
        contest_id,
        target_type,
        student_id,
        group_id,
        solve_count,
        note,
        created_by,
        updated_by
      )
      VALUES (
        ${payload.classroomId},
        ${payload.roomId},
        ${payload.contestItemId},
        ${payload.targetType},
        ${payload.studentId},
        null,
        ${payload.solveCount},
        ${payload.note},
        ${payload.actorId},
        ${payload.actorId}
      )
      ON CONFLICT (room_id, contest_id, student_id) WHERE student_id IS NOT NULL
      DO UPDATE SET
        solve_count = EXCLUDED.solve_count,
        note = EXCLUDED.note,
        updated_by = EXCLUDED.updated_by,
        updated_at = now()
      RETURNING *
    `;
  }

  return db`
    INSERT INTO public.classroom_contest_solve_overrides (
      classroom_id,
      room_id,
      contest_id,
      target_type,
      student_id,
      group_id,
      solve_count,
      note,
      created_by,
      updated_by
    )
    VALUES (
      ${payload.classroomId},
      ${payload.roomId},
      ${payload.contestItemId},
      ${payload.targetType},
      null,
      ${payload.groupId},
      ${payload.solveCount},
      ${payload.note},
      ${payload.actorId},
      ${payload.actorId}
    )
    ON CONFLICT (room_id, contest_id, group_id) WHERE group_id IS NOT NULL
    DO UPDATE SET
      solve_count = EXCLUDED.solve_count,
      note = EXCLUDED.note,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
    RETURNING *
  `;
}

export const listClassroomContestSolveOverrides = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  const contestItemId = normalizeUuid(c.req.query('contestItemId') || c.req.query('contest_id'));
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const room = await loadRoom(classroomId, roomId);
    if (!room) return c.json({ error: 'Contest room not found' }, 404);

    if (contestItemId) {
      const contest = await loadContestItem(classroomId, roomId, contestItemId);
      if (!contest) return c.json({ error: 'Contest item not found' }, 404);
    }

    const rows = await loadRoomSolveOverrides(classroomId, roomId, contestItemId);
    return c.json({ success: true, overrides: rows.map(solveOverrideToApi) });
  } catch (error: any) {
    console.error('Error listing classroom contest solve overrides:', error);
    return c.json({ error: error?.message || 'Failed to list manual solve counts' }, 500);
  }
};

export const createClassroomContestSolveOverride = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const body = await readJsonBody(c);
    const contestItemId = normalizeUuid(body?.contestItemId ?? body?.contest_id ?? body?.contestId);
    const targetType = normalizeText(body?.targetType ?? body?.target_type, 20).toLowerCase();
    const studentId = normalizeUuid(body?.studentId ?? body?.student_id ?? body?.targetId);
    const groupId = normalizeUuid(body?.groupId ?? body?.group_id ?? body?.teamId ?? body?.targetId);
    const targetId = targetType === 'student' ? studentId : targetType === 'group' ? groupId : null;
    const solveCount = normalizeSolveCount(body?.solveCount ?? body?.solve_count ?? body?.solves);
    const note = normalizeText(body?.note, 300) || null;

    if (!contestItemId) return c.json({ error: 'contestItemId is required' }, 400);
    if (targetType !== 'student' && targetType !== 'group') return c.json({ error: 'targetType must be student or group' }, 400);
    if (solveCount === null) return c.json({ error: 'solveCount must be a non-negative integer' }, 400);

    const contest = await loadContestItem(classroomId, roomId, contestItemId);
    if (!contest) return c.json({ error: 'Contest item not found' }, 404);

    const target = await validateTarget(classroomId, targetType, targetId);
    if ('error' in target) return c.json({ error: target.error }, 400);

    const rows = await upsertSolveOverrideRow(sql, {
      classroomId,
      roomId,
      contestItemId,
      targetType,
      studentId,
      groupId,
      solveCount,
      note,
      actorId: actor.userId,
    });

    return c.json({
      success: true,
      override: solveOverrideToApi({
        ...rows[0],
        provider: contest.provider,
        external_contest_id: contest.external_contest_id,
        contest_title: contest.title,
      }),
    });
  } catch (error: any) {
    console.error('Error creating classroom contest solve override:', error);
    return c.json({ error: error?.message || 'Failed to save manual solve count' }, 500);
  }
};

export const updateClassroomContestSolveOverride = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  const overrideId = c.req.param('overrideId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const currentRows = await sql`
      SELECT *
      FROM public.classroom_contest_solve_overrides
      WHERE classroom_id = ${classroomId}
        AND room_id = ${roomId}
        AND id = ${overrideId}
      LIMIT 1
    `;
    if (currentRows.length === 0) return c.json({ error: 'Manual solve count not found' }, 404);

    const body = await readJsonBody(c);
    const contestItemId = normalizeUuid(body?.contestItemId ?? body?.contest_id ?? body?.contestId ?? currentRows[0].contest_id);
    const targetType = normalizeText(body?.targetType ?? body?.target_type ?? currentRows[0].target_type, 20).toLowerCase();
    const studentId = normalizeUuid(body?.studentId ?? body?.student_id ?? body?.targetId ?? currentRows[0].student_id);
    const groupId = normalizeUuid(body?.groupId ?? body?.group_id ?? body?.teamId ?? body?.targetId ?? currentRows[0].group_id);
    const targetId = targetType === 'student' ? studentId : targetType === 'group' ? groupId : null;
    const solveCount = normalizeSolveCount(body?.solveCount ?? body?.solve_count ?? body?.solves ?? currentRows[0].solve_count);
    const note = body?.note === undefined ? currentRows[0].note : (normalizeText(body?.note, 300) || null);

    if (!contestItemId) return c.json({ error: 'contestItemId is required' }, 400);
    if (targetType !== 'student' && targetType !== 'group') return c.json({ error: 'targetType must be student or group' }, 400);
    if (solveCount === null) return c.json({ error: 'solveCount must be a non-negative integer' }, 400);

    const contest = await loadContestItem(classroomId, roomId, contestItemId);
    if (!contest) return c.json({ error: 'Contest item not found' }, 404);

    const target = await validateTarget(classroomId, targetType, targetId);
    if ('error' in target) return c.json({ error: target.error }, 400);

    const rows = await sql.begin(async (tx) => {
      await tx`
        DELETE FROM public.classroom_contest_solve_overrides
        WHERE classroom_id = ${classroomId}
          AND room_id = ${roomId}
          AND id = ${overrideId}
      `;

      return upsertSolveOverrideRow(tx, {
        classroomId,
        roomId,
        contestItemId,
        targetType,
        studentId,
        groupId,
        solveCount,
        note,
        actorId: actor.userId,
      });
    });

    return c.json({
      success: true,
      override: solveOverrideToApi({
        ...rows[0],
        provider: contest.provider,
        external_contest_id: contest.external_contest_id,
        contest_title: contest.title,
      }),
    });
  } catch (error: any) {
    console.error('Error updating classroom contest solve override:', error);
    return c.json({ error: error?.message || 'Failed to update manual solve count' }, 500);
  }
};

export const deleteClassroomContestSolveOverride = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  const overrideId = c.req.param('overrideId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const rows = await sql`
      DELETE FROM public.classroom_contest_solve_overrides
      WHERE classroom_id = ${classroomId}
        AND room_id = ${roomId}
        AND id = ${overrideId}
      RETURNING *
    `;
    if (rows.length === 0) return c.json({ error: 'Manual solve count not found' }, 404);

    return c.json({ success: true, override: solveOverrideToApi(rows[0]) });
  } catch (error: any) {
    console.error('Error deleting classroom contest solve override:', error);
    return c.json({ error: error?.message || 'Failed to delete manual solve count' }, 500);
  }
};

export const listClassroomContestDemerits = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  const contestItemId = normalizeUuid(c.req.query('contestItemId') || c.req.query('contest_id'));
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const room = await loadRoom(classroomId, roomId);
    if (!room) return c.json({ error: 'Contest room not found' }, 404);

    const rows = contestItemId
      ? await sql`
          SELECT d.*,
                 contest.provider,
                 contest.external_contest_id,
                 contest.title AS contest_title
          FROM public.classroom_contest_demerits d
          JOIN public.classroom_contests contest ON contest.id = d.contest_id
          WHERE d.classroom_id = ${classroomId}
            AND d.room_id = ${roomId}
            AND d.contest_id = ${contestItemId}
          ORDER BY d.created_at DESC
        `
      : await sql`
          SELECT d.*,
                 contest.provider,
                 contest.external_contest_id,
                 contest.title AS contest_title
          FROM public.classroom_contest_demerits d
          JOIN public.classroom_contests contest ON contest.id = d.contest_id
          WHERE d.classroom_id = ${classroomId}
            AND d.room_id = ${roomId}
          ORDER BY d.created_at DESC
        `;

    return c.json({ success: true, demerits: rows.map(demeritToApi) });
  } catch (error: any) {
    console.error('Error listing classroom contest demerits:', error);
    return c.json({ error: error?.message || 'Failed to list classroom contest demerits' }, 500);
  }
};

export const createClassroomContestDemerit = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const body = await readJsonBody(c);
    const contestItemId = normalizeUuid(body?.contestItemId ?? body?.contest_id ?? body?.contestId);
    const vjudgeHandle = normalizeText(body?.handle ?? body?.vjudgeHandle ?? body?.vjudge_id, 120);
    const points = normalizePoints(body?.points ?? body?.demerit_point ?? body?.demeritPoint);
    const reason = normalizeText(body?.reason, 500);

    if (!contestItemId) return c.json({ error: 'contestItemId is required' }, 400);
    if (points === null) return c.json({ error: 'Demerit points must be a non-negative integer' }, 400);
    if (!reason) return c.json({ error: 'Reason is required' }, 400);

    const contest = await loadContestItem(classroomId, roomId, contestItemId);
    if (!contest) return c.json({ error: 'Contest item not found' }, 404);
    const provider = normalizeContestProvider(contest.provider);
    if (!vjudgeHandle) return c.json({ error: `${contestProviderLabel(provider)} handle is required` }, 400);

    const rows = await sql`
      INSERT INTO public.classroom_contest_demerits (
        classroom_id,
        room_id,
        contest_id,
        vjudge_handle,
        points,
        reason,
        created_by,
        updated_by
      )
      VALUES (
        ${classroomId},
        ${roomId},
        ${contestItemId},
        ${vjudgeHandle},
        ${points},
        ${reason},
        ${actor.userId},
        ${actor.userId}
      )
      RETURNING *
    `;

    return c.json({ success: true, demerit: demeritToApi({ ...rows[0], provider, external_contest_id: contest.external_contest_id, contest_title: contest.title }) });
  } catch (error: any) {
    console.error('Error creating classroom contest demerit:', error);
    return c.json({ error: error?.message || 'Failed to save classroom contest demerit' }, 500);
  }
};

export const updateClassroomContestDemerit = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  const demeritId = c.req.param('demeritId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const currentRows = await sql`
      SELECT *
      FROM public.classroom_contest_demerits
      WHERE classroom_id = ${classroomId}
        AND room_id = ${roomId}
        AND id = ${demeritId}
      LIMIT 1
    `;
    if (currentRows.length === 0) return c.json({ error: 'Demerit not found' }, 404);

    const body = await readJsonBody(c);
    const contestItemId = normalizeUuid(body?.contestItemId ?? body?.contest_id ?? body?.contestId ?? currentRows[0].contest_id);
    const vjudgeHandle = normalizeText(body?.handle ?? body?.vjudgeHandle ?? body?.vjudge_id ?? currentRows[0].vjudge_handle, 120);
    const points = normalizePoints(body?.points ?? body?.demerit_point ?? body?.demeritPoint ?? currentRows[0].points);
    const reason = normalizeText(body?.reason ?? currentRows[0].reason, 500);

    if (!contestItemId) return c.json({ error: 'contestItemId is required' }, 400);
    if (points === null) return c.json({ error: 'Demerit points must be a non-negative integer' }, 400);
    if (!reason) return c.json({ error: 'Reason is required' }, 400);

    const contest = await loadContestItem(classroomId, roomId, contestItemId);
    if (!contest) return c.json({ error: 'Contest item not found' }, 404);
    const provider = normalizeContestProvider(contest.provider);
    if (!vjudgeHandle) return c.json({ error: `${contestProviderLabel(provider)} handle is required` }, 400);

    const rows = await sql`
      UPDATE public.classroom_contest_demerits
      SET contest_id = ${contestItemId},
          vjudge_handle = ${vjudgeHandle},
          points = ${points},
          reason = ${reason},
          updated_by = ${actor.userId},
          updated_at = now()
      WHERE classroom_id = ${classroomId}
        AND room_id = ${roomId}
        AND id = ${demeritId}
      RETURNING *
    `;

    return c.json({ success: true, demerit: demeritToApi({ ...rows[0], provider, external_contest_id: contest.external_contest_id, contest_title: contest.title }) });
  } catch (error: any) {
    console.error('Error updating classroom contest demerit:', error);
    return c.json({ error: error?.message || 'Failed to update classroom contest demerit' }, 500);
  }
};

export const deleteClassroomContestDemerit = async (c: any) => {
  const classroomId = c.req.param('id');
  const roomId = c.req.param('roomId');
  const demeritId = c.req.param('demeritId');
  try {
    const actor = await getManagedActor(c, classroomId);
    if ('error' in actor) return c.json({ error: actor.error }, actor.status);

    const rows = await sql`
      DELETE FROM public.classroom_contest_demerits
      WHERE classroom_id = ${classroomId}
        AND room_id = ${roomId}
        AND id = ${demeritId}
      RETURNING *
    `;
    if (rows.length === 0) return c.json({ error: 'Demerit not found' }, 404);

    return c.json({ success: true, demerit: demeritToApi(rows[0]) });
  } catch (error: any) {
    console.error('Error deleting classroom contest demerit:', error);
    return c.json({ error: error?.message || 'Failed to delete classroom contest demerit' }, 500);
  }
};
