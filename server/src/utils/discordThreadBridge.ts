import sql from '../db';
import {
  CLASSROOM_STUDENT_THREAD_ATTACHMENT_BUCKET,
  CLASSROOM_STUDENT_THREAD_ATTACHMENT_MAX_BYTES,
  CLASSROOM_STUDENT_THREAD_MAX_MESSAGE_LENGTH,
  broadcastStudentThreadChange,
  buildStudentThreadStoragePath,
  deleteStudentThreadAttachmentFromStorage,
  listActiveStudentThreadRealtimeChannels,
  sanitizeAttachmentFilename,
  uploadStudentThreadAttachmentToStorage,
  validateStudentThreadAttachment,
} from './classroomStudentThreadsSchema';

const DISCORD_ATTACHMENT_MAX_COUNT = 5;
const DISCORD_ATTACHMENT_TOTAL_MAX_BYTES = 25 * 1024 * 1024;

export type DiscordInboundAttachment = {
  id?: string;
  name: string;
  contentType?: string | null;
  size: number;
  url: string;
};

export type DiscordInboundMessage = {
  guildId: string;
  channelId: string;
  discordMessageId: string;
  discordUserId: string;
  content: string;
  attachments?: DiscordInboundAttachment[];
};

function normalizeText(value: unknown, maxLength = 500) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeRawText(value: unknown, maxLength = 500) {
  return String(value ?? '').slice(0, maxLength);
}

function safeErrorCode(error: any) {
  return String(error?.status || error?.code || error?.name || 'unknown').slice(0, 80);
}

async function resolveDiscordThreadAccess(input: {
  guildId: string;
  channelId: string;
  discordUserId: string;
}) {
  const rows = await sql`
    SELECT
      channel.id AS channel_map_id,
      channel.thread_id,
      channel.student_id,
      channel.classroom_id,
      channel.channel_id,
      binding.guild_id,
      thread.revision AS thread_revision,
      actor.id AS actor_user_id,
      actor.full_name AS actor_name,
      actor.email AS actor_email,
      actor.mist_id AS actor_mist_id,
      (
        actor.id = channel.student_id
        OR actor.admin IS TRUE
        OR (
          actor.trainer IS TRUE
          AND (
            classroom.created_by = actor.id
            OR substitute.trainer_id IS NOT NULL
          )
        )
      ) AS can_write
    FROM mcc_private.classroom_discord_channels channel
    JOIN mcc_private.classroom_discord_bindings binding ON binding.id = channel.binding_id
    JOIN public.classroom_student_threads thread ON thread.id = channel.thread_id
    JOIN mcc_private.discord_user_connections connection
      ON connection.discord_user_id = ${input.discordUserId}
     AND connection.status = 'active'
    JOIN public.users actor ON actor.id = connection.user_id
    JOIN public.classrooms classroom ON classroom.id = channel.classroom_id
    LEFT JOIN public.classroom_substitutes substitute
      ON substitute.classroom_id = channel.classroom_id
     AND substitute.trainer_id = actor.id
    WHERE binding.guild_id = ${input.guildId}
      AND channel.channel_id = ${input.channelId}
      AND channel.kind = 'student_private'
      AND channel.status = 'active'
      AND thread.status = 'active'
    LIMIT 1
  `;

  if (rows.length === 0) return { error: 'Discord channel is not mapped to an active MCC thread.', status: 404 as const };
  if (!rows[0].can_write) return { error: 'Discord user is not authorized for this classroom thread.', status: 403 as const };
  return { access: rows[0] };
}

async function getStudentThreadMessageProjection(threadId: string, messageId: string, currentUserId: string) {
  const rows = await sql`
    SELECT m.id,
           m.thread_id,
           m.sender_id,
           m.thread_revision,
           m.client_message_id,
           m.kind,
           m.event_type,
           m.body,
           m.metadata,
           m.created_at,
           m.edited_at,
           m.deleted_at,
           u.full_name AS sender_name,
           u.email AS sender_email,
           u.mist_id AS sender_mist_id,
           COALESCE(
             json_agg(
               json_build_object(
                 'id', a.id,
                 'original_filename', a.original_filename,
                 'content_type', a.content_type,
                 'size_bytes', a.size_bytes,
                 'created_at', a.created_at
               )
               ORDER BY a.created_at ASC
             ) FILTER (WHERE a.id IS NOT NULL),
             '[]'::json
           ) AS attachments
    FROM public.classroom_student_thread_messages m
    LEFT JOIN public.users u ON u.id = m.sender_id
    LEFT JOIN public.classroom_student_thread_attachments a ON a.message_id = m.id
    WHERE m.id = ${messageId}
      AND m.thread_id = ${threadId}
    GROUP BY m.id, u.full_name, u.email, u.mist_id
  `;
  const row = rows[0];
  if (!row) return null;
  const metadata = row.metadata && typeof row.metadata === 'object' ? { ...row.metadata } : {};
  if (row.client_message_id && !metadata.client_message_id) metadata.client_message_id = row.client_message_id;
  return {
    id: row.id,
    thread_id: row.thread_id,
    thread_revision: Number(row.thread_revision || 0),
    sender_id: row.sender_id,
    sender_name: row.sender_name || 'Discord user',
    kind: row.kind || 'message',
    event_type: row.event_type,
    body: row.body || '',
    metadata,
    edited_at: row.edited_at,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    is_own: Boolean(row.sender_id && row.sender_id === currentUserId),
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  };
}

