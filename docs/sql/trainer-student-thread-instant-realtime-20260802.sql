-- Trainer/student thread instant Realtime migration
-- Task: trainer-student-thread-instant-realtime-20260802
-- Apply before deploying the matching server/client code.
-- This migration is additive and intentionally has no destructive down migration.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Runtime schema baselines formerly executed from classroom request handlers.
-- ---------------------------------------------------------------------------

create table if not exists public.user_settings (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings
  add column if not exists classroom_update_priorities text[] not null default array[
    'time_exceeded',
    'student_solution_submitted',
    'student_needs_review',
    'problem_progress_changed',
    'thread_reply',
    'new_problem',
    'teacher_feedback',
    'solution_status_changed',
    'topic_or_resource_updated'
  ]::text[],
  add column if not exists classroom_email_notifications_enabled boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- The primary key already supplies this index.
drop index if exists public.user_settings_user_id_idx;

create table if not exists public.classroom_problem_threads (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  class_id uuid null references public.classes(id) on delete cascade,
  class_problem_id uuid null references public.class_problems(id) on delete cascade,
  topic_assignment_id uuid null references public.classroom_team_topic_assignments(id) on delete cascade,
  topic_problem_id uuid null references public.classroom_topic_problems(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.classroom_problem_threads
  drop constraint if exists classroom_problem_threads_scope_check;

alter table public.classroom_problem_threads
  add constraint classroom_problem_threads_scope_check check (
    (
      class_problem_id is not null
      and topic_assignment_id is null
      and topic_problem_id is null
    )
    or
    (
      class_problem_id is null
      and topic_assignment_id is null
      and topic_problem_id is not null
    )
    or
    (
      class_problem_id is null
      and topic_assignment_id is not null
      and topic_problem_id is not null
    )
  );

create unique index if not exists classroom_problem_threads_class_problem_idx
  on public.classroom_problem_threads (class_problem_id)
  where class_problem_id is not null;

create unique index if not exists classroom_problem_threads_topic_source_problem_idx
  on public.classroom_problem_threads (classroom_id, topic_problem_id)
  where topic_assignment_id is null and topic_problem_id is not null;

create unique index if not exists classroom_problem_threads_topic_problem_idx
  on public.classroom_problem_threads (topic_assignment_id, topic_problem_id)
  where topic_assignment_id is not null and topic_problem_id is not null;

create index if not exists classroom_problem_threads_classroom_idx
  on public.classroom_problem_threads (classroom_id, updated_at desc);

create table if not exists public.classroom_problem_thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.classroom_problem_threads(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null default 'message',
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_solution boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists classroom_problem_thread_messages_thread_idx
  on public.classroom_problem_thread_messages (thread_id, created_at asc);

create index if not exists classroom_problem_thread_messages_user_idx
  on public.classroom_problem_thread_messages (user_id, created_at desc);

create table if not exists public.classroom_problem_thread_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.classroom_problem_thread_messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  constraint classroom_problem_thread_reactions_unique unique (message_id, user_id, reaction)
);

create index if not exists classroom_problem_thread_reactions_message_idx
  on public.classroom_problem_thread_reactions (message_id);

create table if not exists public.classroom_update_read_receipts (
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  update_key text not null,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (classroom_id, user_id, update_key)
);

create index if not exists classroom_update_read_receipts_user_idx
  on public.classroom_update_read_receipts (user_id, classroom_id, read_at desc);

alter table public.users
  add column if not exists is_pre_enrolled boolean not null default false;

alter table public.classroom_students
  add column if not exists enrollment_status text not null default 'active',
  add column if not exists claimed_user_id uuid null,
  add column if not exists pre_enrollment_method text null,
  add column if not exists pre_enrollment_identifier text null,
  add column if not exists pre_enrollment_email text null,
  add column if not exists link_requested_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'classroom_students_enrollment_status_check'
      and conrelid = 'public.classroom_students'::regclass
  ) then
    alter table public.classroom_students
      add constraint classroom_students_enrollment_status_check
      check (enrollment_status in ('active', 'pre_enrolled', 'link_pending'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'classroom_students_claimed_user_id_fkey'
      and conrelid = 'public.classroom_students'::regclass
  ) then
    alter table public.classroom_students
      add constraint classroom_students_claimed_user_id_fkey
      foreign key (claimed_user_id) references public.users(id) on delete set null;
  end if;
end
$$;

create index if not exists users_pre_enrolled_mist_id_idx
  on public.users (mist_id)
  where is_pre_enrolled = true and mist_id is not null;

create index if not exists classroom_students_status_student_idx
  on public.classroom_students (student_id, enrollment_status);

create index if not exists classroom_students_claimed_user_idx
  on public.classroom_students (claimed_user_id)
  where claimed_user_id is not null;

create index if not exists classroom_students_pre_enrollment_email_idx
  on public.classroom_students (lower(pre_enrollment_email))
  where pre_enrollment_email is not null;

create index if not exists classroom_students_pre_enrollment_identifier_idx
  on public.classroom_students (classroom_id, pre_enrollment_method, lower(pre_enrollment_identifier))
  where pre_enrollment_identifier is not null;

-- ---------------------------------------------------------------------------
-- One thread per active real classroom student, provisioned outside reads.
-- ---------------------------------------------------------------------------

insert into public.classroom_student_threads (classroom_id, student_id)
select cs.classroom_id, cs.student_id
from public.classroom_students cs
join public.users u on u.id = cs.student_id
where cs.enrollment_status = 'active'
  and u.admin is not true
  and u.trainer is not true
  and u.is_pre_enrolled is not true
on conflict (classroom_id, student_id) do nothing;

create or replace function public.provision_classroom_student_thread_on_membership()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.enrollment_status = 'active'
     and exists (
       select 1
       from public.users u
       where u.id = new.student_id
         and u.admin is not true
         and u.trainer is not true
         and u.is_pre_enrolled is not true
     ) then
    insert into public.classroom_student_threads (classroom_id, student_id)
    values (new.classroom_id, new.student_id)
    on conflict (classroom_id, student_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.provision_classroom_student_thread_on_membership() from public;

drop trigger if exists provision_classroom_student_thread_after_membership on public.classroom_students;
create trigger provision_classroom_student_thread_after_membership
after insert or update of classroom_id, student_id, enrollment_status
on public.classroom_students
for each row
execute function public.provision_classroom_student_thread_on_membership();

-- ---------------------------------------------------------------------------
-- Durable ordering and send idempotency.
-- ---------------------------------------------------------------------------

alter table public.classroom_student_threads
  add column if not exists revision bigint not null default 0;

alter table public.classroom_student_thread_messages
  add column if not exists thread_revision bigint,
  add column if not exists client_message_id text;

update public.classroom_student_thread_messages
set client_message_id = nullif(left(metadata->>'client_message_id', 160), '')
where client_message_id is null
  and nullif(metadata->>'client_message_id', '') is not null;

with ranked as (
  select
    id,
    row_number() over (
      partition by thread_id
      order by created_at asc, id asc
    )::bigint as revision
  from public.classroom_student_thread_messages
)
update public.classroom_student_thread_messages m
set thread_revision = ranked.revision
from ranked
where ranked.id = m.id
  and m.thread_revision is null;

update public.classroom_student_threads t
set revision = coalesce(message_revision.max_revision, 0)
from (
  select thread_id, max(thread_revision) as max_revision
  from public.classroom_student_thread_messages
  group by thread_id
) message_revision
where message_revision.thread_id = t.id
  and t.revision is distinct from message_revision.max_revision;

-- Compatibility for an old server during rolling deployment. New code supplies
-- thread_revision explicitly; old inserts are assigned one atomically here.
create or replace function public.assign_classroom_student_thread_message_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.thread_revision is null then
    update public.classroom_student_threads
    set revision = revision + 1,
        updated_at = now()
    where id = new.thread_id
    returning revision into new.thread_revision;
  end if;

  if new.client_message_id is null then
    new.client_message_id := nullif(left(new.metadata->>'client_message_id', 160), '');
  end if;

  return new;
end;
$$;

revoke all on function public.assign_classroom_student_thread_message_revision() from public;

drop trigger if exists assign_classroom_student_thread_message_revision
  on public.classroom_student_thread_messages;
create trigger assign_classroom_student_thread_message_revision
before insert on public.classroom_student_thread_messages
for each row
execute function public.assign_classroom_student_thread_message_revision();

alter table public.classroom_student_thread_messages
  alter column thread_revision set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'classroom_student_thread_messages_revision_positive'
      and conrelid = 'public.classroom_student_thread_messages'::regclass
  ) then
    alter table public.classroom_student_thread_messages
      add constraint classroom_student_thread_messages_revision_positive
      check (thread_revision > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'classroom_student_thread_messages_client_id_length'
      and conrelid = 'public.classroom_student_thread_messages'::regclass
  ) then
    alter table public.classroom_student_thread_messages
      add constraint classroom_student_thread_messages_client_id_length
      check (client_message_id is null or length(client_message_id) between 1 and 160);
  end if;
end
$$;

create unique index if not exists classroom_student_thread_messages_revision_unique
  on public.classroom_student_thread_messages (thread_id, thread_revision);

create unique index if not exists classroom_student_thread_messages_client_id_unique
  on public.classroom_student_thread_messages (thread_id, sender_id, client_message_id)
  where sender_id is not null and client_message_id is not null;

create index if not exists classroom_student_thread_messages_catchup_idx
  on public.classroom_student_thread_messages (thread_id, thread_revision asc);

-- ---------------------------------------------------------------------------
-- One renewable registry row per authorized user/scope.
-- ---------------------------------------------------------------------------

alter table public.classroom_student_thread_realtime_channels
  add column if not exists updated_at timestamptz not null default now();

with duplicates as (
  select
    id,
    row_number() over (
      partition by authorized_user_id, scope, coalesce(thread_id, classroom_id)
      order by expires_at desc, created_at desc, id desc
    ) as row_number
  from public.classroom_student_thread_realtime_channels
)
delete from public.classroom_student_thread_realtime_channels channels
using duplicates
where duplicates.id = channels.id
  and duplicates.row_number > 1;

create unique index if not exists classroom_student_thread_realtime_channels_thread_scope_unique
  on public.classroom_student_thread_realtime_channels (authorized_user_id, thread_id)
  where scope = 'thread';

create unique index if not exists classroom_student_thread_realtime_channels_manager_scope_unique
  on public.classroom_student_thread_realtime_channels (authorized_user_id, classroom_id)
  where scope = 'manager_list';

-- ---------------------------------------------------------------------------
-- Private, identity-bound, receive-only Supabase Realtime authorization.
-- The realtime schema itself remains untouched except for its supported policy.
-- ---------------------------------------------------------------------------

create schema if not exists mcc_private;
revoke all on schema mcc_private from public;
grant usage on schema mcc_private to anon;

create or replace function mcc_private.can_receive_classroom_thread_broadcast()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classroom_student_thread_realtime_channels channel
    where channel.authorized_user_id = (select auth.uid())
      and channel.channel_name = (select realtime.topic())
      and channel.expires_at > now()
  );
$$;

revoke all on function mcc_private.can_receive_classroom_thread_broadcast() from public;
revoke all on function mcc_private.can_receive_classroom_thread_broadcast() from authenticated;
revoke all on function mcc_private.can_receive_classroom_thread_broadcast() from service_role;
grant execute on function mcc_private.can_receive_classroom_thread_broadcast() to anon;

drop policy if exists "mcc users receive authorized classroom thread broadcasts"
  on realtime.messages;

create policy "mcc users receive authorized classroom thread broadcasts"
on realtime.messages
for select
to anon
using (
  realtime.messages.extension = 'broadcast'
  and (select mcc_private.can_receive_classroom_thread_broadcast())
);

-- No INSERT policy is created: browsers are receive-only.

alter table public.classroom_student_threads enable row level security;
alter table public.classroom_student_thread_messages enable row level security;
alter table public.classroom_student_thread_attachments enable row level security;
alter table public.classroom_student_thread_realtime_channels enable row level security;

revoke all on table public.classroom_student_threads from anon, authenticated;
revoke all on table public.classroom_student_thread_messages from anon, authenticated;
revoke all on table public.classroom_student_thread_attachments from anon, authenticated;
revoke all on table public.classroom_student_thread_realtime_channels from anon, authenticated;

commit;
