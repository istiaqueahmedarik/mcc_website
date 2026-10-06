import sql from '../db';
import { getAppBaseUrl } from './discordConfig';
import { enqueueDiscordDeliveryJob } from './discordDeliveryQueue';
import {
  appendDiscordStudentThreadSystemEventInTx,
  publishDiscordStudentThreadSystemEvent,
} from './discordThreadBridge';

type CommandStatus = 'accepted' | 'rejected' | 'failed';

export type DiscordMccCommandInput = {
  guildId: string;
  channelId: string;
  interactionId: string;
  discordUserId: string;
  commandName: string;
  subcommand: string;
};

type DiscordCommandContext = {
  binding_id: string;
  classroom_id: string;
  classroom_name: string;
  guild_id: string;
  thread_id?: string | null;
  guild_name?: string | null;
  channel_kind: 'staff_private' | 'student_private';
  channel_student_id?: string | null;
  channel_id: string;
  timezone: string;
  provisioning_state: string;
  action_required_reason?: string | null;
  installation_status?: string | null;
  installation_health?: string | null;
  staff_channel_id?: string | null;
  actor_user_id: string;
  actor_name?: string | null;
  actor_email?: string | null;
  is_manager: boolean;
  is_student_in_private_channel: boolean;
  target_student_id?: string | null;
};

const commandLabels: Record<string, string> = {
  today: 'Today',
  schedule: 'Schedule',
  problems: 'Problems',
  resources: 'Resources',
  status: 'Status',
  checkin: 'Check-in',
  submit: 'Submit',
  pending: 'Pending',
  review: 'Review',
  assign: 'Assign',
  reminders: 'Reminders',
  roster: 'Roster',
  reconcile: 'Repair',
  help: 'Help',
};

const ASSIGN_PROBLEM_PLATFORMS = new Set(['codeforces', 'codechef', 'atcoder', 'custom']);
const ASSIGN_TAG_ALLOWED_REGEX = /^[a-z0-9][a-z0-9 +#._-]{0,39}$/i;
const UUID_OR_PREFIX_REGEX = /^[0-9a-f]{8}(?:-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/i;
const POSTGRES_INTEGER_MAX = 2147483647;
const STRICT_ISO_WITH_ZONE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i;

type DiscordAssignSelection = {
  sourceInteractionId: string;
  classRef: string;
  targetRef: string;
  platform: string;
};

function normalizeText(value: unknown, maxLength = 160) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function normalizeRawText(value: unknown, maxLength = 500) {
  return String(value ?? '').slice(0, maxLength);
}

function normalizeNullableText(value: unknown, maxLength = 500) {
  const text = normalizeText(value, maxLength);
  return text || null;
}

function safeLine(value: unknown, fallback = 'Untitled') {
  return normalizeText(value, 90) || fallback;
}

function commandTitle(context: DiscordCommandContext, subcommand: string) {
  return `**${commandLabels[subcommand] || 'MCC'} · ${safeLine(context.classroom_name, 'Classroom')}**`;
}

function formatStatus(value: unknown) {
  return normalizeText(value, 80).replace(/_/g, ' ') || 'unknown';
}

function formatDateTime(value: unknown, timezone: string, mode: 'date' | 'datetime' = 'datetime') {
  if (!value) return 'unscheduled';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'unscheduled';
  try {
    return new Intl.DateTimeFormat('en-US', mode === 'date'
      ? { dateStyle: 'medium', timeZone: timezone }
      : { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }
    ).format(date);
  } catch {
    return date.toISOString();
  }
}

function formatRuleTime(row: any) {
  const localTime = normalizeText(row.local_time, 20);
  if (localTime) return localTime.slice(0, 5);
  if (Number.isFinite(Number(row.offset_minutes))) {
    const value = Number(row.offset_minutes);
    if (value === 0) return 'at event time';
    return `${Math.abs(value)} min ${value < 0 ? 'before' : 'after'}`;
  }
  return 'manual';
}

function localDateParts(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return {
    date: `${byType.get('year')}-${byType.get('month')}-${byType.get('day')}`,
    hour: Number(byType.get('hour') || 0),
  };
}

function capDiscordContent(content: string) {
  return content.length > 1900 ? `${content.slice(0, 1880)}\n…` : content;
}

function classroomUrl(classroomId: string, tab = 'updates') {
  return `${getAppBaseUrl()}/classroom/live/${classroomId}?tab=${encodeURIComponent(tab)}`;
}

function linesOrEmpty(lines: string[], empty: string) {
  return lines.length > 0 ? lines.join('\n') : empty;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function shortUuid(value: unknown) {
  return normalizeText(value, 80).slice(0, 8).toLowerCase();
}

function liveSubmitRef(problemId: unknown) {
  return `live:${shortUuid(problemId)}`;
}

function topicSubmitRef(assignmentId: unknown, topicProblemId: unknown) {
  return `topic:${shortUuid(assignmentId)}:${shortUuid(topicProblemId)}`;
}

function topicReviewRef(progressId: unknown) {
  return `topic:${shortUuid(progressId)}`;
}

function isUuidPrefix(value: string) {
  return /^[0-9a-f]{8}$/i.test(value);
}

function parseSubmitReference(value: unknown):
  | { type: 'live_problem'; problemPrefix: string }
  | { type: 'topic_problem'; assignmentPrefix: string; topicProblemPrefix: string }
  | { error: string } {
  const text = normalizeText(value, 100).toLowerCase();
  const parts = text.split(':');
  if (parts[0] === 'live' && parts.length === 2 && isUuidPrefix(parts[1])) {
    return { type: 'live_problem', problemPrefix: parts[1] };
  }
  if (
    parts[0] === 'topic'
    && parts.length === 3
    && isUuidPrefix(parts[1])
    && isUuidPrefix(parts[2])
  ) {
    return { type: 'topic_problem', assignmentPrefix: parts[1], topicProblemPrefix: parts[2] };
  }
  return {
    error: 'Paste a reference from `/mcc problems`, for example `live:1234abcd` or `topic:1234abcd:5678ef90`.',
  };
}

function parseReviewReference(value: unknown):
  | { type: 'live_problem'; problemPrefix: string }
  | { type: 'topic_problem'; progressPrefix: string }
  | { error: string } {
  const text = normalizeText(value, 100).toLowerCase();
  const parts = text.split(':');
  if (parts[0] === 'live' && parts.length === 2 && isUuidPrefix(parts[1])) {
    return { type: 'live_problem', problemPrefix: parts[1] };
  }
  if (parts[0] === 'topic' && parts.length === 2 && isUuidPrefix(parts[1])) {
    return { type: 'topic_problem', progressPrefix: parts[1] };
  }
  return {
    error: 'Paste a Review Ref from `/mcc pending`, for example `live:1234abcd` or `topic:5678ef90`.',
  };
}

function normalizeReviewAction(value: unknown):
  | { status: 'solved'; label: string; verb: string }
  | { status: 'tried'; label: string; verb: string }
  | { error: string } {
  const text = normalizeText(value, 40).toLowerCase().replace(/[\s-]+/g, '_');
  if (['approve', 'approved', 'accept', 'accepted', 'solve', 'solved', 'pass', 'passed'].includes(text)) {
    return { status: 'solved', label: 'approved', verb: 'approved' };
  }
  if (['revision', 'revise', 'needs_revision', 'needs_work', 'request_revision', 'reject', 'rejected', 'try', 'tried'].includes(text)) {
    return { status: 'tried', label: 'needs revision', verb: 'requested more work on' };
  }
  return { error: 'Review action must be `approve` or `needs_revision`.' };
}

function normalizeAssignPlatform(value: unknown) {
  const platform = normalizeText(value || 'custom', 40).toLowerCase();
  return ASSIGN_PROBLEM_PLATFORMS.has(platform) ? platform : '';
}

function normalizeAssignPositiveInteger(value: unknown):
  | { value: number | null }
  | { error: string } {
  const text = normalizeText(value, 40);
  if (!text) return { value: null };
  const num = Number(text);
  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) {
    return { error: 'Timer minutes must be a positive whole number.' };
  }
  return { value: Math.min(num, POSTGRES_INTEGER_MAX) };
}

function normalizeAssignDueAt(value: unknown):
  | { value: string | null }
  | { error: string } {
  const text = normalizeText(value, 120);
  if (!text) return { value: null };
  if (!STRICT_ISO_WITH_ZONE_REGEX.test(text)) {
    return { error: 'Due date must be ISO with a timezone, for example `2026-08-15T20:00:00+06:00`.' };
  }
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return { error: 'Due date is not a valid date/time.' };
  }
  return { value: date.toISOString() };
}

function normalizeAssignProblemTag(value: unknown): string | null {
  const tag = String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!tag || !ASSIGN_TAG_ALLOWED_REGEX.test(tag)) return null;
  return tag;
}

function normalizeAssignProblemTags(value: unknown): string[] {
  const values = Array.isArray(value) ? value : String(value ?? '').split(',');
  const normalized = values
    .map(normalizeAssignProblemTag)
    .filter((tag): tag is string => Boolean(tag));
  return [...new Set(normalized)];
}

function canonicalUuidPrefix(value: unknown) {
  const text = normalizeText(value, 80).toLowerCase();
  if (!UUID_OR_PREFIX_REGEX.test(text)) return '';
  return text.slice(0, 8);
}

function parseAssignClassReference(value: unknown):
  | { prefix: string }
  | { error: string } {
  const text = normalizeText(value, 100).toLowerCase();
  const parts = text.split(':');
  if (parts.length === 2 && parts[0] === 'class') {
    const prefix = canonicalUuidPrefix(parts[1]);
    if (prefix) return { prefix };
  }
  return { error: 'Choose a Class option from Discord autocomplete.' };
}

function parseAssignTargetReference(value: unknown):
  | { type: 'student' | 'team'; prefix: string }
  | { error: string } {
  const text = normalizeText(value, 100).toLowerCase();
  const parts = text.split(':');
  if (parts.length === 2 && (parts[0] === 'student' || parts[0] === 'team')) {
    const prefix = canonicalUuidPrefix(parts[1]);
    if (prefix) return { type: parts[0], prefix };
  }
  return { error: 'Choose a Student or Team option from Discord autocomplete.' };
}

function assignClassRef(classId: unknown) {
  return `class:${shortUuid(classId)}`;
}

function assignStudentRef(studentId: unknown) {
  return `student:${shortUuid(studentId)}`;
}

function assignTeamRef(teamId: unknown) {
  return `team:${shortUuid(teamId)}`;
}

function discordChoiceName(value: string) {
  return normalizeText(value, 100) || 'MCC option';
}

function safeProblemSlug(problemLink: string) {
  try {
    const url = new URL(problemLink);
    const pathParts = url.pathname.split('/').filter(Boolean);
    return decodeURIComponent(pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || 'Problem')
      .replace(/[_-]+/g, ' ')
      .trim()
      .slice(0, 80) || 'Problem';
  } catch {
    const parts = problemLink.split('/').filter(Boolean);
    return (parts[parts.length - 1] || 'Problem').slice(0, 80);
  }
}

function hostnameMatches(hostname: string, allowed: string[]) {
  const host = hostname.toLowerCase();
  return allowed.some((allowedHost) => (
    host === allowedHost || host.endsWith(`.${allowedHost}`)
  ));
}