function buildThreadSummary(access: any, message: any) {
  return {
    id: access.thread_id,
    classroom_id: access.classroom_id,
    student_id: access.student_id,
    updated_at: message.created_at,
    revision: Number(message.thread_revision || 0),
    last_message: {
      id: message.id,
      thread_revision: Number(message.thread_revision || 0),
      kind: message.kind,
      event_type: message.event_type,
      body: message.body,
      created_at: message.created_at,
      sender_name: message.sender_name || '',
    },
  };
}

async function publishDiscordThreadChange(access: any, message: any, summary: any, type = 'message_committed') {
  const channels = await listActiveStudentThreadRealtimeChannels({
    classroomId: access.classroom_id,
    threadId: access.thread_id,
  }).catch(() => [] as string[]);
  if (channels.length === 0) return false;

  const { is_own: _isOwn, sender_email: _senderEmail, sender_mist_id: _senderMistId, ...safeMessage } = message;
  return broadcastStudentThreadChange(channels, {
    version: 2,
    type,
    correlation_id: crypto.randomUUID(),
    classroom_id: access.classroom_id,
    thread_id: access.thread_id,
    student_id: access.student_id,
    message_id: message.id,
    thread_revision: message.thread_revision,
    committed_at: message.created_at,
    message: safeMessage,
    summary,
  });
}

export async function appendDiscordStudentThreadSystemEventInTx(
  tx: any,
  input: {
    classroomId: string;
    threadId: string;
    studentId: string;
    actorUserId: string;
    eventType: string;
    body: string;
    metadata?: Record<string, unknown>;
    clientMessageId?: string | null;
  }
) {
  const body = normalizeText(input.body, CLASSROOM_STUDENT_THREAD_MAX_MESSAGE_LENGTH);
  const eventType = normalizeText(input.eventType, 80);
  const clientMessageId = normalizeText(input.clientMessageId, 160) || null;
  if (!body || !eventType) return null;

  const rows = await tx`
    WITH locked_thread AS MATERIALIZED (
      SELECT id, revision
      FROM public.classroom_student_threads
      WHERE id = ${input.threadId}
        AND classroom_id = ${input.classroomId}
        AND student_id = ${input.studentId}
        AND status = 'active'
      FOR UPDATE
    ),
    existing_message AS MATERIALIZED (
      SELECT message.*
      FROM public.classroom_student_thread_messages message
      JOIN locked_thread ON true
      WHERE ${clientMessageId}::text IS NOT NULL
        AND message.thread_id = locked_thread.id
        AND message.sender_id = ${input.actorUserId}::uuid
        AND message.client_message_id = ${clientMessageId}
      LIMIT 1
    ),
    inserted_message AS (
      INSERT INTO public.classroom_student_thread_messages (
        thread_id,
        sender_id,
        thread_revision,
        client_message_id,
        kind,
        event_type,
        body,
        metadata
      )
      SELECT locked_thread.id,
             ${input.actorUserId}::uuid,
             locked_thread.revision + 1,
             ${clientMessageId},
             'system',
             ${eventType},
             ${body},
             ${sql.json(input.metadata || {})}
      FROM locked_thread
      WHERE NOT EXISTS (SELECT 1 FROM existing_message)
      ON CONFLICT (thread_id, sender_id, client_message_id)
        WHERE sender_id IS NOT NULL AND client_message_id IS NOT NULL
      DO NOTHING
      RETURNING *
    ),
    updated_thread AS (
      UPDATE public.classroom_student_threads thread
      SET revision = inserted_message.thread_revision,
          updated_at = now()
      FROM inserted_message
      WHERE thread.id = inserted_message.thread_id
      RETURNING thread.id
    ),
    chosen_message AS (
      SELECT inserted_message.*, true AS inserted
      FROM inserted_message
      UNION ALL
      SELECT existing_message.*, false AS inserted
      FROM existing_message
      LIMIT 1
    )
    SELECT chosen_message.id,
           chosen_message.thread_id,
           chosen_message.thread_revision,
           chosen_message.created_at,
           chosen_message.inserted
    FROM chosen_message
  `;

  const row = rows[0];
  if (!row) return null;
  return {
    classroomId: input.classroomId,
    threadId: row.thread_id || input.threadId,
    studentId: input.studentId,
    actorUserId: input.actorUserId,
    messageId: row.id,
    inserted: Boolean(row.inserted),
  };
}

