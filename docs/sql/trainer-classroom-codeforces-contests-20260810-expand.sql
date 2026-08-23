-- Expand migration for classroom Codeforces contest support.
-- Apply before deploying the matching server/client code.
--
-- This keeps classroom contest persistence private to classroom_contest_* tables,
-- preserves RLS, and does not grant anon/authenticated direct Data API access.

begin;

alter table public.classroom_contests
  drop constraint if exists classroom_contests_provider_check;

alter table public.classroom_contests
  add constraint classroom_contests_provider_check
  check (provider in ('vjudge', 'codeforces'));

alter table public.classroom_contest_handle_overrides
  add column if not exists provider text not null default 'vjudge';

update public.classroom_contest_handle_overrides
set provider = 'vjudge'
where provider is null
   or provider not in ('vjudge', 'codeforces');

alter table public.classroom_contest_handle_overrides
  drop constraint if exists classroom_contest_handle_overrides_provider_check;

alter table public.classroom_contest_handle_overrides
  add constraint classroom_contest_handle_overrides_provider_check
  check (provider in ('vjudge', 'codeforces'));

alter table public.classroom_contest_handle_overrides
  drop constraint if exists classroom_contest_handle_overrides_target_type_check;

alter table public.classroom_contest_handle_overrides
  add constraint classroom_contest_handle_overrides_target_type_check
  check (target_type in ('student', 'group', 'ignore'));

alter table public.classroom_contest_handle_overrides
  drop constraint if exists classroom_contest_handle_overrides_target_check;

alter table public.classroom_contest_handle_overrides
  add constraint classroom_contest_handle_overrides_target_check
  check (
    (target_type = 'student' and student_id is not null and group_id is null)
    or
    (target_type = 'group' and group_id is not null and student_id is null)
    or
    (target_type = 'ignore' and student_id is null and group_id is null)
  );

create unique index if not exists classroom_contest_handle_overrides_provider_handle_uidx
  on public.classroom_contest_handle_overrides (classroom_id, provider, lower(vjudge_handle));

create index if not exists classroom_contest_handle_overrides_provider_idx
  on public.classroom_contest_handle_overrides (classroom_id, provider);

create table if not exists public.classroom_codeforces_credentials (
  trainer_id uuid primary key references public.users(id) on delete cascade,
  api_key_ciphertext text not null check (length(api_key_ciphertext) between 10 and 4096),
  api_secret_ciphertext text not null check (length(api_secret_ciphertext) between 10 and 4096),
  api_key_hint text,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists classroom_codeforces_credentials_updated_at_idx
  on public.classroom_codeforces_credentials (updated_at);

revoke all on table public.classroom_codeforces_credentials from anon, authenticated;
alter table public.classroom_codeforces_credentials enable row level security;

-- Re-assert RLS for the existing public-schema classroom contest tables.
alter table public.classroom_contest_rooms enable row level security;
alter table public.classroom_contests enable row level security;
alter table public.classroom_contest_snapshots enable row level security;
alter table public.classroom_contest_handle_overrides enable row level security;
alter table public.classroom_contest_demerits enable row level security;
alter table public.classroom_contest_reports enable row level security;

commit;

-- Verification:
--
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid in (
--   'public.classroom_contests'::regclass,
--   'public.classroom_contest_handle_overrides'::regclass
-- )
-- and conname in (
--   'classroom_contests_provider_check',
--   'classroom_contest_handle_overrides_provider_check',
--   'classroom_contest_handle_overrides_target_type_check',
--   'classroom_contest_handle_overrides_target_check'
-- )
-- order by conname;
--
-- select indexname
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename = 'classroom_contest_handle_overrides'
-- order by indexname;
--
-- select relname, relrowsecurity
-- from pg_class
-- where relnamespace = 'public'::regnamespace
--   and relname in (
--     'classroom_codeforces_credentials',
--     'classroom_contest_rooms',
--     'classroom_contests',
--     'classroom_contest_snapshots',
--     'classroom_contest_handle_overrides',
--     'classroom_contest_demerits',
--     'classroom_contest_reports'
--   )
-- order by relname;
