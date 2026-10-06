import sql from '../db';
import { issueStudentThreadRealtimeAccessToken } from './classroomStudentThreadRealtimeAuth';

export const CLASSROOM_STUDENT_THREAD_EVENTS = [
  'student_solution_submitted',
  'trainer_problem_added',
  'trainer_feedback',
  'solution_status_changed',
  'topic_or_resource_updated',
  'attachment_shared',
];

export const CLASSROOM_STUDENT_THREAD_MESSAGE_KINDS = ['message', 'system'];

export const CLASSROOM_STUDENT_THREAD_MAX_MESSAGE_LENGTH = 4000;
export const CLASSROOM_STUDENT_THREAD_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const CLASSROOM_STUDENT_THREAD_ATTACHMENT_BUCKET =
  process.env.SUPABASE_CLASSROOM_ATTACHMENTS_BUCKET ||
  process.env.CLASSROOM_THREAD_ATTACHMENTS_BUCKET ||
  'classroom-thread-attachments';
export const CLASSROOM_STUDENT_THREAD_REALTIME_EVENT = 'thread_changed';
export const CLASSROOM_STUDENT_THREAD_REALTIME_TTL_MINUTES = 10;
const CLASSROOM_STUDENT_THREAD_REALTIME_RENEW_SECONDS = 90;
const CLASSROOM_STUDENT_THREAD_BROADCAST_TIMEOUT_MS = 3000;

export const CLASSROOM_STUDENT_THREAD_ATTACHMENT_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.pdf',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.java',
  '.py',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
];

const imageContentTypes = new Map([
  ['.png', ['image/png']],
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
  ['.webp', ['image/webp']],
  ['.gif', ['image/gif']],
]);

const documentContentTypes = new Map([
  ['.pdf', ['application/pdf']],
]);

const textContentTypes = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/csv',
  'application/json',
  'application/javascript',
  'application/typescript',
  'text/javascript',
  'text/jsx',
  'text/tsx',
  'text/x-c',
  'text/x-c++src',
  'text/x-c++hdr',
  'text/x-java-source',
  'text/x-python',
  'application/octet-stream',
  '',
]);

const textLikeExtensions = new Set([
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.java',
  '.py',
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
]);

export type StudentThreadRealtimeScope = 'thread' | 'manager_list';

export type StudentThreadRealtimeChannel = {
  channel: string;
  event: string;
  scope: StudentThreadRealtimeScope;
  expires_at: string;
  renew_after: string;
  access_token: string;
  token_expires_at: string;
};

export type StudentThreadAttachmentValidation = {
  ok: boolean;
  extension?: string;
  contentType?: string;
  error?: string;
};

export function getClassroomStudentThreadAttachmentAccept(): string {
  return CLASSROOM_STUDENT_THREAD_ATTACHMENT_EXTENSIONS.join(',');
}

function normalizeContentType(value: unknown): string {
  return String(value || '').split(';')[0].trim().toLowerCase();
}

export function getSafeAttachmentExtension(filename: unknown): string {
  const name = String(filename || '').trim().toLowerCase();
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return name.slice(dotIndex);
}

export function sanitizeAttachmentFilename(filename: unknown): string {
  const name = String(filename || 'attachment').trim() || 'attachment';
  const withoutPath = name.split(/[\\/]/).pop() || 'attachment';
  return withoutPath.replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\s+/g, ' ').slice(0, 120) || 'attachment';
}

export function validateStudentThreadAttachment(input: {
  filename: unknown;
  contentType: unknown;
  size: unknown;
}): StudentThreadAttachmentValidation {
  const extension = getSafeAttachmentExtension(input.filename);
  const contentType = normalizeContentType(input.contentType);
  const size = Number(input.size);

  if (!extension || !CLASSROOM_STUDENT_THREAD_ATTACHMENT_EXTENSIONS.includes(extension)) {
    return { ok: false, error: 'File type is not allowed for classroom threads.' };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: 'Attachment file is empty.' };
  }
  if (size > CLASSROOM_STUDENT_THREAD_ATTACHMENT_MAX_BYTES) {
    return { ok: false, error: 'Attachment must be 10 MB or smaller.' };
  }

  const imageTypes = imageContentTypes.get(extension);
  if (imageTypes && !imageTypes.includes(contentType)) {
    return { ok: false, error: 'Image attachment type does not match the file extension.' };
  }

  const documentTypes = documentContentTypes.get(extension);
  if (documentTypes && !documentTypes.includes(contentType)) {
    return { ok: false, error: 'PDF attachment type does not match the file extension.' };
  }

  if (textLikeExtensions.has(extension) && !textContentTypes.has(contentType) && !contentType.startsWith('text/')) {
    return { ok: false, error: 'Text/code attachment type does not match the file extension.' };
  }

  return {
    ok: true,
    extension,
    contentType: contentType || 'application/octet-stream',
  };
}

function getSupabaseServerConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    '';
  if (!url || !key) {
    return {
      error: 'Supabase private storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      url,
      key,
    };
  }
  return { url, key, error: '' };
}

function getSupabaseRealtimeConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    '';
  if (!url || !key) {
    return {
      error: 'Supabase Realtime server broadcast is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      url,
      key,
    };
  }
  return { url, key, error: '' };
}

function encodeStoragePath(path: string): string {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

export function buildStudentThreadStoragePath(classroomId: string, threadId: string, filename: string): string {
  const safeName = sanitizeAttachmentFilename(filename);
  return `${classroomId}/${threadId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}

export async function uploadStudentThreadAttachmentToStorage(input: {
  storagePath: string;
  body: ArrayBuffer;
  contentType: string;
}) {
  const config = getSupabaseServerConfig();
  if (config.error) throw new Error(config.error);

  const response = await fetch(
    `${config.url}/storage/v1/object/${encodeURIComponent(CLASSROOM_STUDENT_THREAD_ATTACHMENT_BUCKET)}/${encodeStoragePath(input.storagePath)}`,
    {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': input.contentType || 'application/octet-stream',
        'Cache-Control': '3600',
        'x-upsert': 'false',
      },
      body: input.body,
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Supabase storage upload failed with status ${response.status}`);
  }

  return {
    bucket: CLASSROOM_STUDENT_THREAD_ATTACHMENT_BUCKET,
    path: input.storagePath,
  };
}

