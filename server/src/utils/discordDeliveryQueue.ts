import sql from '../db';

export type DiscordDeliveryJob = {
  id: string;
  classroom_id?: string | null;
  binding_id?: string | null;
  user_id?: string | null;
  kind: string;
  status: string;
  idempotency_key: string;
  payload: any;
  scheduled_for: string;
  attempts: number;
  max_attempts: number;
};

export async function enqueueDiscordDeliveryJob(input: {
  classroomId?: string | null;
  bindingId?: string | null;
  userId?: string | null;
  kind: string;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  scheduledFor?: string | Date | null;
  tx?: any;
}) {
  const db = input.tx || sql;
  const scheduledFor = input.scheduledFor
    ? new Date(input.scheduledFor).toISOString()
    : new Date().toISOString();
  const rows = await db`
    INSERT INTO mcc_private.discord_delivery_jobs (
      classroom_id,
      binding_id,
      user_id,
      kind,
      idempotency_key,
      payload,
      scheduled_for
    )
    VALUES (
      ${input.classroomId || null},
      ${input.bindingId || null},
      ${input.userId || null},
      ${input.kind},
      ${input.idempotencyKey},
      ${db.json(input.payload || {})},
      ${scheduledFor}::timestamptz
    )
    ON CONFLICT (idempotency_key) DO UPDATE SET
      payload = EXCLUDED.payload,
      scheduled_for = LEAST(mcc_private.discord_delivery_jobs.scheduled_for, EXCLUDED.scheduled_for),
      updated_at = now()
    RETURNING *
  `;
  return rows[0] as DiscordDeliveryJob;
}

export async function claimDiscordDeliveryJobs(workerId: string, limit = 5) {
  const rows = await sql`
    UPDATE mcc_private.discord_delivery_jobs job
    SET status = 'leased',
        locked_at = now(),
        locked_by = ${workerId},
        attempts = attempts + 1,
        updated_at = now()
    WHERE job.id IN (
      SELECT id
      FROM mcc_private.discord_delivery_jobs
      WHERE status in ('pending', 'retry')
        AND scheduled_for <= now()
        AND (retry_after is null or retry_after <= now())
      ORDER BY scheduled_for asc, created_at asc
      LIMIT ${Math.max(1, Math.min(limit, 25))}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;
  return rows as unknown as DiscordDeliveryJob[];
}

export async function markDiscordDeliveryJobDelivered(jobId: string) {
  await sql`
    UPDATE mcc_private.discord_delivery_jobs
    SET status = 'delivered',
        delivered_at = now(),
        locked_at = null,
        locked_by = null,
        updated_at = now()
    WHERE id = ${jobId}
  `;
}

export async function markDiscordDeliveryJobFailed(input: {
  jobId: string;
  errorCode: string;
  retryAfterMs?: number | null;
}) {
  const retryDelayMs = Number.isFinite(Number(input.retryAfterMs))
    ? Math.max(0, Number(input.retryAfterMs))
    : 30_000 + Math.floor(Math.random() * 30_000);
  const retryAt = new Date(Date.now() + retryDelayMs).toISOString();
  const errorCode = String(input.errorCode || 'unknown').slice(0, 80);
  await sql.begin(async (tx) => {
    const rows = await tx`
      UPDATE mcc_private.discord_delivery_jobs
      SET status = CASE WHEN attempts >= max_attempts THEN 'dead_letter' ELSE 'retry' END,
          retry_after = CASE WHEN attempts >= max_attempts THEN null ELSE ${retryAt}::timestamptz END,
          dead_lettered_at = CASE WHEN attempts >= max_attempts THEN now() ELSE dead_lettered_at END,
          last_error_code = ${errorCode},
          last_error_at = now(),
          locked_at = null,
          locked_by = null,
          updated_at = now()
      WHERE id = ${input.jobId}
      RETURNING binding_id, kind, status
    `;
    const job = rows[0];
    if (
      job?.binding_id
      && job.status === 'dead_letter'
      && (job.kind === 'provision_classroom' || job.kind === 'reconcile_classroom')
    ) {
      await tx`
        UPDATE mcc_private.classroom_discord_bindings
        SET provisioning_state = 'action_required',
            action_required_reason = ${`Discord provisioning stopped after repeated failures (${errorCode}). Fix Discord permissions or capacity, then run Repair.`},
            updated_at = now()
        WHERE id = ${job.binding_id}
          AND provisioning_state <> 'disabled'
      `;
    }
  });
}