function deriveDiscordProblemMetadata(platform: string, problemLink: string):
  | { title: string; details: string }
  | { error: string } {
  let url: URL;
  try {
    url = new URL(problemLink);
  } catch {
    return { error: 'Problem link must be a valid http:// or https:// URL.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: 'Problem link must start with http:// or https://.' };
  }

  const slug = safeProblemSlug(problemLink);
  if (platform === 'codeforces') {
    if (!['codeforces.com', 'www.codeforces.com'].includes(url.hostname.toLowerCase())) {
      return { error: 'Codeforces assignments must use codeforces.com links.' };
    }
    const match = url.pathname.match(/(?:contest\/(\d+)\/problem\/|problemset\/problem\/(\d+)\/)([A-Za-z][0-9]?)/i);
    const contestId = match?.[1] || match?.[2] || '';
    const index = match?.[3]?.toUpperCase() || '';
    return {
      title: contestId && index ? `Codeforces ${contestId}${index}` : `Codeforces: ${slug}`,
      details: 'Codeforces competitive programming task',
    };
  }

  if (platform === 'codechef') {
    if (!hostnameMatches(url.hostname, ['codechef.com'])) {
      return { error: 'CodeChef assignments must use codechef.com links.' };
    }
    return {
      title: `CodeChef: ${slug.toUpperCase()}`,
      details: 'CodeChef competitive programming task',
    };
  }

  if (platform === 'atcoder') {
    if (!hostnameMatches(url.hostname, ['atcoder.jp'])) {
      return { error: 'AtCoder assignments must use atcoder.jp links.' };
    }
    return {
      title: `AtCoder: ${slug}`,
      details: 'AtCoder task',
    };
  }

  return {
    title: `Custom: ${slug}`,
    details: '',
  };
}

async function ensureDiscordProblemTagsInTx(tx: any, tags: string[], createdBy: string) {
  if (tags.length === 0) return;
  await tx`
    INSERT INTO public.problem_tag_dictionary ${tx(
      tags.map((name) => ({ name, created_by: createdBy }))
    )}
    ON CONFLICT (name) DO NOTHING
  `;
}

async function auditDiscordCommandInTx(
  tx: any,
  input: DiscordMccCommandInput,
  status: CommandStatus,
  context: DiscordCommandContext,
  metadata: Record<string, unknown> = {}
) {
  await tx`
    INSERT INTO mcc_private.discord_command_audit (
      guild_id,
      channel_id,
      interaction_id,
      actor_user_id,
      discord_user_id,
      classroom_id,
      command_name,
      status,
      metadata
    )
    VALUES (
      ${input.guildId || null},
      ${input.channelId || null},
      ${input.interactionId || null},
      ${context.actor_user_id || null},
      ${input.discordUserId || null},
      ${context.classroom_id || null},
      ${input.commandName},
      ${status},
      ${tx.json({
        subcommand: input.subcommand,
        channel_kind: context.channel_kind || null,
        ...metadata,
      })}
    )
  `;
}

async function findUniqueLiveSubmissionTarget(context: DiscordCommandContext, problemPrefix: string) {
  const rows = await sql`
    SELECT problem.id,
           problem.status,
           problem.title,
           problem.class_id,
           class_session.name AS class_name,
           channel.thread_id
    FROM public.class_problems problem
    JOIN public.classes class_session ON class_session.id = problem.class_id
    JOIN mcc_private.classroom_discord_channels channel
      ON channel.classroom_id = class_session.classroom_id
     AND channel.student_id = problem.student_id
     AND channel.kind = 'student_private'
     AND channel.status = 'active'
    WHERE class_session.classroom_id = ${context.classroom_id}
      AND problem.student_id = ${context.actor_user_id}
      AND problem.id::text LIKE ${`${problemPrefix}%`}
    ORDER BY problem.assigned_at DESC
    LIMIT 2
  `;
  if (rows.length === 0) return { error: 'I could not find that live problem reference in your classroom channel.', status: 404 as const };
  if (rows.length > 1) return { error: 'That live problem reference is ambiguous. Run `/mcc problems` and paste the full displayed reference.', status: 400 as const };
  if (rows[0].status === 'solved') return { error: 'That live problem is already marked solved. Ask your trainer if it needs to be reopened.', status: 400 as const };
  return { target: rows[0] };
}

async function findUniqueTopicSubmissionTarget(
  context: DiscordCommandContext,
  assignmentPrefix: string,
  topicProblemPrefix: string
) {
  const rows = await sql`
    SELECT assignment.id AS assignment_id,
           assignment.topic_id,
           assignment.due_at,
           problem.id AS topic_problem_id,
           problem.title AS problem_title,
           topic.title AS topic_title,
           COALESCE(progress.status, 'not_solved') AS status,
           progress.id AS progress_id,
           channel.thread_id
    FROM public.classroom_team_topic_assignments assignment
    JOIN public.classroom_topics topic ON topic.id = assignment.topic_id
    JOIN public.classroom_topic_problems problem
      ON problem.topic_id = topic.id
    JOIN mcc_private.classroom_discord_channels channel
      ON channel.classroom_id = assignment.classroom_id
     AND channel.student_id = ${context.actor_user_id}
     AND channel.kind = 'student_private'
     AND channel.status = 'active'
    LEFT JOIN public.classroom_topic_problem_progress progress
      ON progress.assignment_id = assignment.id
     AND progress.topic_problem_id = problem.id
     AND progress.student_id = ${context.actor_user_id}
    WHERE assignment.classroom_id = ${context.classroom_id}
      AND assignment.status = 'active'
      AND assignment.id::text LIKE ${`${assignmentPrefix}%`}
      AND problem.id::text LIKE ${`${topicProblemPrefix}%`}
      AND (
        assignment.student_id = ${context.actor_user_id}
        OR EXISTS (
          SELECT 1
          FROM public.trainer_team_members member
          WHERE member.team_id = assignment.team_id
            AND member.student_id = ${context.actor_user_id}
        )
      )
    ORDER BY assignment.assigned_at DESC, problem.position ASC
    LIMIT 2
  `;
  if (rows.length === 0) return { error: 'I could not find that topic problem reference in your classroom channel.', status: 404 as const };
  if (rows.length > 1) return { error: 'That topic problem reference is ambiguous. Run `/mcc problems` and paste the full displayed reference.', status: 400 as const };
  if (rows[0].status === 'solved') return { error: 'That topic problem is already marked solved. Ask your trainer if it needs to be reopened.', status: 400 as const };
  return { target: rows[0] };
}

async function auditDiscordCommand(
  input: DiscordMccCommandInput,
  status: CommandStatus,
  context?: DiscordCommandContext | null,
  metadata: Record<string, unknown> = {}
) {
  await sql`
    INSERT INTO mcc_private.discord_command_audit (
      guild_id,
      channel_id,
      interaction_id,
      actor_user_id,
      discord_user_id,
      classroom_id,
      command_name,
      status,
      metadata
    )
    VALUES (
      ${input.guildId || null},
      ${input.channelId || null},
      ${input.interactionId || null},
      ${context?.actor_user_id || null},
      ${input.discordUserId || null},
      ${context?.classroom_id || null},
      ${input.commandName},
      ${status},
      ${sql.json({
        subcommand: input.subcommand,
        channel_kind: context?.channel_kind || null,
        ...metadata,
      })}
    )
  `.catch(() => null);
}

async function resolveDiscordCommandContext(input: DiscordMccCommandInput) {
  const rows = await sql`
    SELECT channel.binding_id,
           channel.classroom_id,
           channel.channel_id,
           channel.thread_id,
           channel.kind AS channel_kind,
           channel.student_id AS channel_student_id,
           binding.guild_id,
           binding.timezone,
           binding.provisioning_state,
           binding.action_required_reason,
           binding.staff_channel_id,
           installation.guild_name,
           installation.status AS installation_status,
           installation.health AS installation_health,
           classroom.name AS classroom_name,
           actor.id AS actor_user_id,
           actor.full_name AS actor_name,
           actor.email AS actor_email,
           actor.admin IS TRUE AS actor_is_admin,
           actor.trainer IS TRUE AS actor_is_trainer,
           (
             actor.admin IS TRUE
             OR (
               actor.trainer IS TRUE
               AND (
                 classroom.created_by = actor.id
                 OR substitute.trainer_id IS NOT NULL
               )
             )
           ) AS is_manager,
           (
             channel.kind = 'student_private'
             AND channel.student_id = actor.id
             AND membership.enrollment_status = 'active'
             AND actor.is_pre_enrolled IS NOT TRUE
           ) AS is_student_in_private_channel
    FROM mcc_private.classroom_discord_channels channel
    JOIN mcc_private.classroom_discord_bindings binding ON binding.id = channel.binding_id
    JOIN mcc_private.discord_guild_installations installation ON installation.id = binding.guild_installation_id
    JOIN public.classrooms classroom ON classroom.id = channel.classroom_id
    JOIN mcc_private.discord_user_connections connection
      ON connection.discord_user_id = ${input.discordUserId}
     AND connection.status = 'active'
    JOIN public.users actor ON actor.id = connection.user_id
    LEFT JOIN public.classroom_substitutes substitute
      ON substitute.classroom_id = channel.classroom_id
     AND substitute.trainer_id = actor.id
    LEFT JOIN public.classroom_students membership
      ON membership.classroom_id = channel.classroom_id
     AND membership.student_id = actor.id
    WHERE binding.guild_id = ${input.guildId}
      AND channel.channel_id = ${input.channelId}
      AND channel.status = 'active'
    LIMIT 1
  `;

  const context = rows[0] as DiscordCommandContext | undefined;
  if (!context) {
    return {
      error: 'Use `/mcc` inside a mapped MCC classroom Discord channel after linking your Discord account.',
      status: 404 as const,
    };
  }

  context.is_manager = Boolean(context.is_manager);
  context.is_student_in_private_channel = Boolean(context.is_student_in_private_channel);
  context.target_student_id = context.channel_student_id || (context.is_student_in_private_channel ? context.actor_user_id : null);

  if (!context.is_manager && !context.is_student_in_private_channel) {
    return {
      error: 'Your Discord account is linked, but it is not authorized for this classroom channel.',
      status: 403 as const,
      context,
    };
  }

  return { context };
}

async function findUniqueAssignableClass(context: DiscordCommandContext, classRef: unknown) {
  const parsed = parseAssignClassReference(classRef);
  if ('error' in parsed) return { error: parsed.error, status: 400 as const };

  const rows = await sql`
    SELECT id, name, scheduled_time, status
    FROM public.classes
    WHERE classroom_id = ${context.classroom_id}
      AND id::text LIKE ${`${parsed.prefix}%`}
    ORDER BY scheduled_time DESC NULLS LAST, created_at DESC
    LIMIT 2
  `;
  if (rows.length === 0) return { error: 'I could not find that class in this classroom.', status: 404 as const };
  if (rows.length > 1) return { error: 'That class reference is ambiguous. Pick the class from autocomplete again.', status: 400 as const };
  return { classSession: rows[0] };
}

async function findUniqueAssignableTarget(context: DiscordCommandContext, targetRef: unknown) {
  const parsed = parseAssignTargetReference(targetRef);
  if ('error' in parsed) return { error: parsed.error, status: 400 as const };

  if (parsed.type === 'student') {
    const rows = await sql`
      SELECT student.id,
             student.full_name,
             student.email,
             student.mist_id
      FROM public.classroom_students membership
      JOIN public.users student ON student.id = membership.student_id
      WHERE membership.classroom_id = ${context.classroom_id}
        AND membership.enrollment_status = 'active'
        AND membership.student_id::text LIKE ${`${parsed.prefix}%`}
        AND student.admin IS NOT TRUE
        AND student.trainer IS NOT TRUE
        AND student.is_pre_enrolled IS NOT TRUE
      ORDER BY student.full_name ASC NULLS LAST, student.email ASC NULLS LAST
      LIMIT 2
    `;
    if (rows.length === 0) return { error: 'I could not find that active real student in this classroom.', status: 404 as const };
    if (rows.length > 1) return { error: 'That student reference is ambiguous. Pick the student from autocomplete again.', status: 400 as const };
    return {
      target: {
        type: 'student' as const,
        id: rows[0].id,
        label: safeLine(rows[0].full_name || rows[0].email, 'Student'),
        studentIds: [rows[0].id],
      },
    };
  }

  const rows = await sql`
    SELECT team.id,
           team.name,
           COALESCE(
             array_agg(DISTINCT member.student_id)
               FILTER (
                 WHERE member.student_id IS NOT NULL
                   AND membership.enrollment_status = 'active'
                   AND member_profile.admin IS NOT TRUE
                   AND member_profile.trainer IS NOT TRUE
                   AND member_profile.is_pre_enrolled IS NOT TRUE
               ),
             array[]::uuid[]
           ) AS student_ids
    FROM public.trainer_teams team
    LEFT JOIN public.trainer_team_members member ON member.team_id = team.id
    LEFT JOIN public.classroom_students membership
      ON membership.classroom_id = team.classroom_id
     AND membership.student_id = member.student_id
    LEFT JOIN public.users member_profile ON member_profile.id = member.student_id
    WHERE team.classroom_id = ${context.classroom_id}
      AND team.id::text LIKE ${`${parsed.prefix}%`}
    GROUP BY team.id, team.name
    ORDER BY team.name ASC
    LIMIT 2
  `;
  if (rows.length === 0) return { error: 'I could not find that team in this classroom.', status: 404 as const };
  if (rows.length > 1) return { error: 'That team reference is ambiguous. Pick the team from autocomplete again.', status: 400 as const };
  const studentIds = Array.isArray(rows[0].student_ids)
    ? rows[0].student_ids.map((id: unknown) => String(id)).filter(Boolean)
    : [];
  if (studentIds.length === 0) {
    return { error: 'That team has no active real student members to assign.', status: 400 as const };
  }
  return {
    target: {
      type: 'team' as const,
      id: rows[0].id,
      label: safeLine(rows[0].name, 'Team'),
      studentIds,
    },
  };
}

export async function autocompleteDiscordAssignOption(
  input: DiscordMccCommandInput,
  focused: { name: string; value: string },
) {
  const resolved = await resolveDiscordCommandContext({ ...input, subcommand: 'assign' });
  if ('error' in resolved || !resolved.context.is_manager) return [];

  const context = resolved.context;
  const needle = normalizeText(focused.value, 80).toLowerCase();
  const prefix = `${needle}%`;

  if (focused.name === 'class_ref') {
    const rows = await sql`
      SELECT id, name, scheduled_time, status
      FROM public.classes
      WHERE classroom_id = ${context.classroom_id}
        AND (
          ${needle} = ''
          OR position(${needle} in lower(coalesce(name, ''))) > 0
          OR id::text LIKE ${prefix}
        )
      ORDER BY scheduled_time DESC NULLS LAST, created_at DESC
      LIMIT 25
    `;
    return rows.map((row: any) => ({
      name: discordChoiceName(`Class · ${safeLine(row.name, 'Class')} · ${formatStatus(row.status)} · ${formatDateTime(row.scheduled_time, context.timezone)} · ${shortUuid(row.id)}`),
      value: assignClassRef(row.id),
    }));
  }

  if (focused.name === 'target_ref') {
    const rows = await sql`
      WITH student_choices AS (
        SELECT 'student'::text AS kind,
               student.id,
               student.full_name AS label,
               student.email,
               student.mist_id::text AS mist_id,
               null::bigint AS member_count
        FROM public.classroom_students membership
        JOIN public.users student ON student.id = membership.student_id
        WHERE membership.classroom_id = ${context.classroom_id}
          AND membership.enrollment_status = 'active'
          AND student.admin IS NOT TRUE
          AND student.trainer IS NOT TRUE
          AND student.is_pre_enrolled IS NOT TRUE
          AND (
            ${needle} = ''
            OR position(${needle} in lower(coalesce(student.full_name, ''))) > 0
            OR position(${needle} in lower(coalesce(student.email, ''))) > 0
            OR position(${needle} in lower(coalesce(student.mist_id::text, ''))) > 0
            OR student.id::text LIKE ${prefix}
          )
      ),
      team_choices AS (
        SELECT 'team'::text AS kind,
               team.id,
               team.name AS label,
               null::text AS email,
               null::text AS mist_id,
               COUNT(DISTINCT member.student_id) FILTER (
                 WHERE membership.enrollment_status = 'active'
                   AND member_profile.admin IS NOT TRUE
                   AND member_profile.trainer IS NOT TRUE
                   AND member_profile.is_pre_enrolled IS NOT TRUE
               ) AS member_count
        FROM public.trainer_teams team
        LEFT JOIN public.trainer_team_members member ON member.team_id = team.id
        LEFT JOIN public.classroom_students membership
          ON membership.classroom_id = team.classroom_id
         AND membership.student_id = member.student_id
        LEFT JOIN public.users member_profile ON member_profile.id = member.student_id
        WHERE team.classroom_id = ${context.classroom_id}
          AND (
            ${needle} = ''
            OR position(${needle} in lower(coalesce(team.name, ''))) > 0
            OR team.id::text LIKE ${prefix}
          )
        GROUP BY team.id, team.name
        HAVING COUNT(DISTINCT member.student_id) FILTER (
          WHERE membership.enrollment_status = 'active'
            AND member_profile.admin IS NOT TRUE
            AND member_profile.trainer IS NOT TRUE
            AND member_profile.is_pre_enrolled IS NOT TRUE
        ) > 0
      )
      SELECT *
      FROM (
        SELECT * FROM student_choices
        UNION ALL
        SELECT * FROM team_choices
      ) choice
      ORDER BY CASE WHEN kind = 'student' THEN 0 ELSE 1 END, label ASC NULLS LAST
      LIMIT 25
    `;
    return rows.map((row: any) => ({
      name: row.kind === 'team'
        ? discordChoiceName(`Team · ${safeLine(row.label, 'Team')} · ${Number(row.member_count || 0)} students · ${shortUuid(row.id)}`)
        : discordChoiceName(`Student · ${safeLine(row.label || row.email, 'Student')}${row.mist_id ? ` · ${row.mist_id}` : ''} · ${shortUuid(row.id)}`),
      value: row.kind === 'team' ? assignTeamRef(row.id) : assignStudentRef(row.id),
    }));
  }

  return [];
}

export async function prepareDiscordAssignModal(
  input: DiscordMccCommandInput,
  selection: { classRef?: string | null; targetRef?: string | null; platform?: string | null }
) {
  const resolved = await resolveDiscordCommandContext({ ...input, subcommand: 'assign' });
  if ('error' in resolved) {
    await auditDiscordCommand(input, 'rejected', resolved.context || null, { reason: resolved.status, modal: 'assign' });
    return { ok: false as const, content: resolved.error };
  }

  const context = resolved.context;
  if (!context.is_manager) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'trainer_required', modal: 'assign' });
    return { ok: false as const, content: 'Only classroom trainers can assign problems from Discord.' };
  }

  const platform = normalizeAssignPlatform(selection.platform);
  if (!platform) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'invalid_platform', modal: 'assign' });
    return { ok: false as const, content: 'Choose a supported platform: codeforces, codechef, atcoder, or custom.' };
  }

  const classResult = await findUniqueAssignableClass(context, selection.classRef);
  if ('error' in classResult) {
    await auditDiscordCommand(input, 'rejected', context, { reason: classResult.status, modal: 'assign', target: 'class' });
    return { ok: false as const, content: classResult.error };
  }

  const targetResult = await findUniqueAssignableTarget(context, selection.targetRef);
  if ('error' in targetResult) {
    await auditDiscordCommand(input, 'rejected', context, { reason: targetResult.status, modal: 'assign', target: 'student_or_team' });
    return { ok: false as const, content: targetResult.error };
  }

  return {
    ok: true as const,
    customId: `mcc:assign:${input.interactionId}:class:${shortUuid(classResult.classSession.id)}:${targetResult.target.type}:${shortUuid(targetResult.target.id)}:${platform}`,
    title: 'MCC assign problem',
  };
}