export async function deleteStudentThreadAttachmentFromStorage(input: {
  bucket?: string;
  storagePath: string;
}) {
  const config = getSupabaseServerConfig();
  if (config.error) throw new Error(config.error);
  const bucket = input.bucket || CLASSROOM_STUDENT_THREAD_ATTACHMENT_BUCKET;
  const response = await fetch(
    `${config.url}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(input.storagePath)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
      signal: AbortSignal.timeout(5000),
    }
  );
  if (!response.ok && response.status !== 404) {
    throw new Error(`Supabase storage cleanup failed with status ${response.status}`);
  }
  return true;
}

export async function createStudentThreadAttachmentSignedUrl(input: {
  bucket: string;
  storagePath: string;
  filename?: string;
  expiresIn?: number;
}) {
  const config = getSupabaseServerConfig();
  if (config.error) throw new Error(config.error);
  const expiresIn = input.expiresIn || 300;

  const response = await fetch(
    `${config.url}/storage/v1/object/sign/${encodeURIComponent(input.bucket)}/${encodeStoragePath(input.storagePath)}`,
    {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expiresIn,
        download: input.filename || true,
      }),
    }
  );

  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || !data?.signedURL) {
    throw new Error(data?.message || data?.error || `Supabase signed URL failed with status ${response.status}`);
  }

  const signedUrl = String(data.signedURL);
  return {
    url: signedUrl.startsWith('http') ? signedUrl : `${config.url}/storage/v1${signedUrl}`,
    expiresIn,
  };
}

async function cleanupExpiredStudentThreadRealtimeChannels() {
  await sql`
    DELETE FROM public.classroom_student_thread_realtime_channels
    WHERE expires_at < now()
  `;
}

function buildStudentThreadRealtimeChannelName(scope: StudentThreadRealtimeScope) {
  return `classroom-student-thread:${scope}:${crypto.randomUUID()}`;
}

export async function issueStudentThreadRealtimeChannel(input: {
  classroomId: string;
  threadId?: string | null;
  authorizedUserId: string;
  scope: StudentThreadRealtimeScope;
}): Promise<StudentThreadRealtimeChannel> {
  await cleanupExpiredStudentThreadRealtimeChannels();

  const expiresAt = new Date(Date.now() + CLASSROOM_STUDENT_THREAD_REALTIME_TTL_MINUTES * 60 * 1000).toISOString();
  const renewAfter = new Date(
    new Date(expiresAt).getTime() - CLASSROOM_STUDENT_THREAD_REALTIME_RENEW_SECONDS * 1000
  ).toISOString();
  const threadId = input.scope === 'thread' ? input.threadId || null : null;
  if (input.scope === 'thread' && !threadId) {
    throw new Error('Thread is required for a thread Realtime channel.');
  }

  const channelName = buildStudentThreadRealtimeChannelName(input.scope);
  const [rows, access] = await Promise.all([
    input.scope === 'thread'
      ? sql`
        INSERT INTO public.classroom_student_thread_realtime_channels (
          classroom_id,
          thread_id,
          authorized_user_id,
          scope,
          channel_name,
          expires_at
        )
        VALUES (
          ${input.classroomId},
          ${threadId},
          ${input.authorizedUserId},
          ${input.scope},
          ${channelName},
          ${expiresAt}::timestamptz
        )
        ON CONFLICT (authorized_user_id, thread_id) WHERE scope = 'thread'
        DO UPDATE SET
          classroom_id = EXCLUDED.classroom_id,
          expires_at = EXCLUDED.expires_at,
          updated_at = now()
        RETURNING channel_name, scope, expires_at
      `
      : sql`
        INSERT INTO public.classroom_student_thread_realtime_channels (
          classroom_id,
          thread_id,
          authorized_user_id,
          scope,
          channel_name,
          expires_at
        )
        VALUES (
          ${input.classroomId},
          NULL,
          ${input.authorizedUserId},
          'manager_list',
          ${channelName},
          ${expiresAt}::timestamptz
        )
        ON CONFLICT (authorized_user_id, classroom_id) WHERE scope = 'manager_list'
        DO UPDATE SET
          expires_at = EXCLUDED.expires_at,
          updated_at = now()
        RETURNING channel_name, scope, expires_at
      `,
    issueStudentThreadRealtimeAccessToken(input.authorizedUserId),
  ]);

  return {
    channel: rows[0].channel_name,
    event: CLASSROOM_STUDENT_THREAD_REALTIME_EVENT,
    scope: rows[0].scope,
    expires_at: rows[0].expires_at,
    renew_after: renewAfter,
    ...access,
  };
}

export async function listActiveStudentThreadRealtimeChannels(input: {
  classroomId: string;
  threadId?: string | null;
  scope?: StudentThreadRealtimeScope;
}) {
  const rows = input.scope === 'thread'
    ? await sql`
        SELECT channel_name
        FROM public.classroom_student_thread_realtime_channels
        WHERE scope = 'thread'
          AND thread_id = ${input.threadId || null}
          AND expires_at > now()
      `
    : input.scope === 'manager_list'
      ? await sql`
          SELECT channel_name
          FROM public.classroom_student_thread_realtime_channels
          WHERE scope = 'manager_list'
            AND classroom_id = ${input.classroomId}
            AND expires_at > now()
        `
      : await sql`
          SELECT channel_name
          FROM public.classroom_student_thread_realtime_channels
          WHERE (
              (scope = 'thread' AND thread_id = ${input.threadId || null})
              OR (scope = 'manager_list' AND classroom_id = ${input.classroomId})
            )
            AND expires_at > now()
        `;

  return rows.map((row: any) => String(row.channel_name || '')).filter(Boolean);
}

async function broadcastStudentThreadChangePrivate(
  url: string,
  key: string,
  channels: string[],
  payload: Record<string, unknown>,
  eventName: string
) {
  const response = await fetch(
    `${url}/realtime/v1/api/broadcast`,
    {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: channels.map((topic) => ({
          topic,
          event: eventName,
          payload,
          private: true,
        })),
      }),
      signal: AbortSignal.timeout(CLASSROOM_STUDENT_THREAD_BROADCAST_TIMEOUT_MS),
    }
  );
  return response.ok;
}

export async function broadcastStudentThreadChange(
  channels: string | string[],
  payload: Record<string, unknown>,
  eventName = CLASSROOM_STUDENT_THREAD_REALTIME_EVENT
) {
  const config = getSupabaseRealtimeConfig();
  const channelList = [...new Set((Array.isArray(channels) ? channels : [channels]).map((channel) => String(channel || '').trim()).filter(Boolean))];
  if (config.error || channelList.length === 0) return false;

  const startedAt = performance.now();
  try {
    const delivered = await broadcastStudentThreadChangePrivate(
      config.url,
      config.key,
      channelList,
      payload,
      eventName
    );
    if (!delivered) {
      console.error('[student-thread-realtime] private broadcast failed', {
        channelCount: channelList.length,
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
    return delivered;
  } catch (error) {
    console.error('[student-thread-realtime] private broadcast failed', {
      channelCount: channelList.length,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return false;
  }
}

export async function ensureClassroomStudentThreadsSchema() {
  return Promise.resolve();
}
