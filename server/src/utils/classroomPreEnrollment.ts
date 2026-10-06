import { randomUUID } from 'crypto';
import sql from '../db';

export const ENROLLMENT_ACTIVE = 'active';
export const ENROLLMENT_PRE_ENROLLED = 'pre_enrolled';
export const ENROLLMENT_LINK_PENDING = 'link_pending';

export type EnrollmentStatus =
  | typeof ENROLLMENT_ACTIVE
  | typeof ENROLLMENT_PRE_ENROLLED
  | typeof ENROLLMENT_LINK_PENDING;

export type StudentLookupMethod = 'email' | 'mist_id';

export interface PreEnrollStudentInput {
  lookupMethod?: unknown;
  method?: unknown;
  identifier?: unknown;
  studentIdentifier?: unknown;
  fullName?: unknown;
  name?: unknown;
  email?: unknown;
  rowNumber?: unknown;
}

function normalizeText(value: unknown, maxLength = 500): string {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeEmail(value: unknown): string {
  return normalizeText(value, 320).toLowerCase();
}

export function normalizeEnrollmentLookupMethod(value: unknown): StudentLookupMethod {
  const method = normalizeText(value, 40).toLowerCase();
  return method === 'mist_id' || method === 'student_id' ? 'mist_id' : 'email';
}

export function normalizeEnrollmentIdentifier(value: unknown, method: StudentLookupMethod): string {
  const text = normalizeText(value, 320);
  return method === 'email' ? text.toLowerCase() : text;
}

function normalizeMistIdNumber(identifier: string): number | null {
  const numeric = Number(identifier);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
}

function generatedPreEnrollmentEmail(method: StudentLookupMethod, identifier: string): string {
  const slug = identifier.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'student';
  return `pre-enrolled+${method}-${slug}-${randomUUID()}@mcc.local`;
}

function isStudentRole(row: any): boolean {
  return !Boolean(row?.admin || row?.trainer);
}

function isPreEnrolled(row: any): boolean {
  return Boolean(row?.is_pre_enrolled);
}

function rowNumberOf(value: unknown, fallback: number): number | string {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

export async function ensurePreEnrollmentSchema() {
  // Schema is deployed by docs/sql/trainer-student-thread-instant-realtime-20260802.sql.
  // Keep this compatibility function while callers are migrated away from runtime guards.
  return Promise.resolve();
}

async function findRealUserByIdentifier(tx: any, method: StudentLookupMethod, identifier: string) {
  if (method === 'mist_id') {
    return tx`
      SELECT id, full_name, email, mist_id, admin, trainer, is_pre_enrolled
      FROM users
      WHERE mist_id::text = ${identifier}
        AND is_pre_enrolled IS NOT TRUE
      LIMIT 1
    `;
  }

  return tx`
    SELECT id, full_name, email, mist_id, admin, trainer, is_pre_enrolled
    FROM users
    WHERE lower(email) = ${identifier}
      AND is_pre_enrolled IS NOT TRUE
    LIMIT 1
  `;
}

async function findPlaceholderUserByIdentifier(tx: any, method: StudentLookupMethod, identifier: string) {
  if (method === 'mist_id') {
    return tx`
      SELECT id, full_name, email, mist_id, admin, trainer, is_pre_enrolled
      FROM users
      WHERE is_pre_enrolled = true AND mist_id::text = ${identifier}
      LIMIT 1
    `;
  }

  return tx`
    SELECT u.id, u.full_name, u.email, u.mist_id, u.admin, u.trainer, u.is_pre_enrolled
    FROM classroom_students cs
    JOIN users u ON u.id = cs.student_id
    WHERE u.is_pre_enrolled = true
      AND (
        lower(cs.pre_enrollment_email) = ${identifier}
        OR (cs.pre_enrollment_method = 'email' AND lower(cs.pre_enrollment_identifier) = ${identifier})
      )
    LIMIT 1
  `;
}

async function createPlaceholderUser(tx: any, method: StudentLookupMethod, identifier: string, fullName: string) {
  const mistId = method === 'mist_id' ? normalizeMistIdNumber(identifier) : null;
  if (method === 'mist_id' && mistId === null) {
    return null;
  }

  const password = await Bun.password.hash(randomUUID());
  const email = generatedPreEnrollmentEmail(method, identifier);
  const rows = await tx`
    INSERT INTO users (full_name, email, mist_id, password, trainer, admin, granted, is_pre_enrolled)
    VALUES (${fullName}, ${email}, ${mistId}, ${password}, false, false, false, true)
    RETURNING id, full_name, email, mist_id, admin, trainer, is_pre_enrolled
  `;
  return rows[0] || null;
}

async function ensurePlaceholderUser(tx: any, method: StudentLookupMethod, identifier: string, fullName: string) {
  const existing = await findPlaceholderUserByIdentifier(tx, method, identifier);
  if (existing.length > 0) {
    return existing[0];
  }
  return createPlaceholderUser(tx, method, identifier, fullName);
}

export async function preEnrollClassroomStudents(classroomId: string, rows: PreEnrollStudentInput[]) {
  await ensurePreEnrollmentSchema();

  const inputs = Array.isArray(rows) ? rows.slice(0, 1000) : [];
  const rowErrors: any[] = [];
  const created: any[] = [];
  const alreadyPreEnrolled: any[] = [];
  const enrolledExisting: any[] = [];
  const alreadyActive: any[] = [];
  const invalidRole: any[] = [];
  const seen = new Set<string>();

  await sql.begin(async (tx) => {
    for (let index = 0; index < inputs.length; index += 1) {
      const input = inputs[index];
      const method = normalizeEnrollmentLookupMethod(input.lookupMethod ?? input.method);
      const identifier = normalizeEnrollmentIdentifier(input.identifier ?? input.studentIdentifier, method);
      const fullName = normalizeText(input.fullName ?? input.name, 160);
      const preEnrollmentEmail = normalizeEmail(input.email);
      const rowNumber = rowNumberOf(input.rowNumber, index + 1);
      const dedupeKey = `${method}\u0000${identifier}`;

      if (!identifier) {
        rowErrors.push({ rowNumber, reason: method === 'mist_id' ? 'Student ID is required' : 'Email is required' });
        continue;
      }
      if (method === 'mist_id' && normalizeMistIdNumber(identifier) === null) {
        rowErrors.push({ rowNumber, identifier, reason: 'Student ID must be numeric' });
        continue;
      }
      if (!fullName) {
        rowErrors.push({ rowNumber, identifier, reason: 'Student name is required' });
        continue;
      }
      if (seen.has(dedupeKey)) {
        rowErrors.push({ rowNumber, identifier, reason: 'Duplicate student in this confirmation' });
        continue;
      }
      seen.add(dedupeKey);

      const realUserRows = await findRealUserByIdentifier(tx, method, identifier);
      if (realUserRows.length > 0) {
        const realUser = realUserRows[0];
        if (!isStudentRole(realUser)) {
          invalidRole.push({ rowNumber, identifier, id: realUser.id, full_name: realUser.full_name, email: realUser.email, mist_id: realUser.mist_id });
          continue;
        }

        const existing = await tx`
          SELECT id, enrollment_status
          FROM classroom_students
          WHERE classroom_id = ${classroomId} AND student_id = ${realUser.id}
          LIMIT 1
        `;
        if (existing.length > 0) {
          if (existing[0].enrollment_status !== ENROLLMENT_ACTIVE) {
            await tx`
              UPDATE classroom_students
              SET enrollment_status = ${ENROLLMENT_ACTIVE}, claimed_user_id = NULL, link_requested_at = NULL
              WHERE id = ${existing[0].id}
            `;
          }
          alreadyActive.push({ rowNumber, identifier, id: realUser.id, full_name: realUser.full_name, email: realUser.email, mist_id: realUser.mist_id });
          continue;
        }

        await tx`
          INSERT INTO classroom_students (classroom_id, student_id, enrollment_status)
          VALUES (${classroomId}, ${realUser.id}, ${ENROLLMENT_ACTIVE})
          ON CONFLICT DO NOTHING
        `;
        enrolledExisting.push({ rowNumber, identifier, id: realUser.id, full_name: realUser.full_name, email: realUser.email, mist_id: realUser.mist_id });
        continue;
      }

      const placeholder = await ensurePlaceholderUser(tx, method, identifier, fullName);
      if (!placeholder) {
        rowErrors.push({ rowNumber, identifier, reason: 'Could not create pre-enrolled student' });
        continue;
      }

      const existing = await tx`
        SELECT id, enrollment_status
        FROM classroom_students
        WHERE classroom_id = ${classroomId} AND student_id = ${placeholder.id}
        LIMIT 1
      `;
      if (existing.length > 0) {
        alreadyPreEnrolled.push({ rowNumber, identifier, id: placeholder.id, full_name: placeholder.full_name, mist_id: placeholder.mist_id, enrollment_status: existing[0].enrollment_status });
        continue;
      }

      await tx`
        INSERT INTO classroom_students (
          classroom_id,
          student_id,
          enrollment_status,
          pre_enrollment_method,
          pre_enrollment_identifier,
          pre_enrollment_email
        )
        VALUES (
          ${classroomId},
          ${placeholder.id},
          ${ENROLLMENT_PRE_ENROLLED},
          ${method},
          ${identifier},
          ${preEnrollmentEmail || (method === 'email' ? identifier : null)}
        )
        ON CONFLICT DO NOTHING
      `;
      created.push({ rowNumber, identifier, id: placeholder.id, full_name: placeholder.full_name, mist_id: placeholder.mist_id });
    }
  });

  return {
    success: true,
    created,
    alreadyPreEnrolled,
    enrolledExisting,
    alreadyActive,
    invalidRole,
    rowErrors,
    summary: {
      received: inputs.length,
      created: created.length,
      alreadyPreEnrolled: alreadyPreEnrolled.length,
      enrolledExisting: enrolledExisting.length,
      alreadyActive: alreadyActive.length,
      invalidRole: invalidRole.length,
      rejected: rowErrors.length,
    },
  };
}

export async function markPreEnrollmentClaimsForUser(userId: string) {
  await ensurePreEnrollmentSchema();
  const users = await sql`
    SELECT id, full_name, email, mist_id, admin, trainer, is_pre_enrolled
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  if (users.length === 0) return [];

  const user = users[0];
  if (!isStudentRole(user) || isPreEnrolled(user)) return [];

  const email = normalizeEmail(user.email);
  const mistId = user.mist_id === null || user.mist_id === undefined ? '' : String(user.mist_id);
  if (!email && !mistId) return [];

  const claimed = await sql`
    UPDATE classroom_students cs
    SET enrollment_status = ${ENROLLMENT_LINK_PENDING},
        claimed_user_id = ${user.id},
        link_requested_at = now()
    FROM users placeholder
    WHERE placeholder.id = cs.student_id
      AND placeholder.is_pre_enrolled = true
      AND cs.enrollment_status = ${ENROLLMENT_PRE_ENROLLED}
      AND (cs.claimed_user_id IS NULL OR cs.claimed_user_id = ${user.id})
      AND (
        (${mistId} <> '' AND placeholder.mist_id::text = ${mistId})
        OR (${email} <> '' AND lower(cs.pre_enrollment_email) = ${email})
        OR (${email} <> '' AND cs.pre_enrollment_method = 'email' AND lower(cs.pre_enrollment_identifier) = ${email})
      )
    RETURNING cs.id, cs.classroom_id, cs.student_id, cs.claimed_user_id, cs.enrollment_status
  `;

  return claimed;
}

export async function approvePreEnrollmentClaim(classroomId: string, placeholderStudentId: string) {
  await ensurePreEnrollmentSchema();

  return sql.begin(async (tx) => {
    const claims = await tx`
      SELECT
        cs.id AS membership_id,
        cs.student_id AS placeholder_student_id,
        cs.claimed_user_id,
        placeholder.full_name AS placeholder_name,
        claim.full_name AS claimed_name,
        claim.email AS claimed_email,
        claim.mist_id AS claimed_mist_id,
        claim.admin AS claimed_admin,
        claim.trainer AS claimed_trainer,
        claim.is_pre_enrolled AS claimed_is_pre_enrolled
      FROM classroom_students cs
      JOIN users placeholder ON placeholder.id = cs.student_id
      JOIN users claim ON claim.id = cs.claimed_user_id
      WHERE cs.classroom_id = ${classroomId}
        AND cs.student_id = ${placeholderStudentId}
        AND cs.enrollment_status = ${ENROLLMENT_LINK_PENDING}
        AND placeholder.is_pre_enrolled = true
      LIMIT 1
    `;
    if (claims.length === 0) {
      return { success: false, status: 404, error: 'Pending pre-enrollment claim not found' };
    }

    const claim = claims[0];
    if (claim.claimed_admin || claim.claimed_trainer || claim.claimed_is_pre_enrolled) {
      return { success: false, status: 400, error: 'Claimed account cannot be enrolled as a classroom student' };
    }

    const claimedUserId = claim.claimed_user_id;

    await tx`
      INSERT INTO classroom_students (classroom_id, student_id, enrollment_status)
      VALUES (${classroomId}, ${claimedUserId}, ${ENROLLMENT_ACTIVE})
      ON CONFLICT DO NOTHING
    `;
    await tx`
      UPDATE classroom_students
      SET enrollment_status = ${ENROLLMENT_ACTIVE}, claimed_user_id = NULL, link_requested_at = NULL
      WHERE classroom_id = ${classroomId} AND student_id = ${claimedUserId}
    `;

    await tx`
      INSERT INTO trainer_team_members (team_id, student_id)
      SELECT tm.team_id, ${claimedUserId}
      FROM trainer_team_members tm
      JOIN trainer_teams t ON t.id = tm.team_id
      WHERE t.classroom_id = ${classroomId} AND tm.student_id = ${placeholderStudentId}
      ON CONFLICT DO NOTHING
    `;
    await tx`
      DELETE FROM trainer_team_members tm
      USING trainer_teams t
      WHERE t.id = tm.team_id
        AND t.classroom_id = ${classroomId}
        AND tm.student_id = ${placeholderStudentId}
    `;

    await tx`
      INSERT INTO class_attendance (classroom_id, class_id, student_id, status, recorded_by, trainer_name, remarks, updated_at)
      SELECT classroom_id, class_id, ${claimedUserId}, status, recorded_by, trainer_name, remarks, updated_at
      FROM class_attendance
      WHERE classroom_id = ${classroomId} AND student_id = ${placeholderStudentId}
      ON CONFLICT (class_id, student_id) DO NOTHING
    `;
    await tx`
      DELETE FROM class_attendance
      WHERE classroom_id = ${classroomId} AND student_id = ${placeholderStudentId}
    `;

    await tx`
      UPDATE class_problems cp
      SET student_id = ${claimedUserId}
      FROM classes cl
      WHERE cl.id = cp.class_id
        AND cl.classroom_id = ${classroomId}
        AND cp.student_id = ${placeholderStudentId}
    `;

    await tx`
      INSERT INTO classroom_topic_problem_progress (
        assignment_id,
        topic_problem_id,
        student_id,
        status,
        student_difficulty,
        solution_link,
        solution_code,
        submission_notes,
        solved_at,
        updated_at
      )
      SELECT
        progress.assignment_id,
        progress.topic_problem_id,
        ${claimedUserId},
        progress.status,
        progress.student_difficulty,
        progress.solution_link,
        progress.solution_code,
        progress.submission_notes,
        progress.solved_at,
        progress.updated_at
      FROM classroom_topic_problem_progress progress
      JOIN classroom_team_topic_assignments a ON a.id = progress.assignment_id
      WHERE a.classroom_id = ${classroomId} AND progress.student_id = ${placeholderStudentId}
      ON CONFLICT (assignment_id, topic_problem_id, student_id) DO NOTHING
    `;
    await tx`
      DELETE FROM classroom_topic_problem_progress progress
      USING classroom_team_topic_assignments a
      WHERE a.id = progress.assignment_id
        AND a.classroom_id = ${classroomId}
        AND progress.student_id = ${placeholderStudentId}
    `;

    await tx`
      DELETE FROM classroom_students
      WHERE classroom_id = ${classroomId} AND student_id = ${placeholderStudentId}
    `;

    return {
      success: true,
      student: {
        id: claimedUserId,
        full_name: claim.claimed_name,
        email: claim.claimed_email,
        mist_id: claim.claimed_mist_id,
        enrollment_status: ENROLLMENT_ACTIVE,
      },
    };
  });
}

export async function rejectPreEnrollmentClaim(classroomId: string, placeholderStudentId: string) {
  await ensurePreEnrollmentSchema();
  const rows = await sql`
    UPDATE classroom_students cs
    SET enrollment_status = ${ENROLLMENT_PRE_ENROLLED},
        claimed_user_id = NULL,
        link_requested_at = NULL
    FROM users placeholder
    WHERE placeholder.id = cs.student_id
      AND placeholder.is_pre_enrolled = true
      AND cs.classroom_id = ${classroomId}
      AND cs.student_id = ${placeholderStudentId}
      AND cs.enrollment_status = ${ENROLLMENT_LINK_PENDING}
    RETURNING cs.id, cs.classroom_id, cs.student_id, cs.enrollment_status
  `;
  if (rows.length === 0) {
    return { success: false, status: 404, error: 'Pending pre-enrollment claim not found' };
  }
  return { success: true, membership: rows[0] };
}
