import sql from '../db';
import { isDiscordIntegrationEnabled } from './discordConfig';
import { enqueueDiscordDeliveryJob, type DiscordDeliveryJob } from './discordDeliveryQueue';

function safeReason(value: string | null | undefined) {
  return String(value || 'manual')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '_')
    .slice(0, 80) || 'manual';
}

async function enqueueReconcileJob(input: {
  db: any;
  classroomId: string;
  bindingId: string;
  userId?: string | null;
  reason: string;
  payload?: Record<string, unknown>;
}) {
  return enqueueDiscordDeliveryJob({
    tx: input.db,
    classroomId: input.classroomId,
    bindingId: input.bindingId,
    userId: input.userId || null,
    kind: 'reconcile_classroom',
    idempotencyKey: `reconcile:${input.classroomId}:${safeReason(input.reason)}:${crypto.randomUUID()}`,
    payload: {
      classroomId: input.classroomId,
      bindingId: input.bindingId,
      reason: safeReason(input.reason),
      ...(input.payload || {}),
    },
  });
}

export async function enqueueDiscordReconcileForClassroom(input: {
  tx?: any;
  classroomId: string;
  userId?: string | null;
  reason: string;
  payload?: Record<string, unknown>;
}) {
  if (!isDiscordIntegrationEnabled()) return null;
  const db = input.tx || sql;
  const rows = await db`
    SELECT id
    FROM mcc_private.classroom_discord_bindings
    WHERE classroom_id = ${input.classroomId}
      AND provisioning_state <> 'disabled'
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return enqueueReconcileJob({
    db,
    classroomId: input.classroomId,
    bindingId: rows[0].id,
    userId: input.userId || null,
    reason: input.reason,
    payload: input.payload,
  });
}

export async function enqueueDiscordReconcileForLinkedUser(input: {
  tx?: any;
  userId: string;
  reason: string;
}) {
  if (!isDiscordIntegrationEnabled()) return [];
  const db = input.tx || sql;
  const rows = await db`
    SELECT DISTINCT membership.classroom_id,
           binding.id AS binding_id
    FROM public.classroom_students membership
    JOIN public.users student ON student.id = membership.student_id
    JOIN mcc_private.classroom_discord_bindings binding
      ON binding.classroom_id = membership.classroom_id
     AND binding.provisioning_state <> 'disabled'
    WHERE membership.student_id = ${input.userId}
      AND membership.enrollment_status = 'active'
      AND student.admin IS NOT TRUE
      AND student.trainer IS NOT TRUE
      AND student.is_pre_enrolled IS NOT TRUE
  `;

  const jobs: DiscordDeliveryJob[] = [];
  for (const row of rows) {
    const job = await enqueueReconcileJob({
      db,
      classroomId: row.classroom_id,
      bindingId: row.binding_id,
      userId: input.userId,
      reason: input.reason,
      payload: { linkedUserId: input.userId },
    });
    jobs.push(job);
  }
  return jobs;
}