async function handleHelp(context: DiscordCommandContext) {
  const trainerLines = context.is_manager
    ? [
        'Trainer: `/mcc pending`, `/mcc review`, `/mcc assign`, `/mcc roster`, `/mcc reminders`, `/mcc reconcile`',
      ]
    : [];
  return [
    commandTitle(context, 'help'),
    'Use MCC commands inside mapped classroom Discord channels.',
    '',
    'Student: `/mcc today`, `/mcc schedule`, `/mcc problems`, `/mcc resources`, `/mcc status`, `/mcc checkin`, `/mcc submit`',
    ...trainerLines,
    'Tip: run `/mcc problems` first, then paste one displayed Ref into `/mcc submit`.',
  ].join('\n');
}

async function handleStatus(context: DiscordCommandContext) {
  const counts = await sql`
    SELECT COUNT(*) FILTER (WHERE kind = 'student_private' AND status = 'active') AS ready_student_channels,
           COUNT(*) FILTER (WHERE status = 'action_required') AS channel_errors,
           COUNT(*) FILTER (WHERE status = 'archived') AS archived_channels
    FROM mcc_private.classroom_discord_channels
    WHERE binding_id = ${context.binding_id}
  `;
  const jobs = await sql`
    SELECT COUNT(*) FILTER (WHERE status IN ('pending', 'retry', 'leased')) AS open_jobs,
           COUNT(*) FILTER (WHERE status = 'dead_letter') AS dead_letters
    FROM mcc_private.discord_delivery_jobs
    WHERE binding_id = ${context.binding_id}
  `;
  return [
    commandTitle(context, 'status'),
    `Server: ${safeLine(context.guild_name || context.guild_id, 'Discord server')}`,
    `Channel: ${formatStatus(context.channel_kind)}`,
    `Provisioning: ${formatStatus(context.provisioning_state)}`,
    `Health: ${formatStatus(context.installation_health || context.installation_status)}`,
    `Student channels ready: ${Number(counts[0]?.ready_student_channels || 0)}`,
    `Channel errors: ${Number(counts[0]?.channel_errors || 0)}`,
    `Open jobs: ${Number(jobs[0]?.open_jobs || 0)} · Dead letters: ${Number(jobs[0]?.dead_letters || 0)}`,
    context.action_required_reason ? `Action required: ${safeLine(context.action_required_reason, 'Check settings')}` : '',
    `Website: ${classroomUrl(context.classroom_id, 'settings')}`,
  ].filter(Boolean).join('\n');
}

async function handleSchedule(context: DiscordCommandContext) {
  const rows = await sql`
    SELECT id, name, scheduled_time, status, session_type, duration_minutes
    FROM public.classes
    WHERE classroom_id = ${context.classroom_id}
      AND scheduled_time >= now() - interval '2 hours'
    ORDER BY scheduled_time ASC
    LIMIT 6
  `;
  const lines = rows.map((row: any) => (
    `• ${safeLine(row.name, 'Class')} — ${formatDateTime(row.scheduled_time, context.timezone)} · ${formatStatus(row.status)}${row.duration_minutes ? ` · ${row.duration_minutes}m` : ''}`
  ));
  return [
    commandTitle(context, 'schedule'),
    linesOrEmpty(lines, 'No upcoming sessions are scheduled.'),
    `Open schedule: ${classroomUrl(context.classroom_id, 'schedule')}`,
  ].join('\n');
}

