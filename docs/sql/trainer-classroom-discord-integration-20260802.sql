-- Trainer/classroom Discord integration foundation.
-- Task: trainer-classroom-discord-integration-20260802
-- Apply after the student-thread instant Realtime SQL and before enabling
-- DISCORD_INTEGRATION_ENABLED in production.
-- Additive only; no destructive down migration is provided.

begin;

create extension if not exists pgcrypto;
create schema if not exists mcc_private;

revoke all on schema mcc_private from public;
revoke all on schema mcc_private from anon, authenticated;
grant usage on schema mcc_private to service_role;

alter table public.class_problems
  add column if not exists due_at timestamptz;

alter table public.classroom_team_topic_assignments
  add column if not exists due_at timestamptz;

alter table public.classroom_student_thread_messages
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists mutation_revision bigint not null default 0;

create table if not exists public.classroom_student_thread_message_revisions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.classroom_student_threads(id) on delete cascade,
  message_id uuid not null references public.classroom_student_thread_messages(id) on delete cascade,
  actor_user_id uuid null references public.users(id) on delete set null,
  mutation_revision bigint not null,
  mutation_type text not null,
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint classroom_student_thread_message_revisions_type_check
    check (mutation_type in ('created', 'edited', 'deleted')),
  constraint classroom_student_thread_message_revisions_source_check
    check (source in ('web', 'discord', 'system')),
  constraint classroom_student_thread_message_revisions_revision_positive
    check (mutation_revision > 0)
);

create unique index if not exists classroom_student_thread_message_revisions_unique
  on public.classroom_student_thread_message_revisions (message_id, mutation_revision);

create index if not exists classroom_student_thread_message_revisions_thread_idx
  on public.classroom_student_thread_message_revisions (thread_id, created_at desc);

create index if not exists class_problems_due_live_idx
  on public.class_problems (due_at)
  where due_at is not null and status <> 'solved';

create index if not exists classroom_topic_assignments_due_idx
  on public.classroom_team_topic_assignments (due_at)
  where due_at is not null and status = 'active';

create table if not exists mcc_private.discord_signup_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket text not null unique,
  email text null,
  user_id uuid null references public.users(id) on delete cascade,
  status text not null default 'pending',
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint discord_signup_tickets_status_check
    check (status in ('pending', 'consumed', 'expired', 'cancelled'))
);

create table if not exists mcc_private.discord_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  user_id uuid null references public.users(id) on delete cascade,
  signup_ticket_id uuid null references mcc_private.discord_signup_tickets(id) on delete cascade,
  flow text not null,
  scopes text[] not null default array[]::text[],
  redirect_uri text not null,
  return_to text null,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint discord_oauth_states_flow_check
    check (flow in ('connect', 'signup', 'trainer_guilds', 'bot_install')),
  constraint discord_oauth_states_actor_check
    check (user_id is not null or signup_ticket_id is not null)
);

create index if not exists discord_oauth_states_user_idx
  on mcc_private.discord_oauth_states (user_id, expires_at desc)
  where user_id is not null;

create index if not exists discord_oauth_states_expiry_idx
  on mcc_private.discord_oauth_states (expires_at)
  where consumed_at is null;

create table if not exists mcc_private.discord_user_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  discord_user_id text not null,
  username text null,
  global_name text null,
  avatar text null,
  scopes text[] not null default array[]::text[],
  encrypted_access_token text not null,
  encrypted_refresh_token text not null,
  token_expires_at timestamptz not null,
  status text not null default 'active',
  reauth_reason text null,
  connected_at timestamptz not null default now(),
  last_refresh_at timestamptz null,
  revoked_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint discord_user_connections_user_unique unique (user_id),
  constraint discord_user_connections_snowflake_check
    check (discord_user_id ~ '^[0-9]{5,32}$'),
  constraint discord_user_connections_status_check
    check (status in ('active', 'reauth_required', 'revoked'))
);

create unique index if not exists discord_user_connections_discord_active_unique
  on mcc_private.discord_user_connections (discord_user_id)
  where status <> 'revoked';

