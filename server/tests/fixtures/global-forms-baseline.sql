-- Minimal synthetic baseline for disposable Postgres integration checks only.
-- This is not a production bootstrap or migration.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(), email text unique not null,
  password text, full_name text, mist_id numeric, phone text, batch_name text,
  cf_id text, cf_verified boolean default false,
  vjudge_id text, vjudge_verified boolean default false,
  codechef_id text, atcoder_id text, tshirt_size text, mist_id_card text,
  admin boolean default false, trainer boolean default false,
  granted boolean default true, is_pre_enrolled boolean default false,
  profile_pic text, created_at timestamptz default now()
);
create table if not exists public.classroom_students (
  id uuid primary key default gen_random_uuid(), classroom_id uuid,
  student_id uuid references public.users(id), claimed_user_id uuid references public.users(id),
  enrollment_status text default 'pre_enrolled', pre_enrollment_email text,
  pre_enrollment_method text, pre_enrollment_identifier text, link_requested_at timestamptz
);
create table if not exists public."Contest_report_room" (
  id uuid primary key default gen_random_uuid(), "Room Name" text,
  contest_type text default 'TFC', tfc_room_id uuid, tfc_percentage numeric default 0,
  tsc_percentage numeric default 100, created_at timestamptz default now()
);
create table if not exists public."Contest_room_contests" (
  id uuid primary key default gen_random_uuid(), room_id uuid references public."Contest_report_room"(id),
  contest_id text, provider text default 'vjudge', title text, weight numeric default 1,
  formula_key text, sort_order integer default 0, created_at timestamptz default now()
);
create table if not exists public."Public_contest_report" (
  id uuid primary key default gen_random_uuid(), "Shared_contest_id" text,
  "JSON_string" text, scoring_config_version integer default 0, is_stale boolean default false,
  "Updated_at" timestamptz default now(), created_at timestamptz default now()
);

alter table public."Contest_room_contests"
  add column if not exists contest_name text,
  add column if not exists merge_group_id uuid,
  add column if not exists codeforces_source_type text,
  add column if not exists codeforces_group_identity_mode text;
create table if not exists public.contest_report_merge_groups (
  id uuid primary key default gen_random_uuid(), room_id uuid references public."Contest_report_room"(id),
  name text, formula_key text, formula text, solved_score_formula text, penalty_score_formula text,
  created_at timestamptz default now()
);
create table if not exists public.contest_report_scoring_configs (
  room_id uuid primary key references public."Contest_report_room"(id), formula text,
  solved_score_formula text, penalty_score_formula text, score_precision integer default 2,
  sort_rules jsonb default '[]', excluded_unit_keys jsonb default '[]',
  adjustment_rules jsonb default '[]', drop_worst_count integer default 0, version integer default 1
);
create table if not exists public."Demerit" (
  id uuid primary key default gen_random_uuid(),contest_id text,vjudge_id text,
  demerit_point numeric,created_at timestamptz default now()
);
create table if not exists public.contest_report_codeforces_identity_mappings (
  id uuid primary key default gen_random_uuid(),contest_item_id uuid,
  provider_username_normalized text,student_user_id uuid
);
