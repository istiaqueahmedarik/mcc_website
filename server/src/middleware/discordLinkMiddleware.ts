import { MiddlewareHandler } from 'hono';
import sql from '../db';
import {
  getAppBaseUrl,
  getDiscordEnforcementMode,
  isDiscordIntegrationEnabled,
} from '../utils/discordConfig';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DIRECT_CLASSROOM_STATIC_SEGMENTS = new Set([
  '',
  'admin',
  'assign-problem',
  'assign-problems',
  'class',
  'create',
  'discord',
  'list',
  'problem',
  'problem-preview',
  'problem-tags',
]);

async function shouldRequireDiscordLink(userId: string) {
  if (!isDiscordIntegrationEnabled()) return false;
  const mode = getDiscordEnforcementMode();
  if (mode === 'off') return false;
  if (mode === 'all') return true;

  const startedAt = process.env.DISCORD_LINK_ENFORCEMENT_STARTED_AT;
  if (!startedAt) return true;
  const rows = await sql`
    SELECT created_at
    FROM public.users
    WHERE id = ${userId}
    LIMIT 1
  `;
  const createdAt = new Date(rows[0]?.created_at || 0).getTime();
  const cutoff = new Date(startedAt).getTime();
  if (!Number.isFinite(createdAt) || !Number.isFinite(cutoff)) return true;
  return createdAt >= cutoff;
}

async function hasActiveDiscordLink(userId: string) {
  const rows = await sql`
    SELECT 1
    FROM mcc_private.discord_user_connections
    WHERE user_id = ${userId}
      AND status = 'active'
    LIMIT 1
  `;
  return rows.length > 0;
}

async function resolveClassroomIdFromRequestPath(pathname: string) {
  const relative = pathname.replace(/^\/classroom\/?/, '');
  const parts = relative.split('/').filter(Boolean);
  const first = parts[0] || '';

  if (UUID_REGEX.test(first) && !DIRECT_CLASSROOM_STATIC_SEGMENTS.has(first)) return first;

  if (first === 'class' && UUID_REGEX.test(parts[1] || '')) {
    const rows = await sql`
      SELECT classroom_id
      FROM public.classes
      WHERE id = ${parts[1]}
      LIMIT 1
    `;
    return rows[0]?.classroom_id || null;
  }

  if (first === 'problem' && UUID_REGEX.test(parts[1] || '')) {
    const rows = await sql`
      SELECT class_row.classroom_id
      FROM public.class_problems problem
      JOIN public.classes class_row ON class_row.id = problem.class_id
      WHERE problem.id = ${parts[1]}
      LIMIT 1
    `;
    return rows[0]?.classroom_id || null;
  }

  return null;
}

async function getDiscordBoundActiveStudentClassroom(userId: string, classroomId: string | null) {
  if (!classroomId || !isDiscordIntegrationEnabled()) return null;
  const rows = await sql`
    SELECT binding.classroom_id
    FROM mcc_private.classroom_discord_bindings binding
    JOIN public.classroom_students membership
      ON membership.classroom_id = binding.classroom_id
     AND membership.student_id = ${userId}
     AND membership.enrollment_status = 'active'
    JOIN public.users actor ON actor.id = ${userId}
    WHERE binding.classroom_id = ${classroomId}
      AND binding.provisioning_state <> 'disabled'
      AND actor.admin IS NOT TRUE
      AND actor.trainer IS NOT TRUE
      AND actor.is_pre_enrolled IS NOT TRUE
    LIMIT 1
  `;
  return rows[0]?.classroom_id || null;
}

export const requireDiscordLink: MiddlewareHandler = async (c, next) => {
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const classroomId = await resolveClassroomIdFromRequestPath(new URL(c.req.url).pathname);
  const discordBoundStudentClassroomId = await getDiscordBoundActiveStudentClassroom(userId, classroomId);
  const required = Boolean(discordBoundStudentClassroomId) || await shouldRequireDiscordLink(userId);
  if (!required) return next();
  if (await hasActiveDiscordLink(userId)) return next();

  const connectPath = discordBoundStudentClassroomId
    ? `/classroom/live/${discordBoundStudentClassroomId}?connect=discord`
    : '/trainer/dashboard?connect=discord';

  return c.json({
    error: discordBoundStudentClassroomId
      ? 'Discord account is required to enter this classroom.'
      : 'Discord account is required.',
    code: 'DISCORD_LINK_REQUIRED',
    connectUrl: `${getAppBaseUrl()}${connectPath}`,
    classroomId: discordBoundStudentClassroomId,
  }, 428);
};
