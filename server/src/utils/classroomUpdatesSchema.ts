import sql from '../db';

export const CLASSROOM_UPDATE_PRIORITIES = [
  'time_exceeded',
  'student_solution_submitted',
  'student_needs_review',
  'problem_progress_changed',
  'thread_reply',
  'new_problem',
  'teacher_feedback',
  'solution_status_changed',
  'topic_or_resource_updated',
];

export const CLASSROOM_THREAD_REACTIONS = ['like', 'heart', 'insight', 'done'];

const prioritySet = new Set(CLASSROOM_UPDATE_PRIORITIES);
const reactionSet = new Set(CLASSROOM_THREAD_REACTIONS);
let schemaPromise: Promise<void> | null = null;

export function normalizeClassroomUpdatePriorities(value: unknown): string[] {
  const incoming = Array.isArray(value) ? value : [];
  const known = incoming
    .map((item) => String(item || '').trim())
    .filter((item) => prioritySet.has(item));
  const unique = [...new Set(known)];
  const missing = CLASSROOM_UPDATE_PRIORITIES.filter((item) => !unique.includes(item));
  return [...unique, ...missing];
}

export function isClassroomThreadReaction(value: unknown): value is string {
  return reactionSet.has(String(value || '').trim());
}

export async function ensureClassroomUpdatesSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;

      await sql`
        CREATE TABLE IF NOT EXISTS public.user_settings (
          user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS user_settings_user_id_idx
        ON public.user_settings (user_id)
      `;
      await sql`
        ALTER TABLE public.user_settings
        ADD COLUMN IF NOT EXISTS classroom_update_priorities text[] NOT NULL DEFAULT ARRAY[
          'time_exceeded',
          'student_solution_submitted',
          'student_needs_review',
          'problem_progress_changed',
          'thread_reply',
          'new_problem',
          'teacher_feedback',
          'solution_status_changed',
          'topic_or_resource_updated'
        ]::text[]
      `;
      await sql`
        ALTER TABLE public.user_settings
        ADD COLUMN IF NOT EXISTS classroom_email_notifications_enabled boolean NOT NULL DEFAULT true
      `;
      await sql`ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`;
      await sql`ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`;

      await sql`
        CREATE TABLE IF NOT EXISTS public.classroom_problem_threads (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
          class_id uuid NULL REFERENCES public.classes(id) ON DELETE CASCADE,
          class_problem_id uuid NULL REFERENCES public.class_problems(id) ON DELETE CASCADE,
          topic_assignment_id uuid NULL REFERENCES public.classroom_team_topic_assignments(id) ON DELETE CASCADE,
          topic_problem_id uuid NULL REFERENCES public.classroom_topic_problems(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT classroom_problem_threads_scope_check CHECK (
            (
              class_problem_id IS NOT NULL
              AND topic_assignment_id IS NULL
              AND topic_problem_id IS NULL
            )
            OR
            (
              class_problem_id IS NULL
              AND topic_assignment_id IS NULL
              AND topic_problem_id IS NOT NULL
            )
            OR
            (
              class_problem_id IS NULL
              AND topic_assignment_id IS NOT NULL
              AND topic_problem_id IS NOT NULL
            )
          )
        )
      `;
      await sql`
        ALTER TABLE public.classroom_problem_threads
        DROP CONSTRAINT IF EXISTS classroom_problem_threads_scope_check
      `;
      await sql`
        ALTER TABLE public.classroom_problem_threads
        ADD CONSTRAINT classroom_problem_threads_scope_check CHECK (
          (
            class_problem_id IS NOT NULL
            AND topic_assignment_id IS NULL
            AND topic_problem_id IS NULL
          )
          OR
          (
            class_problem_id IS NULL
            AND topic_assignment_id IS NULL
            AND topic_problem_id IS NOT NULL
          )
          OR
          (
            class_problem_id IS NULL
            AND topic_assignment_id IS NOT NULL
            AND topic_problem_id IS NOT NULL
          )
        )
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS classroom_problem_threads_class_problem_idx
        ON public.classroom_problem_threads (class_problem_id)
        WHERE class_problem_id IS NOT NULL
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS classroom_problem_threads_topic_source_problem_idx
        ON public.classroom_problem_threads (classroom_id, topic_problem_id)
        WHERE topic_assignment_id IS NULL AND topic_problem_id IS NOT NULL
      `;
      await sql`
        CREATE UNIQUE INDEX IF NOT EXISTS classroom_problem_threads_topic_problem_idx
        ON public.classroom_problem_threads (topic_assignment_id, topic_problem_id)
        WHERE topic_assignment_id IS NOT NULL AND topic_problem_id IS NOT NULL
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS classroom_problem_threads_classroom_idx
        ON public.classroom_problem_threads (classroom_id, updated_at DESC)
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS public.classroom_problem_thread_messages (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          thread_id uuid NOT NULL REFERENCES public.classroom_problem_threads(id) ON DELETE CASCADE,
          user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          kind text NOT NULL DEFAULT 'message',
          message text NOT NULL,
          metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
          is_solution boolean NOT NULL DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS classroom_problem_thread_messages_thread_idx
        ON public.classroom_problem_thread_messages (thread_id, created_at ASC)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS classroom_problem_thread_messages_user_idx
        ON public.classroom_problem_thread_messages (user_id, created_at DESC)
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS public.classroom_problem_thread_reactions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          message_id uuid NOT NULL REFERENCES public.classroom_problem_thread_messages(id) ON DELETE CASCADE,
          user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          reaction text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT classroom_problem_thread_reactions_unique UNIQUE (message_id, user_id, reaction)
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS classroom_problem_thread_reactions_message_idx
        ON public.classroom_problem_thread_reactions (message_id)
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS public.classroom_update_read_receipts (
          classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
          user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          update_key text NOT NULL,
          read_at timestamptz NOT NULL DEFAULT now(),
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (classroom_id, user_id, update_key)
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS classroom_update_read_receipts_user_idx
        ON public.classroom_update_read_receipts (user_id, classroom_id, read_at DESC)
      `;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  return schemaPromise;
}