export async function publishDiscordStudentThreadSystemEvent(input: {
  classroomId: string;
  threadId: string;
  studentId: string;
  actorUserId: string;
  messageId: string;
}) {
  const message = await getStudentThreadMessageProjection(input.threadId, input.messageId, input.actorUserId);
  if (!message) return false;
  const summary = buildThreadSummary({
    thread_id: input.threadId,
    classroom_id: input.classroomId,
    student_id: input.studentId,
  }, message);
  return publishDiscordThreadChange({
    thread_id: input.threadId,
    classroom_id: input.classroomId,
    student_id: input.studentId,
  }, message, summary);
}

async function copyDiscordAttachments(
  access: any,
  attachments: DiscordInboundAttachment[] = []
) {
  if (attachments.length > DISCORD_ATTACHMENT_MAX_COUNT) {
    return { error: `Discord messages can include at most ${DISCORD_ATTACHMENT_MAX_COUNT} accepted attachments.` };
  }
  const totalBytes = attachments.reduce((sum, item) => sum + Math.max(0, Number(item.size || 0)), 0);
  if (totalBytes > DISCORD_ATTACHMENT_TOTAL_MAX_BYTES) {
    return { error: 'Discord attachments must be 25 MB or smaller in total.' };
  }

  const copied = [];
  for (const attachment of attachments) {
    const filename = sanitizeAttachmentFilename(attachment.name);
    const validation = validateStudentThreadAttachment({
      filename,
      contentType: attachment.contentType || '',
      size: attachment.size,
    });
    if (!validation.ok) return { error: validation.error || 'Unsupported Discord attachment.' };

    const response = await fetch(attachment.url, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { error: `Could not copy Discord attachment ${filename}.` };
    const body = await response.arrayBuffer();
    if (body.byteLength > CLASSROOM_STUDENT_THREAD_ATTACHMENT_MAX_BYTES) {
      return { error: 'Attachment must be 10 MB or smaller.' };
    }

    const storagePath = buildStudentThreadStoragePath(access.classroom_id, access.thread_id, filename);
    await uploadStudentThreadAttachmentToStorage({
      storagePath,
      body,
      contentType: validation.contentType || attachment.contentType || 'application/octet-stream',
    });
    copied.push({
      uploader_id: access.actor_user_id,
      storage_bucket: CLASSROOM_STUDENT_THREAD_ATTACHMENT_BUCKET,
      storage_path: storagePath,
      original_filename: filename,
      content_type: validation.contentType || attachment.contentType || 'application/octet-stream',
      size_bytes: body.byteLength,
    });
  }
  return { copied };
}

async function cleanupCopiedAttachments(copied: any[]) {
  await Promise.all(
    copied.map((attachment) => deleteStudentThreadAttachmentFromStorage({
      bucket: attachment.storage_bucket,
      storagePath: attachment.storage_path,
    }).catch(() => false))
  );
}

export async function handleDiscordMessageCreate(input: DiscordInboundMessage) {
  const accessResult = await resolveDiscordThreadAccess(input);
  if ('error' in accessResult) return accessResult;
  const access = accessResult.access;
  const clientMessageId = `discord:${input.discordMessageId}`;
  const body = normalizeRawText(input.content, CLASSROOM_STUDENT_THREAD_MAX_MESSAGE_LENGTH);
  const attachments = input.attachments || [];
  if (!body.trim() && attachments.length === 0) {
    return { error: 'Discord message has no content or accepted attachments.', status: 400 as const };
  }

  const existing = await sql`
    SELECT m.id
    FROM public.classroom_student_thread_messages m
    WHERE m.thread_id = ${access.thread_id}
      AND m.sender_id = ${access.actor_user_id}
      AND m.client_message_id = ${clientMessageId}
    LIMIT 1
  `;
  if (existing.length > 0) {
    const message = await getStudentThreadMessageProjection(access.thread_id, existing[0].id, access.actor_user_id);
    return { success: true, deduplicated: true, message };
  }

  const copyResult = await copyDiscordAttachments(access, attachments);
  if ('error' in copyResult) return { error: copyResult.error, status: 400 as const };
  const copied = copyResult.copied || [];
  let insertedMessageId: string | null = null;

  try {
    await sql.begin(async (tx) => {
      const threadRows = await tx`
        SELECT id, revision
        FROM public.classroom_student_threads
        WHERE id = ${access.thread_id}
          AND status = 'active'
        FOR UPDATE
      `;
      if (threadRows.length === 0) throw new Error('Thread is unavailable.');

      const insertRows = await tx`
        INSERT INTO public.classroom_student_thread_messages (
          thread_id,
          sender_id,
          thread_revision,
          client_message_id,
          kind,
          event_type,
          body,
          metadata
        )
        VALUES (
          ${access.thread_id},
          ${access.actor_user_id},
          ${Number(threadRows[0].revision || 0) + 1},
          ${clientMessageId},
          'message',
          null,
          ${body.trim() || (copied.length === 1 ? `Shared ${copied[0].original_filename}` : `Shared ${copied.length} attachments`)},
          ${sql.json({
            source: 'discord',
            discord_guild_id: input.guildId,
            discord_channel_id: input.channelId,
            discord_message_id: input.discordMessageId,
            client_message_id: clientMessageId,
          })}
        )
        ON CONFLICT (thread_id, sender_id, client_message_id)
          WHERE sender_id IS NOT NULL AND client_message_id IS NOT NULL
        DO NOTHING
        RETURNING id, thread_revision
      `;
      if (insertRows.length === 0) return;

      insertedMessageId = insertRows[0].id;
      await tx`
        UPDATE public.classroom_student_threads
        SET revision = ${insertRows[0].thread_revision},
            updated_at = now()
        WHERE id = ${access.thread_id}
      `;

      if (copied.length > 0) {
        await tx`
          INSERT INTO public.classroom_student_thread_attachments ${tx(
            copied.map((attachment) => ({
              thread_id: access.thread_id,
              message_id: insertedMessageId,
              uploader_id: attachment.uploader_id,
              storage_bucket: attachment.storage_bucket,
              storage_path: attachment.storage_path,
              original_filename: attachment.original_filename,
              content_type: attachment.content_type,
              size_bytes: attachment.size_bytes,
            }))
          )}
        `;
      }

      await tx`
        INSERT INTO mcc_private.discord_message_links (
          guild_id,
          channel_id,
          discord_message_id,
          thread_id,
          thread_message_id,
          actor_user_id
        )
        VALUES (
          ${input.guildId},
          ${input.channelId},
          ${input.discordMessageId},
          ${access.thread_id},
          ${insertedMessageId},
          ${access.actor_user_id}
        )
        ON CONFLICT (guild_id, channel_id, discord_message_id) DO NOTHING
      `;
    });
  } catch (error) {
    await cleanupCopiedAttachments(copied);
    throw error;
  }

  if (!insertedMessageId) {
    await cleanupCopiedAttachments(copied);
    return { error: 'Discord message idempotency conflict; retry later.', status: 409 as const };
  }

  const message = await getStudentThreadMessageProjection(access.thread_id, insertedMessageId, access.actor_user_id);
  if (!message) return { error: 'Saved Discord message could not be loaded.', status: 500 as const };
  const summary = buildThreadSummary(access, message);
  const realtimeDelivered = await publishDiscordThreadChange(access, message, summary);
  return { success: true, message, summary, realtimeDelivered };
}

export async function handleDiscordMessageUpdate(input: DiscordInboundMessage) {
  const content = normalizeRawText(input.content, CLASSROOM_STUDENT_THREAD_MAX_MESSAGE_LENGTH);
  const rows = await sql`
    SELECT link.thread_id,
           link.thread_message_id,
           link.actor_user_id,
           channel.classroom_id,
           channel.student_id
    FROM mcc_private.discord_message_links link
    JOIN mcc_private.classroom_discord_channels channel
      ON channel.channel_id = link.channel_id
    WHERE link.guild_id = ${input.guildId}
      AND link.channel_id = ${input.channelId}
      AND link.discord_message_id = ${input.discordMessageId}
      AND link.status <> 'deleted'
    LIMIT 1
  `;
  if (rows.length === 0) return { ignored: true };
  const row = rows[0];

  const mutationRows = await sql`
    WITH updated AS (
      UPDATE public.classroom_student_thread_messages
      SET body = ${content},
          edited_at = now(),
          mutation_revision = mutation_revision + 1,
          metadata = metadata || ${sql.json({ discord_edited: true })}
      WHERE id = ${row.thread_message_id}
        AND thread_id = ${row.thread_id}
        AND deleted_at IS NULL
      RETURNING *
    ),
    ledger AS (
      INSERT INTO public.classroom_student_thread_message_revisions (
        thread_id,
        message_id,
        actor_user_id,
        mutation_revision,
        mutation_type,
        source,
        metadata
      )
      SELECT thread_id,
             id,
             ${row.actor_user_id},
             mutation_revision,
             'edited',
             'discord',
             ${sql.json({ discord_message_id: input.discordMessageId })}
      FROM updated
      RETURNING id
    )
    UPDATE mcc_private.discord_message_links
    SET status = 'edited',
        edited_at = now()
    WHERE guild_id = ${input.guildId}
      AND channel_id = ${input.channelId}
      AND discord_message_id = ${input.discordMessageId}
    RETURNING (SELECT id FROM updated) AS message_id
  `;
  const messageId = mutationRows[0]?.message_id;
  if (!messageId) return { ignored: true };
  const access = {
    thread_id: row.thread_id,
    classroom_id: row.classroom_id,
    student_id: row.student_id,
  };
  const message = await getStudentThreadMessageProjection(row.thread_id, messageId, row.actor_user_id || '');
  const summary = message ? buildThreadSummary(access, message) : null;
  if (message) await publishDiscordThreadChange(access, message, summary, 'message_edited');
  return { success: true, message };
}

export async function handleDiscordMessageDelete(input: Omit<DiscordInboundMessage, 'content' | 'attachments'>) {
  const rows = await sql`
    SELECT link.thread_id,
           link.thread_message_id,
           link.actor_user_id,
           channel.classroom_id,
           channel.student_id
    FROM mcc_private.discord_message_links link
    JOIN mcc_private.classroom_discord_channels channel
      ON channel.channel_id = link.channel_id
    WHERE link.guild_id = ${input.guildId}
      AND link.channel_id = ${input.channelId}
      AND link.discord_message_id = ${input.discordMessageId}
      AND link.status <> 'deleted'
    LIMIT 1
  `;
  if (rows.length === 0) return { ignored: true };
  const row = rows[0];

  const attachments = await sql`
    SELECT storage_bucket, storage_path
    FROM public.classroom_student_thread_attachments
    WHERE message_id = ${row.thread_message_id}
  `;
  await cleanupCopiedAttachments(attachments);

  const mutationRows = await sql`
    WITH updated AS (
      UPDATE public.classroom_student_thread_messages
      SET body = 'This Discord message was deleted.',
          deleted_at = now(),
          mutation_revision = mutation_revision + 1,
          metadata = metadata || ${sql.json({ discord_deleted: true })}
      WHERE id = ${row.thread_message_id}
        AND thread_id = ${row.thread_id}
        AND deleted_at IS NULL
      RETURNING *
    ),
    deleted_attachments AS (
      DELETE FROM public.classroom_student_thread_attachments
      WHERE message_id = ${row.thread_message_id}
      RETURNING id
    ),
    ledger AS (
      INSERT INTO public.classroom_student_thread_message_revisions (
        thread_id,
        message_id,
        actor_user_id,
        mutation_revision,
        mutation_type,
        source,
        metadata
      )
      SELECT thread_id,
             id,
             ${row.actor_user_id},
             mutation_revision,
             'deleted',
             'discord',
             ${sql.json({ discord_message_id: input.discordMessageId })}
      FROM updated
      RETURNING id
    )
    UPDATE mcc_private.discord_message_links
    SET status = 'deleted',
        deleted_at = now()
    WHERE guild_id = ${input.guildId}
      AND channel_id = ${input.channelId}
      AND discord_message_id = ${input.discordMessageId}
    RETURNING (SELECT id FROM updated) AS message_id
  `;
  const messageId = mutationRows[0]?.message_id;
  if (!messageId) return { ignored: true };
  const access = {
    thread_id: row.thread_id,
    classroom_id: row.classroom_id,
    student_id: row.student_id,
  };
  const message = await getStudentThreadMessageProjection(row.thread_id, messageId, row.actor_user_id || '');
  const summary = message ? buildThreadSummary(access, message) : null;
  if (message) await publishDiscordThreadChange(access, message, summary, 'message_deleted');
  return { success: true, message };
}

export function discordBridgeErrorCode(error: any) {
  return safeErrorCode(error);
}
