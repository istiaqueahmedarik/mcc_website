-- Trainer/student thread realtime hardening and performance.
-- Approved task: trainer-student-thread-realtime-hardening-performance-20260802

create extension if not exists pgcrypto;

alter table public.classroom_team_topic_assignments
  drop constraint if exists classroom_team_topic_assignments_unique;

alter table public.classroom_team_topic_assignments
  alter column team_id drop not null;

alter table public.classroom_team_topic_assignments
  add column if not exists student_id uuid;

create table if not exists public.classroom_student_thread_realtime_channels (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  thread_id uuid null references public.classroom_student_threads(id) on delete cascade,
  authorized_user_id uuid not null references public.users(id) on delete cascade,
  scope text not null,
  channel_name text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint classroom_student_thread_realtime_channels_scope_check
    check (scope in ('thread', 'manager_list')),
  constraint classroom_student_thread_realtime_channels_scope_thread_check
    check (
      (scope = 'thread' and thread_id is not null)
      or (scope = 'manager_list' and thread_id is null)
    )
);

alter table public.classroom_student_threads enable row level security;
alter table public.classroom_student_thread_messages enable row level security;
alter table public.classroom_student_thread_attachments enable row level security;
alter table public.classroom_student_thread_realtime_channels enable row level security;

revoke all on table public.classroom_student_threads from anon, authenticated;
revoke all on table public.classroom_student_thread_messages from anon, authenticated;
revoke all on table public.classroom_student_thread_attachments from anon, authenticated;
revoke all on table public.classroom_student_thread_realtime_channels from anon, authenticated;

grant all on table public.classroom_student_threads to service_role;
grant all on table public.classroom_student_thread_messages to service_role;
grant all on table public.classroom_student_thread_attachments to service_role;
grant all on table public.classroom_student_thread_realtime_channels to service_role;

drop index if exists public.classroom_student_threads_classroom_student_idx;

create unique index if not exists classroom_student_threads_realtime_token_idx
  on public.classroom_student_threads (realtime_token);

create index if not exists classroom_student_threads_student_idx
  on public.classroom_student_threads (student_id);

create index if not exists classroom_student_threads_classroom_idx
  on public.classroom_student_threads (classroom_id, updated_at desc);

drop index if exists public.classroom_student_thread_messages_thread_idx;

create index classroom_student_thread_messages_thread_idx
  on public.classroom_student_thread_messages (thread_id, created_at desc, id desc);

drop index if exists public.classroom_student_thread_messages_event_idx;

create index classroom_student_thread_messages_system_thread_idx
  on public.classroom_student_thread_messages (thread_id, created_at desc, id desc)
  where kind = 'system';

create index if not exists classroom_student_thread_messages_sender_idx
  on public.classroom_student_thread_messages (sender_id)
  where sender_id is not null;

create index if not exists classroom_student_thread_attachments_message_idx
  on public.classroom_student_thread_attachments (message_id);

create index if not exists classroom_student_thread_attachments_thread_idx
  on public.classroom_student_thread_attachments (thread_id, created_at desc);

create unique index if not exists classroom_student_thread_attachments_storage_idx
  on public.classroom_student_thread_attachments (storage_bucket, storage_path);

create index if not exists classroom_student_thread_attachments_uploader_idx
  on public.classroom_student_thread_attachments (uploader_id)
  where uploader_id is not null;

create index if not exists classroom_team_topic_assignments_topic_active_idx
  on public.classroom_team_topic_assignments (classroom_id, topic_id, status);

create index if not exists classroom_team_topic_assignments_topic_idx
  on public.classroom_team_topic_assignments (topic_id);

create index if not exists classroom_team_topic_assignments_assigned_by_idx
  on public.classroom_team_topic_assignments (assigned_by);

create index if not exists classroom_student_thread_realtime_channels_thread_idx
  on public.classroom_student_thread_realtime_channels (scope, thread_id, expires_at desc)
  where scope = 'thread';

create index if not exists classroom_student_thread_realtime_channels_manager_idx
  on public.classroom_student_thread_realtime_channels (scope, classroom_id, expires_at desc)
  where scope = 'manager_list';

create index if not exists classroom_student_thread_realtime_channels_classroom_fk_idx
  on public.classroom_student_thread_realtime_channels (classroom_id);

create index if not exists classroom_student_thread_realtime_channels_thread_fk_idx
  on public.classroom_student_thread_realtime_channels (thread_id);

create index if not exists classroom_student_thread_realtime_channels_user_idx
  on public.classroom_student_thread_realtime_channels (authorized_user_id, expires_at desc);

create index if not exists classroom_student_thread_realtime_channels_expiry_idx
  on public.classroom_student_thread_realtime_channels (expires_at);
