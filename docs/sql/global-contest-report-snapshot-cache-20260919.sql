begin;

create table if not exists public.global_contest_report_snapshots (
  id bigint generated always as identity primary key,
  room_id uuid not null references public."Contest_report_room"(id) on delete cascade,
  contest_item_id uuid null references public."Contest_room_contests"(id) on delete cascade,
  snapshot jsonb not null,
  missing_contests jsonb not null default '[]'::jsonb,
  scoring_config_version integer not null default 0,
  is_stale boolean not null default false,
  generated_by uuid null references public.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  constraint global_contest_report_snapshots_snapshot_object_check
    check (jsonb_typeof(snapshot) = 'object'),
  constraint global_contest_report_snapshots_missing_array_check
    check (jsonb_typeof(missing_contests) = 'array')
);

create unique index if not exists global_contest_report_snapshots_full_room_uidx
  on public.global_contest_report_snapshots (room_id)
  where contest_item_id is null;

create unique index if not exists global_contest_report_snapshots_room_item_uidx
  on public.global_contest_report_snapshots (room_id, contest_item_id)
  where contest_item_id is not null;

create index if not exists global_contest_report_snapshots_contest_item_idx
  on public.global_contest_report_snapshots (contest_item_id)
  where contest_item_id is not null;

create index if not exists global_contest_report_snapshots_generated_by_idx
  on public.global_contest_report_snapshots (generated_by)
  where generated_by is not null;

alter table public.global_contest_report_snapshots enable row level security;
alter table public.global_contest_report_snapshots force row level security;

revoke all on table public.global_contest_report_snapshots from anon, authenticated;
revoke all on sequence public.global_contest_report_snapshots_id_seq from anon, authenticated;

commit;

-- Verification:
-- select relname, relrowsecurity, relforcerowsecurity
-- from pg_class
-- where oid = 'public.global_contest_report_snapshots'::regclass;
--
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename = 'global_contest_report_snapshots'
-- order by indexname;
--
-- select grantee, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name = 'global_contest_report_snapshots'
--   and grantee in ('anon', 'authenticated');