async function handleToday(context: DiscordCommandContext) {
  const sessions = await sql`
    SELECT id, name, scheduled_time, status, duration_minutes
    FROM public.classes
    WHERE classroom_id = ${context.classroom_id}
      AND (scheduled_time AT TIME ZONE ${context.timezone})::date = (now() AT TIME ZONE ${context.timezone})::date
    ORDER BY scheduled_time ASC
    LIMIT 6
  `;

  let dueLines: string[] = [];
  if (context.target_student_id) {
    const due = await sql`
      SELECT title, due_at, status, 'live' AS kind
      FROM public.class_problems problem
      JOIN public.classes class_session ON class_session.id = problem.class_id
      WHERE class_session.classroom_id = ${context.classroom_id}
        AND problem.student_id = ${context.target_student_id}
        AND problem.due_at IS NOT NULL
        AND (problem.due_at AT TIME ZONE ${context.timezone})::date = (now() AT TIME ZONE ${context.timezone})::date
        AND problem.status <> 'solved'
      ORDER BY problem.due_at ASC
      LIMIT 5
    `;
    dueLines = due.map((row: any) => `• ${safeLine(row.title, 'Problem')} — due ${formatDateTime(row.due_at, context.timezone)}`);
  } else if (context.is_manager) {
    const dueCounts = await sql`
      SELECT
        COUNT(*) FILTER (WHERE source = 'live') AS live_due,
        COUNT(*) FILTER (WHERE source = 'topic') AS topic_due
      FROM (
        SELECT 'live' AS source
        FROM public.class_problems problem
        JOIN public.classes class_session ON class_session.id = problem.class_id
        WHERE class_session.classroom_id = ${context.classroom_id}
          AND problem.due_at IS NOT NULL
          AND (problem.due_at AT TIME ZONE ${context.timezone})::date = (now() AT TIME ZONE ${context.timezone})::date
          AND problem.status <> 'solved'
        UNION ALL
        SELECT 'topic' AS source
        FROM public.classroom_team_topic_assignments assignment
        WHERE assignment.classroom_id = ${context.classroom_id}
          AND assignment.status = 'active'
          AND assignment.due_at IS NOT NULL
          AND (assignment.due_at AT TIME ZONE ${context.timezone})::date = (now() AT TIME ZONE ${context.timezone})::date
      ) due
    `;
    dueLines = [
      `• Live problem deadlines today: ${Number(dueCounts[0]?.live_due || 0)}`,
      `• Topic deadlines today: ${Number(dueCounts[0]?.topic_due || 0)}`,
    ];
  }

  const sessionLines = sessions.map((row: any) => (
    `• ${safeLine(row.name, 'Class')} — ${formatDateTime(row.scheduled_time, context.timezone)} · ${formatStatus(row.status)}`
  ));
  return [
    commandTitle(context, 'today'),
    `Timezone: ${context.timezone}`,
    '',
    '**Sessions**',
    linesOrEmpty(sessionLines, 'No sessions today.'),
    '',
    '**Deadlines**',
    linesOrEmpty(dueLines, 'No explicit deadlines today.'),
  ].join('\n');
}

async function handleProblems(context: DiscordCommandContext) {
  if (!context.target_student_id) {
    const rows = await sql`
      SELECT status, COUNT(*) AS count
      FROM public.class_problems problem
      JOIN public.classes class_session ON class_session.id = problem.class_id
      WHERE class_session.classroom_id = ${context.classroom_id}
      GROUP BY status
      ORDER BY status ASC
    `;
    const topicPending = await sql`
      SELECT COUNT(*) AS count
      FROM public.classroom_topic_problem_progress progress
      JOIN public.classroom_team_topic_assignments assignment ON assignment.id = progress.assignment_id
      WHERE assignment.classroom_id = ${context.classroom_id}
        AND progress.status = 'pending_approval'
    `;
    return [
      commandTitle(context, 'problems'),
      linesOrEmpty(rows.map((row: any) => `• Live ${formatStatus(row.status)}: ${Number(row.count || 0)}`), 'No live problems assigned yet.'),
      `• Topic pending review: ${Number(topicPending[0]?.count || 0)}`,
      `Open progress: ${classroomUrl(context.classroom_id, 'live')}`,
    ].join('\n');
  }

  const liveRows = await sql`
    SELECT problem.id,
           problem.title,
           problem.problem_link,
           problem.status,
           problem.due_at,
           class_session.name AS class_name
    FROM public.class_problems problem
    JOIN public.classes class_session ON class_session.id = problem.class_id
    WHERE class_session.classroom_id = ${context.classroom_id}
      AND problem.student_id = ${context.target_student_id}
      AND problem.status <> 'solved'
    ORDER BY problem.assigned_at DESC
    LIMIT 5
  `;
  const topicRows = await sql`
    SELECT assignment.id AS assignment_id,
           problem.id AS topic_problem_id,
           problem.title,
           problem.problem_link,
           topic.title AS topic_title,
           assignment.due_at,
           COALESCE(progress.status, 'not_solved') AS status
    FROM public.classroom_team_topic_assignments assignment
    JOIN public.classroom_topics topic ON topic.id = assignment.topic_id
    JOIN public.classroom_topic_problems problem ON problem.topic_id = topic.id
    LEFT JOIN public.classroom_topic_problem_progress progress
      ON progress.assignment_id = assignment.id
     AND progress.topic_problem_id = problem.id
     AND progress.student_id = ${context.target_student_id}
    WHERE assignment.classroom_id = ${context.classroom_id}
      AND assignment.status = 'active'
      AND (
        assignment.student_id = ${context.target_student_id}
        OR EXISTS (
          SELECT 1
          FROM public.trainer_team_members member
          WHERE member.team_id = assignment.team_id
            AND member.student_id = ${context.target_student_id}
        )
      )
      AND COALESCE(progress.status, 'not_solved') <> 'solved'
    ORDER BY assignment.assigned_at DESC, problem.position ASC
    LIMIT 5
  `;

  const liveLines = liveRows.map((row: any) => (
    `• ${safeLine(row.title, 'Problem')} · ${formatStatus(row.status)} · Ref \`${liveSubmitRef(row.id)}\`${row.due_at ? ` · due ${formatDateTime(row.due_at, context.timezone)}` : ''}`
  ));
  const topicLines = topicRows.map((row: any) => (
    `• ${safeLine(row.title, 'Topic problem')} · ${safeLine(row.topic_title, 'Topic')} · ${formatStatus(row.status)} · Ref \`${topicSubmitRef(row.assignment_id, row.topic_problem_id)}\`${row.due_at ? ` · due ${formatDateTime(row.due_at, context.timezone)}` : ''}`
  ));
  return [
    commandTitle(context, 'problems'),
    '**Live**',
    linesOrEmpty(liveLines, 'No open live problems.'),
    '',
    '**Topics**',
    linesOrEmpty(topicLines, 'No open topic problems.'),
    '',
    'Use `/mcc submit` and paste a Ref from above.',
  ].join('\n');
}

async function handleResources(context: DiscordCommandContext) {
  const classroomResources = await sql`
    SELECT title, url, created_at
    FROM public.classroom_resources
    WHERE classroom_id = ${context.classroom_id}
    ORDER BY created_at DESC
    LIMIT 4
  `;

  const topicResources = context.target_student_id
    ? await sql`
        SELECT resource.title, resource.url, topic.title AS topic_title, resource.created_at
        FROM public.classroom_team_topic_assignments assignment
        JOIN public.classroom_topics topic ON topic.id = assignment.topic_id
        JOIN public.classroom_topic_resources resource ON resource.topic_id = topic.id
        WHERE assignment.classroom_id = ${context.classroom_id}
          AND assignment.status = 'active'
          AND (
            assignment.student_id = ${context.target_student_id}
            OR EXISTS (
              SELECT 1
              FROM public.trainer_team_members member
              WHERE member.team_id = assignment.team_id
                AND member.student_id = ${context.target_student_id}
            )
          )
        ORDER BY resource.created_at DESC, resource.position ASC
        LIMIT 4
      `
    : await sql`
        SELECT resource.title, resource.url, topic.title AS topic_title, resource.created_at
        FROM public.classroom_topics topic
        JOIN public.classroom_topic_resources resource ON resource.topic_id = topic.id
        WHERE topic.classroom_id = ${context.classroom_id}
          AND topic.status <> 'archived'
        ORDER BY resource.created_at DESC, resource.position ASC
        LIMIT 4
      `;

  const classroomLines = classroomResources.map((row: any) => (
    `• ${safeLine(row.title, 'Resource')}${row.url ? ` — ${normalizeText(row.url, 120)}` : ''}`
  ));
  const topicLines = topicResources.map((row: any) => (
    `• ${safeLine(row.title, 'Resource')} · ${safeLine(row.topic_title, 'Topic')}${row.url ? ` — ${normalizeText(row.url, 120)}` : ''}`
  ));
  return [
    commandTitle(context, 'resources'),
    '**Classroom resources**',
    linesOrEmpty(classroomLines, 'No classroom resources yet.'),
    '',
    '**Topic resources**',
    linesOrEmpty(topicLines, 'No topic resources yet.'),
  ].join('\n');
}

async function handlePending(context: DiscordCommandContext) {
  if (!context.is_manager) {
    const live = await sql`
      SELECT COUNT(*) AS count
      FROM public.class_problems problem
      JOIN public.classes class_session ON class_session.id = problem.class_id
      WHERE class_session.classroom_id = ${context.classroom_id}
        AND problem.student_id = ${context.actor_user_id}
        AND problem.status = 'pending_approval'
    `;
    const topic = await sql`
      SELECT COUNT(*) AS count
      FROM public.classroom_topic_problem_progress progress
      JOIN public.classroom_team_topic_assignments assignment ON assignment.id = progress.assignment_id
      WHERE assignment.classroom_id = ${context.classroom_id}
        AND progress.student_id = ${context.actor_user_id}
        AND progress.status = 'pending_approval'
    `;
    return [
      commandTitle(context, 'pending'),
      `Your live submissions pending review: ${Number(live[0]?.count || 0)}`,
      `Your topic submissions pending review: ${Number(topic[0]?.count || 0)}`,
    ].join('\n');
  }

  const liveRows = await sql`
    SELECT problem.id,
           problem.title,
           user_profile.full_name AS student_name,
           problem.assigned_at
    FROM public.class_problems problem
    JOIN public.classes class_session ON class_session.id = problem.class_id
    LEFT JOIN public.users user_profile ON user_profile.id = problem.student_id
    WHERE class_session.classroom_id = ${context.classroom_id}
      AND problem.status = 'pending_approval'
    ORDER BY problem.assigned_at DESC
    LIMIT 5
  `;
  const topicRows = await sql`
    SELECT progress.id AS progress_id,
           topic_problem.title,
           topic.title AS topic_title,
           user_profile.full_name AS student_name,
           progress.updated_at
    FROM public.classroom_topic_problem_progress progress
    JOIN public.classroom_team_topic_assignments assignment ON assignment.id = progress.assignment_id
    JOIN public.classroom_topic_problems topic_problem ON topic_problem.id = progress.topic_problem_id
    JOIN public.classroom_topics topic ON topic.id = topic_problem.topic_id
    LEFT JOIN public.users user_profile ON user_profile.id = progress.student_id
    WHERE assignment.classroom_id = ${context.classroom_id}
      AND progress.status = 'pending_approval'
    ORDER BY progress.updated_at DESC
    LIMIT 5
  `;
  const liveLines = liveRows.map((row: any) => `• ${safeLine(row.title, 'Problem')} — ${safeLine(row.student_name, 'Student')} · Review Ref \`${liveSubmitRef(row.id)}\``);
  const topicLines = topicRows.map((row: any) => `• ${safeLine(row.title, 'Topic problem')} · ${safeLine(row.topic_title, 'Topic')} — ${safeLine(row.student_name, 'Student')} · Review Ref \`${topicReviewRef(row.progress_id)}\``);
  return [
    commandTitle(context, 'pending'),
    '**Live submissions**',
    linesOrEmpty(liveLines, 'No pending live submissions.'),
    '',
    '**Topic submissions**',
    linesOrEmpty(topicLines, 'No pending topic submissions.'),
    '',
    context.is_manager ? 'Use `/mcc review` and paste a Review Ref from above.' : '',
    `Open classroom: ${classroomUrl(context.classroom_id, 'live')}`,
  ].filter(Boolean).join('\n');
}