create index if not exists discord_user_connections_status_idx
  on mcc_private.discord_user_connections (status, token_expires_at);

create table if not exists mcc_private.discord_guild_installations (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null unique,
  guild_name text null,
  owner_discord_user_id text null,
  installed_by_user_id uuid null references public.users(id) on delete set null,
  bot_user_id text null,
  bot_permissions text null,
  granted_scopes text[] not null default array[]::text[],
  status text not null default 'pending_bot_install',
  health text not null default 'unknown',
  last_seen_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_guild_installations_guild_snowflake_check
    check (guild_id ~ '^[0-9]{5,32}$'),
  constraint discord_guild_installations_owner_snowflake_check
    check (owner_discord_user_id is null or owner_discord_user_id ~ '^[0-9]{5,32}$'),
  constraint discord_guild_installations_status_check
    check (status in ('pending_bot_install', 'installed', 'revoked', 'unavailable')),
  constraint discord_guild_installations_health_check
    check (health in ('unknown', 'healthy', 'permission_error', 'action_required', 'unavailable'))
);

create index if not exists discord_guild_installations_installed_by_idx
  on mcc_private.discord_guild_installations (installed_by_user_id)
  where installed_by_user_id is not null;

create table if not exists mcc_private.classroom_discord_bindings (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  guild_installation_id uuid not null references mcc_private.discord_guild_installations(id) on delete restrict,
  guild_id text not null,
  created_by_user_id uuid not null references public.users(id) on delete restrict,
  timezone text not null default 'Asia/Dhaka',
  provisioning_state text not null default 'provisioning',
  action_required_reason text null,
  staff_channel_id text null,
  privacy_acknowledged_at timestamptz null,
  last_reconciled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_discord_bindings_classroom_unique unique (classroom_id),
  constraint classroom_discord_bindings_guild_snowflake_check
    check (guild_id ~ '^[0-9]{5,32}$'),
  constraint classroom_discord_bindings_staff_snowflake_check
    check (staff_channel_id is null or staff_channel_id ~ '^[0-9]{5,32}$'),
  constraint classroom_discord_bindings_state_check
    check (provisioning_state in ('provisioning', 'ready', 'action_required', 'paused', 'disabled'))
);

create index if not exists classroom_discord_bindings_installation_idx
  on mcc_private.classroom_discord_bindings (guild_installation_id);

create index if not exists classroom_discord_bindings_guild_idx
  on mcc_private.classroom_discord_bindings (guild_id);

create index if not exists classroom_discord_bindings_creator_idx
  on mcc_private.classroom_discord_bindings (created_by_user_id);

create table if not exists mcc_private.classroom_discord_categories (
  id uuid primary key default gen_random_uuid(),
  binding_id uuid not null references mcc_private.classroom_discord_bindings(id) on delete cascade,
  category_id text not null,
  kind text not null,
  shard_index integer not null default 0,
  max_student_channels integer not null default 45,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_discord_categories_unique unique (binding_id, kind, shard_index),
  constraint classroom_discord_categories_category_unique unique (category_id),
  constraint classroom_discord_categories_snowflake_check
    check (category_id ~ '^[0-9]{5,32}$'),
  constraint classroom_discord_categories_kind_check
    check (kind in ('staff', 'students')),
  constraint classroom_discord_categories_capacity_check
    check (max_student_channels between 1 and 45)
);

