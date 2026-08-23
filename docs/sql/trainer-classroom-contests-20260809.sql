-- Trainer classroom-scoped VJudge contest reports.
-- Task: classroom-scoped-contest-reports-20260809
-- Apply before deploying the matching server/client code.
--
-- This migration is additive. It intentionally does not alter the global
-- Contest_report_room, Contest_room_contests, Demerit, or Public_contest_report
-- tables used by the public contest-report system.

begin;

create extension if not exists pgcrypto;

create table if not exists public.classroom_contest_rooms (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  name text not null,
  contest_type text not null default 'TFC',
  tfc_reference_room_id uuid null references public.classroom_contest_rooms(id) on delete set null,
  tfc_percentage numeric not null default 0,
  tsc_percentage numeric not null default 100,
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_contest_rooms_name_not_blank check (length(btrim(name)) > 0),
  constraint classroom_contest_rooms_type_check check (contest_type in ('TFC', 'TSC', 'TPC')),
  constraint classroom_contest_rooms_tfc_percentage_check check (tfc_percentage between 0 and 100),
  constraint classroom_contest_rooms_tsc_percentage_check check (tsc_percentage between 0 and 100),
  constraint classroom_contest_rooms_no_self_reference check (
    tfc_reference_room_id is null or tfc_reference_room_id <> id
  ),
  constraint classroom_contest_rooms_tsc_reference_check check (
    contest_type <> 'TSC'
    or tfc_percentage = 0
    or tfc_reference_room_id is not null
  )
);

create index if not exists classroom_contest_rooms_classroom_idx
  on public.classroom_contest_rooms (classroom_id, created_at desc);

create index if not exists classroom_contest_rooms_reference_idx
  on public.classroom_contest_rooms (tfc_reference_room_id)
  where tfc_reference_room_id is not null;

create table if not exists public.classroom_contests (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  room_id uuid not null references public.classroom_contest_rooms(id) on delete cascade,
  provider text not null default 'vjudge',
  external_contest_id text not null,
  title text not null,
  weight numeric not null default 1,
  problem_weights jsonb not null default '[]'::jsonb,
  last_fetched_at timestamptz null,
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_contests_provider_check check (provider = 'vjudge'),
  constraint classroom_contests_external_id_check check (external_contest_id ~ '^[0-9]+$'),
  constraint classroom_contests_title_not_blank check (length(btrim(title)) > 0),
  constraint classroom_contests_weight_check check (weight >= 0),
  constraint classroom_contests_problem_weights_array check (jsonb_typeof(problem_weights) = 'array'),
  constraint classroom_contests_room_external_unique unique (room_id, provider, external_contest_id)
);

create index if not exists classroom_contests_classroom_room_idx
  on public.classroom_contests (classroom_id, room_id, created_at asc);

create index if not exists classroom_contests_external_idx
  on public.classroom_contests (provider, external_contest_id);

create table if not exists public.classroom_contest_snapshots (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  room_id uuid not null references public.classroom_contest_rooms(id) on delete cascade,
  contest_id uuid not null references public.classroom_contests(id) on delete cascade,
  external_contest_id text not null,
  rank_data jsonb not null,
  fetched_by uuid null references public.users(id) on delete set null,
  fetched_at timestamptz not null default now(),
  constraint classroom_contest_snapshots_rank_object check (jsonb_typeof(rank_data) = 'object')
);

create index if not exists classroom_contest_snapshots_latest_idx
  on public.classroom_contest_snapshots (contest_id, fetched_at desc);

create index if not exists classroom_contest_snapshots_room_idx
  on public.classroom_contest_snapshots (room_id, fetched_at desc);

create table if not exists public.classroom_contest_handle_overrides (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  vjudge_handle text not null,
  target_type text not null,
  student_id uuid null references public.users(id) on delete cascade,
  group_id uuid null references public.trainer_teams(id) on delete cascade,
  note text null,
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_contest_handle_overrides_handle_not_blank check (length(btrim(vjudge_handle)) > 0),
  constraint classroom_contest_handle_overrides_target_type_check check (target_type in ('student', 'group')),
  constraint classroom_contest_handle_overrides_target_check check (
    (target_type = 'student' and student_id is not null and group_id is null)
    or
    (target_type = 'group' and group_id is not null and student_id is null)
  )
);

create unique index if not exists classroom_contest_handle_overrides_handle_uidx
  on public.classroom_contest_handle_overrides (classroom_id, lower(vjudge_handle));

create index if not exists classroom_contest_handle_overrides_student_idx
  on public.classroom_contest_handle_overrides (student_id)
  where student_id is not null;

create index if not exists classroom_contest_handle_overrides_group_idx
  on public.classroom_contest_handle_overrides (group_id)
  where group_id is not null;

create table if not exists public.classroom_contest_demerits (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  room_id uuid not null references public.classroom_contest_rooms(id) on delete cascade,
  contest_id uuid not null references public.classroom_contests(id) on delete cascade,
  vjudge_handle text not null,
  points integer not null,
  reason text not null,
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_contest_demerits_handle_not_blank check (length(btrim(vjudge_handle)) > 0),
  constraint classroom_contest_demerits_points_check check (points >= 0),
  constraint classroom_contest_demerits_reason_not_blank check (length(btrim(reason)) > 0)
);

create index if not exists classroom_contest_demerits_room_idx
  on public.classroom_contest_demerits (room_id, created_at desc);

create index if not exists classroom_contest_demerits_contest_handle_idx
  on public.classroom_contest_demerits (contest_id, lower(vjudge_handle));

create table if not exists public.classroom_contest_reports (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  room_id uuid not null references public.classroom_contest_rooms(id) on delete cascade,
  data jsonb not null,
  visible_to_students boolean not null default false,
  generated_by uuid null references public.users(id) on delete set null,
  shared_by uuid null references public.users(id) on delete set null,
  shared_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_contest_reports_data_object check (jsonb_typeof(data) = 'object'),
  constraint classroom_contest_reports_room_unique unique (room_id)
);

create index if not exists classroom_contest_reports_classroom_idx
  on public.classroom_contest_reports (classroom_id, updated_at desc);

create index if not exists classroom_contest_reports_visible_idx
  on public.classroom_contest_reports (classroom_id, room_id)
  where visible_to_students = true;

-- Access is enforced by authenticated Hono routes. RLS stays enabled as
-- defense-in-depth for Supabase public schema/Data API exposure; no direct
-- anon/authenticated policies are required for this server-owned workflow.
alter table public.classroom_contest_rooms enable row level security;
alter table public.classroom_contests enable row level security;
alter table public.classroom_contest_snapshots enable row level security;
alter table public.classroom_contest_handle_overrides enable row level security;
alter table public.classroom_contest_demerits enable row level security;
alter table public.classroom_contest_reports enable row level security;

commit;

-- Verification:
--
-- select table_name
-- from information_schema.tables
-- where table_schema = 'public'
--   and table_name like 'classroom_contest_%'
-- order by table_name;
--
-- select indexname, tablename
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename like 'classroom_contest_%'
-- order by tablename, indexname;