async function handleRoster(context: DiscordCommandContext) {
  if (!context.is_manager) return 'Only classroom trainers can view Discord roster state.';
  const summary = await sql`
    SELECT COUNT(*) AS total_students,
           COUNT(*) FILTER (WHERE membership.enrollment_status = 'active') AS active_students,
           COUNT(*) FILTER (WHERE connection.status = 'active') AS linked_students,
           COUNT(*) FILTER (WHERE connection.status = 'reauth_required') AS reconnect_required,
           COUNT(*) FILTER (WHERE channel.status = 'active') AS channel_ready,
           COUNT(*) FILTER (WHERE channel.status = 'action_required') AS provisioning_errors
    FROM public.classroom_students membership
    LEFT JOIN mcc_private.discord_user_connections connection
      ON connection.user_id = membership.student_id
     AND connection.status <> 'revoked'
    LEFT JOIN mcc_private.classroom_discord_channels channel
      ON channel.classroom_id = membership.classroom_id
     AND channel.student_id = membership.student_id
     AND channel.kind = 'student_private'
    WHERE membership.classroom_id = ${context.classroom_id}
  `;
  const needsAction = await sql`
    SELECT user_profile.full_name,
           user_profile.email,
           membership.enrollment_status,
           connection.status AS discord_status,
           channel.status AS channel_status
    FROM public.classroom_students membership
    JOIN public.users user_profile ON user_profile.id = membership.student_id
    LEFT JOIN mcc_private.discord_user_connections connection
      ON connection.user_id = membership.student_id
     AND connection.status <> 'revoked'
    LEFT JOIN mcc_private.classroom_discord_channels channel
      ON channel.classroom_id = membership.classroom_id
     AND channel.student_id = membership.student_id
     AND channel.kind = 'student_private'
    WHERE membership.classroom_id = ${context.classroom_id}
      AND (
        membership.enrollment_status <> 'active'
        OR connection.id IS NULL
        OR connection.status = 'reauth_required'
        OR channel.id IS NULL
        OR channel.status <> 'active'
      )
    ORDER BY membership.created_at DESC
    LIMIT 6
  `;
  const row = summary[0] || {};
  const actionLines = needsAction.map((item: any) => {
    const reason = item.enrollment_status !== 'active'
      ? formatStatus(item.enrollment_status)
      : !item.discord_status
        ? 'Discord link required'
        : item.discord_status === 'reauth_required'
          ? 'Reconnect required'
          : !item.channel_status
            ? 'Channel pending'
            : formatStatus(item.channel_status);
    return `• ${safeLine(item.full_name || item.email, 'Student')} — ${reason}`;
  });
  return [
    commandTitle(context, 'roster'),
    `Total: ${Number(row.total_students || 0)} · Active: ${Number(row.active_students || 0)}`,
    `Linked: ${Number(row.linked_students || 0)} · Reconnect: ${Number(row.reconnect_required || 0)}`,
    `Channel ready: ${Number(row.channel_ready || 0)} · Provisioning errors: ${Number(row.provisioning_errors || 0)}`,
    '',
    '**Needs action**',
    linesOrEmpty(actionLines, 'Roster looks clean.'),
    `Open settings: ${classroomUrl(context.classroom_id, 'settings')}`,
  ].join('\n');
}

async function handleReminders(context: DiscordCommandContext) {
  const rows = await sql`
    SELECT rule_type, enabled, local_time, offset_minutes, timezone
    FROM mcc_private.discord_notification_rules
    WHERE classroom_id = ${context.classroom_id}
    ORDER BY rule_type ASC
  `;
  const lines = rows.map((row: any) => (
    `• ${formatStatus(row.rule_type)} — ${row.enabled ? 'on' : 'off'} · ${formatRuleTime(row)} · ${safeLine(row.timezone, context.timezone)}`
  ));
  return [
    commandTitle(context, 'reminders'),
    linesOrEmpty(lines, 'No Discord reminder rules are configured.'),
    context.is_manager ? `Edit rules: ${classroomUrl(context.classroom_id, 'settings')}` : 'Reminder rules are managed by trainers.',
  ].join('\n');
}

async function handleReconcile(input: DiscordMccCommandInput, context: DiscordCommandContext) {
  if (!context.is_manager) return 'Only classroom trainers can queue Discord Repair.';
  const job = await enqueueDiscordDeliveryJob({
    classroomId: context.classroom_id,
    bindingId: context.binding_id,
    userId: context.actor_user_id,
    kind: 'reconcile_classroom',
    idempotencyKey: `discord-command:reconcile:${input.interactionId}`,
    payload: {
      classroomId: context.classroom_id,
      bindingId: context.binding_id,
      requestedBy: context.actor_user_id,
      source: 'discord',
      interactionId: input.interactionId,
    },
  });
  return [
    commandTitle(context, 'reconcile'),
    'Discord Repair has been queued. The worker will reconcile membership, permissions, categories, and channel overwrites.',
    `Job: ${job.id}`,
  ].join('\n');
}

export async function prepareDiscordSubmitModal(input: DiscordMccCommandInput) {
  const resolved = await resolveDiscordCommandContext({ ...input, subcommand: 'submit' });
  if ('error' in resolved) {
    await auditDiscordCommand(input, 'rejected', resolved.context || null, { reason: resolved.status, modal: 'submit' });
    return { ok: false as const, content: resolved.error };
  }

  if (!resolved.context.is_student_in_private_channel || !resolved.context.thread_id) {
    await auditDiscordCommand(input, 'rejected', resolved.context, { reason: 'student_private_channel_required', modal: 'submit' });
    return {
      ok: false as const,
      content: 'Only students can submit solutions from their own private MCC Discord channel.',
    };
  }

  return {
    ok: true as const,
    customId: `mcc:submit:${input.interactionId}`,
    title: 'MCC submit solution',
  };
}

async function submitLiveProblemFromDiscord(
  input: DiscordMccCommandInput,
  context: DiscordCommandContext,
  problemPrefix: string,
  fields: {
    solutionLink: string | null;
    solutionCode: string | null;
    submissionNotes: string | null;
  }
) {
  const targetResult = await findUniqueLiveSubmissionTarget(context, problemPrefix);
  if ('error' in targetResult) return targetResult;
  const target = targetResult.target;
  const threadId = context.thread_id || target.thread_id;
  if (!threadId) return { error: 'Your private Discord channel is not linked to a website thread yet. Ask your trainer to run Repair.', status: 409 as const };

  let threadEvent: Awaited<ReturnType<typeof appendDiscordStudentThreadSystemEventInTx>> | null = null;
  const updated = await sql.begin(async (tx) => {
    const rows = await tx`
      UPDATE public.class_problems problem
      SET status = 'pending_approval',
          solved_at = null,
          solution_link = COALESCE(${fields.solutionLink}, solution_link),
          solution_code = COALESCE(${fields.solutionCode}, solution_code),
          submission_notes = COALESCE(${fields.submissionNotes}, submission_notes)
      FROM public.classes class_session
      WHERE problem.id = ${target.id}
        AND class_session.id = problem.class_id
        AND class_session.classroom_id = ${context.classroom_id}
        AND problem.student_id = ${context.actor_user_id}
        AND problem.status <> 'solved'
      RETURNING problem.id, problem.title, problem.status
    `;
    if (rows.length === 0) return null;

    threadEvent = await appendDiscordStudentThreadSystemEventInTx(tx, {
      classroomId: context.classroom_id,
      threadId,
      studentId: context.actor_user_id,
      actorUserId: context.actor_user_id,
      eventType: 'student_solution_submitted',
      body: `Solution submitted from Discord for trainer review: ${safeLine(rows[0].title, 'Assigned problem')}.`,
      metadata: {
        source: 'live_problem',
        submission_origin: 'discord_command',
        class_problem_id: rows[0].id,
        problem_title: rows[0].title || '',
        has_solution_link: Boolean(fields.solutionLink),
        has_solution_code: Boolean(fields.solutionCode),
        has_submission_notes: Boolean(fields.submissionNotes),
      },
      clientMessageId: `discord-command:submit:${input.interactionId}`,
    });

    return rows[0];
  });

  if (!updated) return { error: 'That live problem is no longer open for student submission.', status: 400 as const };
  if (threadEvent?.inserted && threadEvent.messageId) {
    await publishDiscordStudentThreadSystemEvent({
      classroomId: threadEvent.classroomId,
      threadId: threadEvent.threadId,
      studentId: threadEvent.studentId,
      actorUserId: threadEvent.actorUserId,
      messageId: threadEvent.messageId,
    }).catch(() => false);
  }

  return {
    target: {
      kind: 'live_problem' as const,
      id: updated.id,
      title: updated.title,
    },
  };
}