create table if not exists mcc_private.classroom_discord_channels (
  id uuid primary key default gen_random_uuid(),
  binding_id uuid not null references mcc_private.classroom_discord_bindings(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  thread_id uuid null references public.classroom_student_threads(id) on delete cascade,
  student_id uuid null references public.users(id) on delete cascade,
  category_id uuid null references mcc_private.classroom_discord_categories(id) on delete set null,
  channel_id text not null,
  kind text not null default 'student_private',
  status text not null default 'active',
  archived_at timestamptz null,
  archive_until timestamptz null,
  last_reconciled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_discord_channels_channel_unique unique (channel_id),
  constraint classroom_discord_channels_student_unique unique (binding_id, student_id),
  constraint classroom_discord_channels_snowflake_check
    check (channel_id ~ '^[0-9]{5,32}$'),
  constraint classroom_discord_channels_kind_check
    check (kind in ('staff_private', 'student_private')),
  constraint classroom_discord_channels_status_check
    check (status in ('active', 'archived', 'deleted', 'action_required')),
  constraint classroom_discord_channels_student_shape_check
    check (
      (kind = 'staff_private' and student_id is null and thread_id is null)
      or (kind = 'student_private' and student_id is not null and thread_id is not null)
    )
);

create index if not exists classroom_discord_channels_binding_idx
  on mcc_private.classroom_discord_channels (binding_id, status);

create index if not exists classroom_discord_channels_classroom_idx
  on mcc_private.classroom_discord_channels (classroom_id, status);

create index if not exists classroom_discord_channels_thread_idx
  on mcc_private.classroom_discord_channels (thread_id)
  where thread_id is not null;

create index if not exists classroom_discord_channels_student_idx
  on mcc_private.classroom_discord_channels (student_id)
  where student_id is not null;

create table if not exists mcc_private.discord_message_links (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  channel_id text not null,
  discord_message_id text not null,
  thread_id uuid not null references public.classroom_student_threads(id) on delete cascade,
  thread_message_id uuid not null references public.classroom_student_thread_messages(id) on delete cascade,
  actor_user_id uuid null references public.users(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  edited_at timestamptz null,
  deleted_at timestamptz null,
  constraint discord_message_links_unique unique (guild_id, channel_id, discord_message_id),
  constraint discord_message_links_thread_message_unique unique (thread_message_id),
  constraint discord_message_links_snowflake_check
    check (
      guild_id ~ '^[0-9]{5,32}$'
      and channel_id ~ '^[0-9]{5,32}$'
      and discord_message_id ~ '^[0-9]{5,32}$'
    ),
  constraint discord_message_links_status_check
    check (status in ('active', 'edited', 'deleted'))
);

create index if not exists discord_message_links_thread_idx
  on mcc_private.discord_message_links (thread_id, created_at desc);

create index if not exists discord_message_links_actor_idx
  on mcc_private.discord_message_links (actor_user_id)
  where actor_user_id is not null;

create table if not exists mcc_private.discord_notification_rules (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  binding_id uuid null references mcc_private.classroom_discord_bindings(id) on delete cascade,
  rule_type text not null,
  enabled boolean not null default true,
  local_time time null,
  offset_minutes integer null,
  timezone text not null default 'Asia/Dhaka',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_notification_rules_unique unique (classroom_id, rule_type),
  constraint discord_notification_rules_type_check
    check (rule_type in (
      'morning_checkin',
      'morning_digest',
      'end_of_day_checkin',
      'end_of_day_digest',
      'session_reminder',
      'submission_reminder',
      'missed_submission',
      'pending_review_digest',
      'website_reply_alert'
    )),
  constraint discord_notification_rules_offset_check
    check (offset_minutes is null or offset_minutes between -10080 and 10080)
);

create index if not exists discord_notification_rules_binding_idx
  on mcc_private.discord_notification_rules (binding_id)
  where binding_id is not null;

create table if not exists mcc_private.discord_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid null references public.classrooms(id) on delete cascade,
  binding_id uuid null references mcc_private.classroom_discord_bindings(id) on delete cascade,
  user_id uuid null references public.users(id) on delete set null,
  kind text not null,
  status text not null default 'pending',
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  locked_at timestamptz null,
  locked_by text null,
  retry_after timestamptz null,
  last_error_code text null,
  last_error_at timestamptz null,
  delivered_at timestamptz null,
  dead_lettered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discord_delivery_jobs_idempotency_unique unique (idempotency_key),
  constraint discord_delivery_jobs_status_check
    check (status in ('pending', 'leased', 'retry', 'delivered', 'dead_letter', 'cancelled')),
  constraint discord_delivery_jobs_attempts_check
    check (attempts >= 0 and max_attempts between 1 and 20),
  constraint discord_delivery_jobs_kind_check
    check (kind in (
      'provision_classroom',
      'provision_student_channel',
      'archive_student_channel',
      'delete_archived_channel',
      'reconcile_classroom',
      'send_notification',
      'morning_checkin',
      'end_of_day_checkin',
      'session_reminder',
      'submission_reminder',
      'missed_submission',
      'pending_review_digest'
    ))
);

create index if not exists discord_delivery_jobs_ready_idx
  on mcc_private.discord_delivery_jobs (scheduled_for, created_at)
  where status in ('pending', 'retry');

create index if not exists discord_delivery_jobs_due_reminders_idx
  on mcc_private.discord_delivery_jobs (classroom_id, scheduled_for)
  where status in ('pending', 'retry')
    and kind in ('session_reminder', 'submission_reminder', 'missed_submission');

create index if not exists discord_delivery_jobs_binding_idx
  on mcc_private.discord_delivery_jobs (binding_id, status, scheduled_for)
  where binding_id is not null;

create table if not exists mcc_private.classroom_daily_checkins (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  channel_id text null,
  source text not null,
  period text not null,
  checkin_date date not null,
  goals text null,
  completed_work text null,
  blockers text null,
  next_steps text null,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_daily_checkins_unique unique (classroom_id, student_id, checkin_date, period),
  constraint classroom_daily_checkins_source_check
    check (source in ('web', 'discord')),
  constraint classroom_daily_checkins_period_check
    check (period in ('morning', 'end_of_day')),
  constraint classroom_daily_checkins_channel_check
    check (channel_id is null or channel_id ~ '^[0-9]{5,32}$')
);

create index if not exists classroom_daily_checkins_student_idx
  on mcc_private.classroom_daily_checkins (student_id, checkin_date desc);

create table if not exists mcc_private.discord_command_audit (
  id uuid primary key default gen_random_uuid(),
  guild_id text null,
  channel_id text null,
  interaction_id text null,
  actor_user_id uuid null references public.users(id) on delete set null,
  discord_user_id text null,
  classroom_id uuid null references public.classrooms(id) on delete cascade,
  command_name text not null,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint discord_command_audit_status_check
    check (status in ('received', 'accepted', 'rejected', 'failed')),
  constraint discord_command_audit_snowflake_check
    check (
      (guild_id is null or guild_id ~ '^[0-9]{5,32}$')
      and (channel_id is null or channel_id ~ '^[0-9]{5,32}$')
      and (interaction_id is null or interaction_id ~ '^[0-9]{5,32}$')
      and (discord_user_id is null or discord_user_id ~ '^[0-9]{5,32}$')
    )
);

create index if not exists discord_command_audit_classroom_idx
  on mcc_private.discord_command_audit (classroom_id, created_at desc)
  where classroom_id is not null;

create index if not exists discord_command_audit_actor_idx
  on mcc_private.discord_command_audit (actor_user_id, created_at desc)
  where actor_user_id is not null;

alter table public.classroom_student_thread_message_revisions enable row level security;
alter table mcc_private.discord_signup_tickets enable row level security;
alter table mcc_private.discord_oauth_states enable row level security;
alter table mcc_private.discord_user_connections enable row level security;
alter table mcc_private.discord_guild_installations enable row level security;
alter table mcc_private.classroom_discord_bindings enable row level security;
alter table mcc_private.classroom_discord_categories enable row level security;
alter table mcc_private.classroom_discord_channels enable row level security;
alter table mcc_private.discord_message_links enable row level security;
alter table mcc_private.discord_notification_rules enable row level security;
alter table mcc_private.discord_delivery_jobs enable row level security;
alter table mcc_private.classroom_daily_checkins enable row level security;
alter table mcc_private.discord_command_audit enable row level security;

revoke all on table public.classroom_student_thread_message_revisions from anon, authenticated;
revoke all on all tables in schema mcc_private from anon, authenticated;

grant all on table public.classroom_student_thread_message_revisions to service_role;
grant all on all tables in schema mcc_private to service_role;

commit;
