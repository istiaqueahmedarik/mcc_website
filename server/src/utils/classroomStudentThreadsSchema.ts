import sql from '../db';

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

let schemaPromise: Promise<void> | null = null;

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

export async function broadcastStudentThreadChange(channel: string, payload: Record<string, unknown>) {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';
  if (!url || !key || !channel) return false;

  try {
    const response = await fetch(
      `${url}/realtime/v1/api/broadcast/${encodeURIComponent(channel)}/events/thread_changed`,
      {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Student thread realtime broadcast failed:', text || response.statusText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Student thread realtime broadcast failed:', error);
    return false;
  }
}

export async function ensureClassroomStudentThreadsSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

      await sql`
        CREATE TABLE IF NOT EXISTS public.classroom_student_threads (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
          student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          status text NOT NULL DEFAULT 'active',
          realtime_token uuid NOT NULL DEFAULT gen_random_uuid(),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT classroom_student_threads_unique_student UNIQUE (classroom_id, student_id),
          CONSTRAINT classroom_student_threads_status_check CHECK (status IN ('active', 'archived'))
        )
      `;
      await sql`ALTER TABLE public.classroom_student_threads ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'`;
      await sql`ALTER TABLE public.classroom_student_threads ADD COLUMN IF NOT EXISTS realtime_token uuid NOT NULL DEFAULT gen_random_uuid()`;
      await sql`ALTER TABLE public.classroom_student_threads ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`;
      await sql`ALTER TABLE public.classroom_student_threads ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS classroom_student_threads_classroom_student_idx
        ON public.classroom_student_threads (classroom_id, student_id)
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS classroom_student_threads_realtime_token_idx
        ON public.classroom_student_threads (realtime_token)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS classroom_student_threads_classroom_idx
        ON public.classroom_student_threads (classroom_id, updated_at DESC)
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS public.classroom_student_thread_messages (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          thread_id uuid NOT NULL REFERENCES public.classroom_student_threads(id) ON DELETE CASCADE,
          sender_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
          kind text NOT NULL DEFAULT 'message',
          event_type text NULL,
          body text NOT NULL DEFAULT '',
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT classroom_student_thread_messages_kind_check CHECK (kind IN ('message', 'system'))
        )
      `;
      await sql`ALTER TABLE public.classroom_student_thread_messages ADD COLUMN IF NOT EXISTS sender_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE public.classroom_student_thread_messages ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'message'`;
      await sql`ALTER TABLE public.classroom_student_thread_messages ADD COLUMN IF NOT EXISTS event_type text NULL`;
      await sql`ALTER TABLE public.classroom_student_thread_messages ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE public.classroom_student_thread_messages ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb`;
      await sql`ALTER TABLE public.classroom_student_thread_messages ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`;
      await sql`
        CREATE INDEX IF NOT EXISTS classroom_student_thread_messages_thread_idx
        ON public.classroom_student_thread_messages (thread_id, created_at ASC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS classroom_student_thread_messages_event_idx
        ON public.classroom_student_thread_messages (event_type, created_at DESC)
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS public.classroom_student_thread_attachments (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          thread_id uuid NOT NULL REFERENCES public.classroom_student_threads(id) ON DELETE CASCADE,
          message_id uuid NOT NULL REFERENCES public.classroom_student_thread_messages(id) ON DELETE CASCADE,
          uploader_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
          storage_bucket text NOT NULL,
          storage_path text NOT NULL,
          original_filename text NOT NULL,
          content_type text NOT NULL,
          size_bytes integer NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT classroom_student_thread_attachment_size_check CHECK (size_bytes > 0)
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS classroom_student_thread_attachments_message_idx
        ON public.classroom_student_thread_attachments (message_id)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS classroom_student_thread_attachments_thread_idx
        ON public.classroom_student_thread_attachments (thread_id, created_at DESC)
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS classroom_student_thread_attachments_storage_idx
        ON public.classroom_student_thread_attachments (storage_bucket, storage_path)
      `;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  return schemaPromise;
}