async function submitTopicProblemFromDiscord(
  input: DiscordMccCommandInput,
  context: DiscordCommandContext,
  assignmentPrefix: string,
  topicProblemPrefix: string,
  fields: {
    solutionLink: string | null;
    solutionCode: string | null;
    submissionNotes: string | null;
  }
) {
  const targetResult = await findUniqueTopicSubmissionTarget(context, assignmentPrefix, topicProblemPrefix);
  if ('error' in targetResult) return targetResult;
  const target = targetResult.target;
  const threadId = context.thread_id || target.thread_id;
  if (!threadId) return { error: 'Your private Discord channel is not linked to a website thread yet. Ask your trainer to run Repair.', status: 409 as const };

  let threadEvent: Awaited<ReturnType<typeof appendDiscordStudentThreadSystemEventInTx>> | null = null;
  const updated = await sql.begin(async (tx) => {
    const rows = await tx`
      WITH target AS MATERIALIZED (
        SELECT assignment.id AS assignment_id,
               problem.id AS topic_problem_id,
               problem.title AS problem_title,
               topic.title AS topic_title
        FROM public.classroom_team_topic_assignments assignment
        JOIN public.classroom_topics topic ON topic.id = assignment.topic_id
        JOIN public.classroom_topic_problems problem
          ON problem.topic_id = topic.id
         AND problem.id = ${target.topic_problem_id}
        WHERE assignment.id = ${target.assignment_id}
          AND assignment.classroom_id = ${context.classroom_id}
          AND assignment.status = 'active'
          AND (
            assignment.student_id = ${context.actor_user_id}
            OR EXISTS (
              SELECT 1
              FROM public.trainer_team_members member
              WHERE member.team_id = assignment.team_id
                AND member.student_id = ${context.actor_user_id}
            )
          )
        LIMIT 1
      ),
      upserted AS (
        INSERT INTO public.classroom_topic_problem_progress AS progress (
          assignment_id,
          topic_problem_id,
          student_id,
          status,
          solution_link,
          solution_code,
          submission_notes,
          solved_at,
          updated_at
        )
        SELECT target.assignment_id,
               target.topic_problem_id,
               ${context.actor_user_id},
               'pending_approval',
               ${fields.solutionLink},
               ${fields.solutionCode},
               ${fields.submissionNotes},
               null,
               now()
        FROM target
        ON CONFLICT (assignment_id, topic_problem_id, student_id)
        DO UPDATE SET
          status = 'pending_approval',
          solution_link = COALESCE(EXCLUDED.solution_link, progress.solution_link),
          solution_code = COALESCE(EXCLUDED.solution_code, progress.solution_code),
          submission_notes = COALESCE(EXCLUDED.submission_notes, progress.submission_notes),
          solved_at = null,
          updated_at = now()
        WHERE progress.status <> 'solved'
        RETURNING *
      )
      SELECT upserted.id,
             upserted.assignment_id,
             upserted.topic_problem_id,
             target.problem_title,
             target.topic_title
      FROM upserted
      JOIN target ON true
    `;
    if (rows.length === 0) return null;

    threadEvent = await appendDiscordStudentThreadSystemEventInTx(tx, {
      classroomId: context.classroom_id,
      threadId,
      studentId: context.actor_user_id,
      actorUserId: context.actor_user_id,
      eventType: 'student_solution_submitted',
      body: `Topic solution submitted from Discord for trainer review: ${safeLine(rows[0].problem_title, 'Topic problem')}.`,
      metadata: {
        source: 'topic_problem',
        submission_origin: 'discord_command',
        progress_id: rows[0].id,
        assignment_id: rows[0].assignment_id,
        topic_problem_id: rows[0].topic_problem_id,
        topic_title: rows[0].topic_title || '',
        problem_title: rows[0].problem_title || '',
        has_solution_link: Boolean(fields.solutionLink),
        has_solution_code: Boolean(fields.solutionCode),
        has_submission_notes: Boolean(fields.submissionNotes),
      },
      clientMessageId: `discord-command:submit:${input.interactionId}`,
    });

    return rows[0];
  });

  if (!updated) return { error: 'That topic problem is no longer open for student submission.', status: 400 as const };
  if (threadEvent?.inserted && threadEvent.messageId) {
    await publishDiscordStudentThreadSystemEvent({
      classroomId: threadEvent.classroomId,
      threadId: threadEvent.threadId,
      studentId: threadEvent.studentId,
      actorUserId: threadEvent.actorUserId,
      messageId: threadEvent.messageId,
    }).catch(() => false);
  }

  return {
    target: {
      kind: 'topic_problem' as const,
      id: updated.id,
      title: updated.problem_title,
    },
  };
}

export async function submitDiscordSolution(
  input: DiscordMccCommandInput,
  fields: {
    reference?: string;
    solutionLink?: string;
    solutionCode?: string;
    submissionNotes?: string;
  }
) {
  const resolved = await resolveDiscordCommandContext({ ...input, subcommand: 'submit' });
  if ('error' in resolved) {
    await auditDiscordCommand(input, 'rejected', resolved.context || null, { reason: resolved.status, modal_submit: 'submit' });
    return { status: 'rejected' as CommandStatus, content: resolved.error };
  }

  const context = resolved.context;
  if (!context.is_student_in_private_channel || !context.thread_id) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'student_private_channel_required', modal_submit: 'submit' });
    return {
      status: 'rejected' as CommandStatus,
      content: 'Only students can submit solutions from their own private MCC Discord channel.',
    };
  }

  const reference = parseSubmitReference(fields.reference);
  if ('error' in reference) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'invalid_reference', modal_submit: 'submit' });
    return { status: 'rejected' as CommandStatus, content: reference.error };
  }

  const solutionLink = normalizeNullableText(fields.solutionLink, 1200);
  const rawCode = normalizeRawText(fields.solutionCode, 4000);
  const solutionCode = rawCode.trim() ? rawCode : null;
  const submissionNotes = normalizeNullableText(fields.submissionNotes, 1000);

  if (solutionLink && !isHttpUrl(solutionLink)) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'invalid_solution_link', modal_submit: 'submit' });
    return { status: 'rejected' as CommandStatus, content: 'Solution link must start with http:// or https://.' };
  }

  if (!solutionLink && !solutionCode) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'empty_submission', modal_submit: 'submit' });
    return { status: 'rejected' as CommandStatus, content: 'Add a solution link or paste code before submitting.' };
  }

  try {
    const result = reference.type === 'live_problem'
      ? await submitLiveProblemFromDiscord(input, context, reference.problemPrefix, {
          solutionLink,
          solutionCode,
          submissionNotes,
        })
      : await submitTopicProblemFromDiscord(input, context, reference.assignmentPrefix, reference.topicProblemPrefix, {
          solutionLink,
          solutionCode,
          submissionNotes,
        });

    if ('error' in result) {
      await auditDiscordCommand(input, 'rejected', context, {
        reason: result.status,
        modal_submit: 'submit',
        reference_type: reference.type,
      });
      return { status: 'rejected' as CommandStatus, content: result.error };
    }

    await auditDiscordCommand(input, 'accepted', context, {
      modal_submit: 'submit',
      reference_type: result.target.kind,
      target_id: result.target.id,
      has_solution_link: Boolean(solutionLink),
      has_solution_code: Boolean(solutionCode),
      has_submission_notes: Boolean(submissionNotes),
    });

    return {
      status: 'accepted' as CommandStatus,
      content: [
        commandTitle(context, 'submit'),
        `Submitted for trainer review: ${safeLine(result.target.title, 'Problem')}.`,
        'Status: pending approval.',
        `Website thread: ${classroomUrl(context.classroom_id, 'threads')}`,
      ].join('\n'),
    };
  } catch (error: any) {
    await auditDiscordCommand(input, 'failed', context, {
      modal_submit: 'submit',
      code: String(error?.status || error?.code || error?.name || 'unknown').slice(0, 80),
    });
    return {
      status: 'failed' as CommandStatus,
      content: 'MCC could not save that Discord submission. Please try again or submit from the website.',
    };
  }
}

export async function submitDiscordAssign(
  input: DiscordMccCommandInput,
  fields: {
    problemLink?: string;
    dueAt?: string;
    timerMinutes?: string;
    difficulty?: string;
    tags?: string;
  },
  selection: DiscordAssignSelection
) {
  const resolved = await resolveDiscordCommandContext({ ...input, subcommand: 'assign' });
  if ('error' in resolved) {
    await auditDiscordCommand(input, 'rejected', resolved.context || null, { reason: resolved.status, modal_submit: 'assign' });
    return { status: 'rejected' as CommandStatus, content: resolved.error };
  }

  const context = resolved.context;
  if (!context.is_manager) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'trainer_required', modal_submit: 'assign' });
    return { status: 'rejected' as CommandStatus, content: 'Only classroom trainers can assign problems from Discord.' };
  }

  const platform = normalizeAssignPlatform(selection.platform);
  if (!platform) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'invalid_platform', modal_submit: 'assign' });
    return { status: 'rejected' as CommandStatus, content: 'Choose a supported platform: codeforces, codechef, atcoder, or custom.' };
  }

  const classResult = await findUniqueAssignableClass(context, selection.classRef);
  if ('error' in classResult) {
    await auditDiscordCommand(input, 'rejected', context, { reason: classResult.status, modal_submit: 'assign', target: 'class' });
    return { status: 'rejected' as CommandStatus, content: classResult.error };
  }

  const targetResult = await findUniqueAssignableTarget(context, selection.targetRef);
  if ('error' in targetResult) {
    await auditDiscordCommand(input, 'rejected', context, { reason: targetResult.status, modal_submit: 'assign', target: 'student_or_team' });
    return { status: 'rejected' as CommandStatus, content: targetResult.error };
  }

  const problemLink = normalizeText(fields.problemLink, 1200);
  if (!problemLink) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'missing_problem_link', modal_submit: 'assign' });
    return { status: 'rejected' as CommandStatus, content: 'Problem link is required.' };
  }

  const metadata = deriveDiscordProblemMetadata(platform, problemLink);
  if ('error' in metadata) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'invalid_problem_link', modal_submit: 'assign', platform });
    return { status: 'rejected' as CommandStatus, content: metadata.error };
  }

  const dueAt = normalizeAssignDueAt(fields.dueAt);
  if ('error' in dueAt) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'invalid_due_at', modal_submit: 'assign' });
    return { status: 'rejected' as CommandStatus, content: dueAt.error };
  }

  const timerMinutes = normalizeAssignPositiveInteger(fields.timerMinutes);
  if ('error' in timerMinutes) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'invalid_timer_minutes', modal_submit: 'assign' });
    return { status: 'rejected' as CommandStatus, content: timerMinutes.error };
  }

  const difficulty = normalizeText(fields.difficulty, 80);
  const tags = normalizeAssignProblemTags(fields.tags);
  const target = targetResult.target;
  const classSession = classResult.classSession;
  const idempotencyInteractionId = normalizeText(selection.sourceInteractionId || input.interactionId, 40);
  const threadEvents: NonNullable<Awaited<ReturnType<typeof appendDiscordStudentThreadSystemEventInTx>>>[] = [];

  try {
    const mutation = await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`discord:assign:${idempotencyInteractionId}`}, 0))`;

      const existing = await tx`
        SELECT metadata
        FROM mcc_private.discord_command_audit
        WHERE interaction_id = ${idempotencyInteractionId}
          AND command_name = ${input.commandName}
          AND status = 'accepted'
          AND metadata->>'modal_submit' = 'assign'
        ORDER BY created_at DESC
        LIMIT 1
      `;
      if (existing.length > 0) {
        const existingMetadata = existing[0].metadata && typeof existing[0].metadata === 'object'
          ? existing[0].metadata
          : {};
        return {
          duplicate: true,
          assignedCount: Number(existingMetadata.assigned_count || 0),
          notifiedCount: Number(existingMetadata.notified_count || 0),
          assignedProblemIds: Array.isArray(existingMetadata.assigned_problem_ids)
            ? existingMetadata.assigned_problem_ids
            : [],
        };
      }

      await ensureDiscordProblemTagsInTx(tx, tags, context.actor_user_id);

      const uniqueStudentIds = [...new Set(target.studentIds)];
      const assignedProblems = await tx`
        INSERT INTO public.class_problems ${tx(
          uniqueStudentIds.map((studentId) => ({
            class_id: classSession.id,
            student_id: studentId,
            platform,
            problem_link: problemLink,
            title: metadata.title,
            difficulty,
            points: metadata.details,
            timer_minutes: timerMinutes.value,
            due_at: dueAt.value,
            tags,
          }))
        )}
        RETURNING id, class_id, student_id, platform, problem_link, title, difficulty, points, timer_minutes, due_at, tags, assigned_at
      `;

      const channelRows = await tx`
        SELECT student_id, channel_id, thread_id
        FROM mcc_private.classroom_discord_channels
        WHERE classroom_id = ${context.classroom_id}
          AND kind = 'student_private'
          AND status = 'active'
          AND student_id = ANY(${uniqueStudentIds})
      `;
      const channelByStudent = new Map(channelRows.map((row: any) => [row.student_id, row]));

      const threadRows = await tx`
        SELECT id, student_id
        FROM public.classroom_student_threads
        WHERE classroom_id = ${context.classroom_id}
          AND status = 'active'
          AND student_id = ANY(${uniqueStudentIds})
      `;
      const threadByStudent = new Map(threadRows.map((row: any) => [row.student_id, row.id]));

      let notifiedCount = 0;
      for (const problem of assignedProblems) {
        const channel = channelByStudent.get(problem.student_id);
        if (channel?.channel_id) {
          const dueLine = problem.due_at ? `Due: ${formatDateTime(problem.due_at, context.timezone)}` : '';
          const timerLine = problem.timer_minutes ? `Timer: ${problem.timer_minutes} minutes` : '';
          await enqueueDiscordDeliveryJob({
            classroomId: context.classroom_id,
            bindingId: context.binding_id,
            userId: context.actor_user_id,
            kind: 'send_notification',
            idempotencyKey: `discord-command:assign:${idempotencyInteractionId}:${problem.id}`,
            tx,
            payload: {
              channelId: channel.channel_id,
              content: capDiscordContent([
                `**New MCC assignment · ${safeLine(classSession.name, 'Class')}**`,
                `Problem: ${safeLine(problem.title, 'Problem')}`,
                `Platform: ${platform}`,
                problem.difficulty ? `Difficulty: ${safeLine(problem.difficulty, 'Selected')}` : '',
                dueLine,
                timerLine,
                `Link: ${problem.problem_link}`,
                'When you are ready, run `/mcc problems` and submit the displayed Ref with `/mcc submit`.',
              ].filter(Boolean).join('\n')),
            },
          });
          notifiedCount += 1;
        }

        const threadId = threadByStudent.get(problem.student_id) || channel?.thread_id;
        if (threadId) {
          const event = await appendDiscordStudentThreadSystemEventInTx(tx, {
            classroomId: context.classroom_id,
            threadId,
            studentId: problem.student_id,
            actorUserId: context.actor_user_id,
            eventType: 'trainer_problem_added',
            body: `Trainer assigned a new problem from Discord: ${safeLine(problem.title, 'Practice problem')}.`,
            metadata: {
              source: 'live_problem',
              assignment_origin: 'discord_command',
              class_problem_id: problem.id,
              class_id: classSession.id,
              problem_title: problem.title || '',
              platform,
              difficulty: problem.difficulty || '',
              has_due_at: Boolean(problem.due_at),
              has_timer: Boolean(problem.timer_minutes),
            },
            clientMessageId: `discord-command:assign:${idempotencyInteractionId}:${problem.id}`,
          });
          if (event) threadEvents.push(event);
        }
      }

      await auditDiscordCommandInTx(
        tx,
        { ...input, interactionId: idempotencyInteractionId, subcommand: 'assign' },
        'accepted',
        context,
        {
          modal_submit: 'assign',
          modal_interaction_id: input.interactionId,
          class_id: classSession.id,
          target_type: target.type,
          target_id: target.id,
          target_student_count: uniqueStudentIds.length,
          assigned_problem_ids: assignedProblems.map((problem: any) => problem.id),
          assigned_count: assignedProblems.length,
          notified_count: notifiedCount,
          platform,
          has_due_at: Boolean(dueAt.value),
          has_timer: Boolean(timerMinutes.value),
          tag_count: tags.length,
        }
      );

      return {
        duplicate: false,
        assignedCount: assignedProblems.length,
        notifiedCount,
        assignedProblemIds: assignedProblems.map((problem: any) => problem.id),
      };
    });

    for (const event of threadEvents) {
      if (!event.inserted || !event.messageId) continue;
      await publishDiscordStudentThreadSystemEvent({
        classroomId: event.classroomId,
        threadId: event.threadId,
        studentId: event.studentId,
        actorUserId: event.actorUserId,
        messageId: event.messageId,
      }).catch(() => false);
    }

    const duplicateLine = mutation.duplicate ? 'This Discord assignment was already saved; I did not create duplicates.' : '';
    return {
      status: 'accepted' as CommandStatus,
      content: [
        commandTitle(context, 'assign'),
        duplicateLine,
        `Assigned ${mutation.assignedCount} live ${mutation.assignedCount === 1 ? 'problem' : 'problems'} to ${safeLine(target.label, 'target')}.`,
        `Discord notifications queued for ${mutation.notifiedCount} private ${mutation.notifiedCount === 1 ? 'channel' : 'channels'}.`,
        mutation.notifiedCount < mutation.assignedCount ? 'Some students may need Discord linking or Repair before they receive channel notifications.' : '',
        `Open classroom: ${classroomUrl(context.classroom_id, 'live')}`,
      ].filter(Boolean).join('\n'),
    };
  } catch (error: any) {
    await auditDiscordCommand(input, 'failed', context, {
      modal_submit: 'assign',
      code: String(error?.status || error?.code || error?.name || 'unknown').slice(0, 80),
    });
    return {
      status: 'failed' as CommandStatus,
      content: 'MCC could not save that Discord assignment. Please try again or assign from the website.',
    };
  }
}

export async function prepareDiscordReviewModal(input: DiscordMccCommandInput) {
  const resolved = await resolveDiscordCommandContext({ ...input, subcommand: 'review' });
  if ('error' in resolved) {
    await auditDiscordCommand(input, 'rejected', resolved.context || null, { reason: resolved.status, modal: 'review' });
    return { ok: false as const, content: resolved.error };
  }

  if (!resolved.context.is_manager) {
    await auditDiscordCommand(input, 'rejected', resolved.context, { reason: 'trainer_required', modal: 'review' });
    return {
      ok: false as const,
      content: 'Only classroom trainers can review submissions from Discord.',
    };
  }

  return {
    ok: true as const,
    customId: `mcc:review:${input.interactionId}`,
    title: 'MCC review submission',
  };
}

async function findUniqueLiveReviewTarget(context: DiscordCommandContext, problemPrefix: string) {
  const rows = await sql`
    SELECT problem.id,
           problem.title,
           problem.student_id,
           thread.id AS thread_id
    FROM public.class_problems problem
    JOIN public.classes class_session ON class_session.id = problem.class_id
    JOIN public.classroom_student_threads thread
      ON thread.classroom_id = class_session.classroom_id
     AND thread.student_id = problem.student_id
     AND thread.status = 'active'
    WHERE class_session.classroom_id = ${context.classroom_id}
      AND problem.status = 'pending_approval'
      AND problem.id::text LIKE ${`${problemPrefix}%`}
    ORDER BY problem.assigned_at DESC
    LIMIT 2
  `;
  if (rows.length === 0) return { error: 'I could not find that pending live review reference.', status: 404 as const };
  if (rows.length > 1) return { error: 'That live review reference is ambiguous. Run `/mcc pending` and paste the full displayed Review Ref.', status: 400 as const };
  return { target: rows[0] };
}

async function findUniqueTopicReviewTarget(context: DiscordCommandContext, progressPrefix: string) {
  const rows = await sql`
    SELECT progress.id AS progress_id,
           progress.assignment_id,
           progress.topic_problem_id,
           progress.student_id,
           topic_problem.title AS problem_title,
           topic.title AS topic_title,
           thread.id AS thread_id
    FROM public.classroom_topic_problem_progress progress
    JOIN public.classroom_team_topic_assignments assignment ON assignment.id = progress.assignment_id
    JOIN public.classroom_topics topic ON topic.id = assignment.topic_id
    JOIN public.classroom_topic_problems topic_problem
      ON topic_problem.id = progress.topic_problem_id
     AND topic_problem.topic_id = topic.id
    JOIN public.classroom_student_threads thread
      ON thread.classroom_id = assignment.classroom_id
     AND thread.student_id = progress.student_id
     AND thread.status = 'active'
    WHERE assignment.classroom_id = ${context.classroom_id}
      AND assignment.status = 'active'
      AND progress.status = 'pending_approval'
      AND progress.id::text LIKE ${`${progressPrefix}%`}
    ORDER BY progress.updated_at DESC
    LIMIT 2
  `;
  if (rows.length === 0) return { error: 'I could not find that pending topic review reference.', status: 404 as const };
  if (rows.length > 1) return { error: 'That topic review reference is ambiguous. Run `/mcc pending` and paste the full displayed Review Ref.', status: 400 as const };
  return { target: rows[0] };
}

async function reviewLiveProblemFromDiscord(
  input: DiscordMccCommandInput,
  context: DiscordCommandContext,
  problemPrefix: string,
  review: { status: 'solved' | 'tried'; verb: string },
  feedbackText: string | null
) {
  const targetResult = await findUniqueLiveReviewTarget(context, problemPrefix);
  if ('error' in targetResult) return targetResult;
  const target = targetResult.target;
  const solvedAt = review.status === 'solved' ? new Date().toISOString() : null;
  let threadEvent: Awaited<ReturnType<typeof appendDiscordStudentThreadSystemEventInTx>> | null = null;

  const updated = await sql.begin(async (tx) => {
    const rows = await tx`
      UPDATE public.class_problems problem
      SET status = ${review.status},
          solved_at = ${solvedAt}::timestamptz,
          submission_notes = CASE
            WHEN ${feedbackText}::text IS NULL THEN submission_notes
            ELSE COALESCE(submission_notes || E'\n[Trainer Notes]: ', '') || ${feedbackText}::text
          END
      FROM public.classes class_session
      WHERE problem.id = ${target.id}
        AND class_session.id = problem.class_id
        AND class_session.classroom_id = ${context.classroom_id}
        AND problem.status = 'pending_approval'
      RETURNING problem.id, problem.title, problem.student_id, problem.status
    `;
    if (rows.length === 0) return null;

    const feedbackLines = [`Trainer ${review.verb} ${safeLine(rows[0].title, 'this solution')}.`];
    if (feedbackText) feedbackLines.push(`Feedback: ${feedbackText}`);
    threadEvent = await appendDiscordStudentThreadSystemEventInTx(tx, {
      classroomId: context.classroom_id,
      threadId: target.thread_id,
      studentId: rows[0].student_id,
      actorUserId: context.actor_user_id,
      eventType: feedbackText ? 'trainer_feedback' : 'solution_status_changed',
      body: feedbackLines.join('\n\n'),
      metadata: {
        source: 'live_problem',
        review_origin: 'discord_command',
        class_problem_id: rows[0].id,
        problem_title: rows[0].title || '',
        status: rows[0].status,
        has_feedback: Boolean(feedbackText),
      },
      clientMessageId: `discord-command:review:${input.interactionId}`,
    });
    return rows[0];
  });

  if (!updated) return { error: 'That live submission is no longer pending review.', status: 400 as const };
  if (threadEvent?.inserted && threadEvent.messageId) {
    await publishDiscordStudentThreadSystemEvent({
      classroomId: threadEvent.classroomId,
      threadId: threadEvent.threadId,
      studentId: threadEvent.studentId,
      actorUserId: threadEvent.actorUserId,
      messageId: threadEvent.messageId,
    }).catch(() => false);
  }

  return {
    target: {
      kind: 'live_problem' as const,
      id: updated.id,
      title: updated.title,
      status: updated.status,
    },
  };
}

async function reviewTopicProblemFromDiscord(
  input: DiscordMccCommandInput,
  context: DiscordCommandContext,
  progressPrefix: string,
  review: { status: 'solved' | 'tried'; verb: string },
  feedbackText: string | null
) {
  const targetResult = await findUniqueTopicReviewTarget(context, progressPrefix);
  if ('error' in targetResult) return targetResult;
  const target = targetResult.target;
  const solvedAt = review.status === 'solved' ? new Date().toISOString() : null;
  let threadEvent: Awaited<ReturnType<typeof appendDiscordStudentThreadSystemEventInTx>> | null = null;

  const updated = await sql.begin(async (tx) => {
    const rows = await tx`
      UPDATE public.classroom_topic_problem_progress progress
      SET status = ${review.status},
          solved_at = ${solvedAt}::timestamptz,
          submission_notes = CASE
            WHEN ${feedbackText}::text IS NULL THEN submission_notes
            ELSE COALESCE(submission_notes || E'\n[Trainer Notes]: ', '') || ${feedbackText}::text
          END,
          updated_at = now()
      FROM public.classroom_team_topic_assignments assignment,
           public.classroom_topic_problems topic_problem,
           public.classroom_topics topic
      WHERE progress.id = ${target.progress_id}
        AND assignment.id = progress.assignment_id
        AND assignment.classroom_id = ${context.classroom_id}
        AND assignment.status = 'active'
        AND topic.id = assignment.topic_id
        AND topic_problem.id = progress.topic_problem_id
        AND topic_problem.topic_id = topic.id
        AND progress.status = 'pending_approval'
      RETURNING progress.id,
                progress.assignment_id,
                progress.topic_problem_id,
                progress.student_id,
                progress.status,
                topic_problem.title AS problem_title,
                topic.title AS topic_title
    `;
    if (rows.length === 0) return null;

    const feedbackLines = [`Trainer ${review.verb} ${safeLine(rows[0].problem_title, 'this topic solution')}.`];
    if (feedbackText) feedbackLines.push(`Feedback: ${feedbackText}`);
    threadEvent = await appendDiscordStudentThreadSystemEventInTx(tx, {
      classroomId: context.classroom_id,
      threadId: target.thread_id,
      studentId: rows[0].student_id,
      actorUserId: context.actor_user_id,
      eventType: feedbackText ? 'trainer_feedback' : 'solution_status_changed',
      body: feedbackLines.join('\n\n'),
      metadata: {
        source: 'topic_problem',
        review_origin: 'discord_command',
        progress_id: rows[0].id,
        assignment_id: rows[0].assignment_id,
        topic_problem_id: rows[0].topic_problem_id,
        topic_title: rows[0].topic_title || '',
        problem_title: rows[0].problem_title || '',
        status: rows[0].status,
        has_feedback: Boolean(feedbackText),
      },
      clientMessageId: `discord-command:review:${input.interactionId}`,
    });
    return rows[0];
  });

  if (!updated) return { error: 'That topic submission is no longer pending review.', status: 400 as const };
  if (threadEvent?.inserted && threadEvent.messageId) {
    await publishDiscordStudentThreadSystemEvent({
      classroomId: threadEvent.classroomId,
      threadId: threadEvent.threadId,
      studentId: threadEvent.studentId,
      actorUserId: threadEvent.actorUserId,
      messageId: threadEvent.messageId,
    }).catch(() => false);
  }

  return {
    target: {
      kind: 'topic_problem' as const,
      id: updated.id,
      title: updated.problem_title,
      status: updated.status,
    },
  };
}

export async function submitDiscordReview(
  input: DiscordMccCommandInput,
  fields: {
    reference?: string;
    action?: string;
    feedback?: string;
  }
) {
  const resolved = await resolveDiscordCommandContext({ ...input, subcommand: 'review' });
  if ('error' in resolved) {
    await auditDiscordCommand(input, 'rejected', resolved.context || null, { reason: resolved.status, modal_submit: 'review' });
    return { status: 'rejected' as CommandStatus, content: resolved.error };
  }

  const context = resolved.context;
  if (!context.is_manager) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'trainer_required', modal_submit: 'review' });
    return { status: 'rejected' as CommandStatus, content: 'Only classroom trainers can review submissions from Discord.' };
  }

  const reference = parseReviewReference(fields.reference);
  if ('error' in reference) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'invalid_reference', modal_submit: 'review' });
    return { status: 'rejected' as CommandStatus, content: reference.error };
  }

  const review = normalizeReviewAction(fields.action);
  if ('error' in review) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'invalid_action', modal_submit: 'review' });
    return { status: 'rejected' as CommandStatus, content: review.error };
  }

  const feedbackText = normalizeNullableText(fields.feedback, 1000);

  try {
    const result = reference.type === 'live_problem'
      ? await reviewLiveProblemFromDiscord(input, context, reference.problemPrefix, review, feedbackText)
      : await reviewTopicProblemFromDiscord(input, context, reference.progressPrefix, review, feedbackText);

    if ('error' in result) {
      await auditDiscordCommand(input, 'rejected', context, {
        reason: result.status,
        modal_submit: 'review',
        reference_type: reference.type,
      });
      return { status: 'rejected' as CommandStatus, content: result.error };
    }

    await auditDiscordCommand(input, 'accepted', context, {
      modal_submit: 'review',
      reference_type: result.target.kind,
      target_id: result.target.id,
      status: result.target.status,
      has_feedback: Boolean(feedbackText),
    });

    return {
      status: 'accepted' as CommandStatus,
      content: [
        commandTitle(context, 'review'),
        `Review saved: ${safeLine(result.target.title, 'Problem')} → ${formatStatus(result.target.status)}.`,
        `Open classroom: ${classroomUrl(context.classroom_id, 'live')}`,
      ].join('\n'),
    };
  } catch (error: any) {
    await auditDiscordCommand(input, 'failed', context, {
      modal_submit: 'review',
      code: String(error?.status || error?.code || error?.name || 'unknown').slice(0, 80),
    });
    return {
      status: 'failed' as CommandStatus,
      content: 'MCC could not save that Discord review. Please try again or review from the website.',
    };
  }
}

function handleScaffold(context: DiscordCommandContext, subcommand: string) {
  const trainerOnly = new Set(['review']);
  if (trainerOnly.has(subcommand) && !context.is_manager) {
    return 'Only classroom trainers can use that command.';
  }
  if (subcommand === 'checkin' || subcommand === 'submit') {
    return [
      commandTitle(context, subcommand),
      `Use \`/mcc ${subcommand}\` again inside your private MCC Discord channel to open the secure modal.`,
      `Open classroom: ${classroomUrl(context.classroom_id, 'threads')}`,
    ].join('\n');
  }
  if (subcommand === 'assign') {
    if (!context.is_manager) return 'Only classroom trainers can assign problems from Discord.';
    return [
      commandTitle(context, subcommand),
      'Use `/mcc assign` with Class, Target, and Platform options. Discord will open a modal for the problem link, deadline, timer, difficulty, and tags.',
      `Open classroom: ${classroomUrl(context.classroom_id, 'live')}`,
    ].join('\n');
  }
  return [
    commandTitle(context, subcommand),
    `/${subcommand} is registered, but this mutation workflow still opens on the website in the current build.`,
    `Open classroom: ${classroomUrl(context.classroom_id, subcommand === 'review' ? 'live' : 'threads')}`,
  ].join('\n');
}

async function executeResolvedCommand(input: DiscordMccCommandInput, context: DiscordCommandContext) {
  switch (input.subcommand) {
    case 'help':
      return handleHelp(context);
    case 'status':
      return handleStatus(context);
    case 'today':
      return handleToday(context);
    case 'schedule':
      return handleSchedule(context);
    case 'problems':
      return handleProblems(context);
    case 'resources':
      return handleResources(context);
    case 'pending':
      return handlePending(context);
    case 'roster':
      return handleRoster(context);
    case 'reminders':
      return handleReminders(context);
    case 'reconcile':
      return handleReconcile(input, context);
    case 'checkin':
    case 'submit':
    case 'review':
    case 'assign':
      return handleScaffold(context, input.subcommand);
    default:
      return handleHelp(context);
  }
}

export async function executeDiscordMccCommand(input: DiscordMccCommandInput) {
  const resolved = await resolveDiscordCommandContext(input);
  if ('error' in resolved) {
    await auditDiscordCommand(input, 'rejected', resolved.context || null, { reason: resolved.status });
    return { status: 'rejected' as CommandStatus, content: resolved.error };
  }

  try {
    const content = await executeResolvedCommand(input, resolved.context);
    await auditDiscordCommand(input, 'accepted', resolved.context);
    return { status: 'accepted' as CommandStatus, content: capDiscordContent(content) };
  } catch (error: any) {
    await auditDiscordCommand(input, 'failed', resolved.context, {
      code: String(error?.status || error?.code || error?.name || 'unknown').slice(0, 80),
    });
    return {
      status: 'failed' as CommandStatus,
      content: 'MCC could not complete that Discord command. Please try again or open the classroom website.',
    };
  }
}

export async function prepareDiscordCheckinModal(input: DiscordMccCommandInput) {
  const resolved = await resolveDiscordCommandContext({ ...input, subcommand: 'checkin' });
  if ('error' in resolved) {
    await auditDiscordCommand(input, 'rejected', resolved.context || null, { reason: resolved.status, modal: 'checkin' });
    return { ok: false as const, content: resolved.error };
  }

  if (!resolved.context.is_student_in_private_channel) {
    await auditDiscordCommand(input, 'rejected', resolved.context, { reason: 'student_private_channel_required', modal: 'checkin' });
    return {
      ok: false as const,
      content: 'Only students can submit check-ins from their own private MCC Discord channel.',
    };
  }

  return {
    ok: true as const,
    customId: `mcc:checkin:${input.interactionId}`,
    title: 'MCC daily check-in',
  };
}

export async function submitDiscordCheckin(
  input: DiscordMccCommandInput,
  fields: {
    goals?: string;
    completedWork?: string;
    blockers?: string;
    nextSteps?: string;
  }
) {
  const resolved = await resolveDiscordCommandContext({ ...input, subcommand: 'checkin' });
  if ('error' in resolved) {
    await auditDiscordCommand(input, 'rejected', resolved.context || null, { reason: resolved.status, modal_submit: 'checkin' });
    return { status: 'rejected' as CommandStatus, content: resolved.error };
  }

  const context = resolved.context;
  if (!context.is_student_in_private_channel) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'student_private_channel_required', modal_submit: 'checkin' });
    return {
      status: 'rejected' as CommandStatus,
      content: 'Only students can submit check-ins from their own private MCC Discord channel.',
    };
  }

  const goals = normalizeText(fields.goals, 2000);
  const completedWork = normalizeText(fields.completedWork, 2000);
  const blockers = normalizeText(fields.blockers, 2000);
  const nextSteps = normalizeText(fields.nextSteps, 2000);
  if (!goals && !completedWork && !blockers && !nextSteps) {
    await auditDiscordCommand(input, 'rejected', context, { reason: 'empty_checkin', modal_submit: 'checkin' });
    return {
      status: 'rejected' as CommandStatus,
      content: 'Add at least one check-in field before submitting.',
    };
  }

  const local = localDateParts(context.timezone);
  const period = local.hour >= 18 ? 'end_of_day' : 'morning';
  const rows = await sql`
    INSERT INTO mcc_private.classroom_daily_checkins (
      classroom_id,
      student_id,
      source,
      period,
      checkin_date,
      channel_id,
      goals,
      completed_work,
      blockers,
      next_steps
    )
    VALUES (
      ${context.classroom_id},
      ${context.actor_user_id},
      'discord',
      ${period},
      ${local.date}::date,
      ${input.channelId},
      ${goals || null},
      ${completedWork || null},
      ${blockers || null},
      ${nextSteps || null}
    )
    ON CONFLICT (classroom_id, student_id, checkin_date, period) DO UPDATE SET
      source = 'discord',
      channel_id = EXCLUDED.channel_id,
      goals = EXCLUDED.goals,
      completed_work = EXCLUDED.completed_work,
      blockers = EXCLUDED.blockers,
      next_steps = EXCLUDED.next_steps,
      submitted_at = now(),
      updated_at = now()
    RETURNING id, period, checkin_date, submitted_at
  `;

  await auditDiscordCommand(input, 'accepted', context, {
    modal_submit: 'checkin',
    period,
    checkin_date: local.date,
  });

  return {
    status: 'accepted' as CommandStatus,
    content: [
      commandTitle(context, 'checkin'),
      `Saved your ${period === 'end_of_day' ? 'end-of-day' : 'morning'} check-in for ${formatDateTime(rows[0]?.checkin_date, context.timezone, 'date')}.`,
      `Open classroom: ${classroomUrl(context.classroom_id, 'settings')}`,
    ].join('\n'),
  };
}
