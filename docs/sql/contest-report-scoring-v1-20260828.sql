-- Contest report scoring configuration v1.
-- Task: contest-report-scoring-merge-v1-20260828
-- Apply before deploying the matching server/client code.
--
-- This migration adds scoring configuration and composite result-unit
-- persistence for global/admin contest rooms and classroom/trainer contest
-- rooms. Existing generated JSON snapshots are preserved.

begin;

create extension if not exists pgcrypto;

create table if not exists public.contest_report_merge_groups (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public."Contest_report_room"(id) on delete cascade,
  name text not null,
  formula_key text not null,
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contest_report_merge_groups_name_not_blank check (length(btrim(name)) > 0),
  constraint contest_report_merge_groups_formula_key_check check (formula_key ~ '^[a-z][a-z0-9_]{0,47}$'),
  constraint contest_report_merge_groups_room_id_id_unique unique (room_id, id),
  constraint contest_report_merge_groups_room_formula_key_unique unique (room_id, formula_key)
);

create index if not exists contest_report_merge_groups_room_idx
  on public.contest_report_merge_groups (room_id, created_at asc);

create index if not exists contest_report_merge_groups_created_by_idx
  on public.contest_report_merge_groups (created_by)
  where created_by is not null;

create index if not exists contest_report_merge_groups_updated_by_idx
  on public.contest_report_merge_groups (updated_by)
  where updated_by is not null;

create table if not exists public.contest_report_scoring_configs (
  room_id uuid primary key references public."Contest_report_room"(id) on delete cascade,
  formula text not null,
  score_precision integer not null default 2,
  sort_rules jsonb not null default '[{"key":"score","direction":"desc"},{"key":"effective_penalty","direction":"asc"},{"key":"attended_count","direction":"desc"}]'::jsonb,
  excluded_unit_keys jsonb not null default '[]'::jsonb,
  drop_worst_count integer not null default 0,
  version integer not null default 1,
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contest_report_scoring_configs_formula_not_blank check (length(btrim(formula)) > 0 and length(formula) <= 1000),
  constraint contest_report_scoring_configs_precision_check check (score_precision between 0 and 4),
  constraint contest_report_scoring_configs_sort_rules_array check (jsonb_typeof(sort_rules) = 'array' and jsonb_array_length(sort_rules) <= 8),
  constraint contest_report_scoring_configs_excluded_array check (jsonb_typeof(excluded_unit_keys) = 'array'),
  constraint contest_report_scoring_configs_drop_worst_check check (drop_worst_count >= 0),
  constraint contest_report_scoring_configs_version_check check (version >= 1)
);

create index if not exists contest_report_scoring_configs_created_by_idx
  on public.contest_report_scoring_configs (created_by)
  where created_by is not null;

create index if not exists contest_report_scoring_configs_updated_by_idx
  on public.contest_report_scoring_configs (updated_by)
  where updated_by is not null;

alter table public."Contest_report_room"
  add column if not exists contest_type text not null default 'TFC',
  add column if not exists tfc_room_id uuid null,
  add column if not exists tfc_percentage numeric not null default 0,
  add column if not exists tsc_percentage numeric not null default 100;

alter table public."Contest_room_contests"
  drop constraint if exists "Contest_room_contests_contest_id_key";

drop index if exists public."Contest_room_contests_contest_id_key";

create unique index if not exists contest_room_contests_room_id_contest_id_uidx
  on public."Contest_room_contests" (room_id, contest_id);

alter table public."Contest_room_contests"
  add column if not exists formula_key text,
  add column if not exists merge_group_id uuid null references public.contest_report_merge_groups(id) on delete set null;

with normalized as (
  select
    id,
    room_id,
    lower(regexp_replace('c' || coalesce(nullif(contest_id::text, ''), left(id::text, 12)), '[^a-z0-9_]+', '_', 'g')) as base_key,
    row_number() over (
      partition by room_id,
      lower(regexp_replace('c' || coalesce(nullif(contest_id::text, ''), left(id::text, 12)), '[^a-z0-9_]+', '_', 'g'))
      order by created_at asc, id asc
    ) as duplicate_index
  from public."Contest_room_contests"
)
update public."Contest_room_contests" item
set formula_key = case
  when normalized.duplicate_index = 1 then left(normalized.base_key, 48)
  else left(normalized.base_key, greatest(1, 48 - length('_' || normalized.duplicate_index::text))) || '_' || normalized.duplicate_index::text
end
from normalized
where item.id = normalized.id
  and item.formula_key is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contest_room_contests_formula_key_check'
      and conrelid = 'public."Contest_room_contests"'::regclass
  ) then
    alter table public."Contest_room_contests"
      add constraint contest_room_contests_formula_key_check
      check (formula_key ~ '^[a-z][a-z0-9_]{0,47}$');
  end if;
end $$;

alter table public."Contest_room_contests"
  alter column formula_key set not null;

create index if not exists contest_room_contests_room_idx
  on public."Contest_room_contests" (room_id, created_at asc, id asc);

create index if not exists contest_room_contests_merge_group_idx
  on public."Contest_room_contests" (merge_group_id)
  where merge_group_id is not null;

create unique index if not exists contest_room_contests_room_formula_key_uidx
  on public."Contest_room_contests" (room_id, formula_key)
  where merge_group_id is null;

create table if not exists public.classroom_contest_merge_groups (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  room_id uuid not null references public.classroom_contest_rooms(id) on delete cascade,
  name text not null,
  formula_key text not null,
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_contest_merge_groups_name_not_blank check (length(btrim(name)) > 0),
  constraint classroom_contest_merge_groups_formula_key_check check (formula_key ~ '^[a-z][a-z0-9_]{0,47}$'),
  constraint classroom_contest_merge_groups_scope_id_unique unique (classroom_id, room_id, id),
  constraint classroom_contest_merge_groups_scope_formula_key_unique unique (classroom_id, room_id, formula_key)
);

create index if not exists classroom_contest_merge_groups_classroom_room_idx
  on public.classroom_contest_merge_groups (classroom_id, room_id, created_at asc);

create index if not exists classroom_contest_merge_groups_room_idx
  on public.classroom_contest_merge_groups (room_id, created_at asc);

create index if not exists classroom_contest_merge_groups_created_by_idx
  on public.classroom_contest_merge_groups (created_by)
  where created_by is not null;

create index if not exists classroom_contest_merge_groups_updated_by_idx
  on public.classroom_contest_merge_groups (updated_by)
  where updated_by is not null;

create table if not exists public.classroom_contest_scoring_configs (
  room_id uuid primary key references public.classroom_contest_rooms(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  formula text not null,
  score_precision integer not null default 0,
  sort_rules jsonb not null default '[{"key":"total_solved","direction":"desc"},{"key":"attended_count","direction":"desc"}]'::jsonb,
  excluded_unit_keys jsonb not null default '[]'::jsonb,
  drop_worst_count integer not null default 0,
  version integer not null default 1,
  created_by uuid null references public.users(id) on delete set null,
  updated_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_contest_scoring_configs_formula_not_blank check (length(btrim(formula)) > 0 and length(formula) <= 1000),
  constraint classroom_contest_scoring_configs_precision_check check (score_precision between 0 and 4),
  constraint classroom_contest_scoring_configs_sort_rules_array check (jsonb_typeof(sort_rules) = 'array' and jsonb_array_length(sort_rules) <= 8),
  constraint classroom_contest_scoring_configs_excluded_array check (jsonb_typeof(excluded_unit_keys) = 'array'),
  constraint classroom_contest_scoring_configs_drop_worst_check check (drop_worst_count >= 0),
  constraint classroom_contest_scoring_configs_version_check check (version >= 1)
);

create index if not exists classroom_contest_scoring_configs_classroom_idx
  on public.classroom_contest_scoring_configs (classroom_id, room_id);

create index if not exists classroom_contest_scoring_configs_created_by_idx
  on public.classroom_contest_scoring_configs (created_by)
  where created_by is not null;

create index if not exists classroom_contest_scoring_configs_updated_by_idx
  on public.classroom_contest_scoring_configs (updated_by)
  where updated_by is not null;

alter table public.classroom_contests
  add column if not exists formula_key text,
  add column if not exists merge_group_id uuid null references public.classroom_contest_merge_groups(id) on delete set null;

with normalized as (
  select
    id,
    classroom_id,
    room_id,
    lower(regexp_replace(
      case when provider = 'codeforces' then 'cf_' else 'vj_' end || coalesce(nullif(external_contest_id::text, ''), left(id::text, 12)),
      '[^a-z0-9_]+',
      '_',
      'g'
    )) as base_key,
    row_number() over (
      partition by classroom_id, room_id,
      lower(regexp_replace(
        case when provider = 'codeforces' then 'cf_' else 'vj_' end || coalesce(nullif(external_contest_id::text, ''), left(id::text, 12)),
        '[^a-z0-9_]+',
        '_',
        'g'
      ))
      order by sort_order asc nulls last, created_at asc, id asc
    ) as duplicate_index
  from public.classroom_contests
)
update public.classroom_contests item
set formula_key = case
  when normalized.duplicate_index = 1 then left(normalized.base_key, 48)
  else left(normalized.base_key, greatest(1, 48 - length('_' || normalized.duplicate_index::text))) || '_' || normalized.duplicate_index::text
end
from normalized
where item.id = normalized.id
  and item.formula_key is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'classroom_contests_formula_key_check'
      and conrelid = 'public.classroom_contests'::regclass
  ) then
    alter table public.classroom_contests
      add constraint classroom_contests_formula_key_check
      check (formula_key ~ '^[a-z][a-z0-9_]{0,47}$');
  end if;
end $$;

alter table public.classroom_contests
  alter column formula_key set not null;

create index if not exists classroom_contests_merge_group_idx
  on public.classroom_contests (merge_group_id)
  where merge_group_id is not null;

create unique index if not exists classroom_contests_scope_formula_key_uidx
  on public.classroom_contests (classroom_id, room_id, formula_key)
  where merge_group_id is null;

alter table public.classroom_contest_reports
  add column if not exists scoring_config_version integer null,
  add column if not exists is_stale boolean not null default false;

create index if not exists classroom_contest_reports_stale_idx
  on public.classroom_contest_reports (classroom_id, room_id, is_stale);

alter table public."Public_contest_report"
  add column if not exists scoring_config_version integer null,
  add column if not exists is_stale boolean not null default false;

create index if not exists public_contest_report_shared_stale_idx
  on public."Public_contest_report" ("Shared_contest_id", is_stale);

insert into public.contest_report_scoring_configs (
  room_id,
  formula,
  score_precision,
  sort_rules,
  excluded_unit_keys,
  drop_worst_count,
  version
)
select
  room.id,
  case
    when upper(coalesce(room.contest_type, 'TFC')) = 'TSC' then 'tfc_component + tsc_component'
    else 'total_raw_score - raw_score_deviation'
  end,
  2,
  '[{"key":"score","direction":"desc"},{"key":"effective_penalty","direction":"asc"},{"key":"attended_count","direction":"desc"}]'::jsonb,
  '[]'::jsonb,
  0,
  1
from public."Contest_report_room" room
on conflict (room_id) do nothing;

insert into public.classroom_contest_scoring_configs (
  classroom_id,
  room_id,
  formula,
  score_precision,
  sort_rules,
  excluded_unit_keys,
  drop_worst_count,
  version
)
select
  room.classroom_id,
  room.id,
  'total_solved',
  0,
  coalesce((
    select jsonb_agg(jsonb_build_object('key', ranked.formula_key || '_solved', 'direction', 'desc') order by ranked.sort_order asc nulls last, ranked.created_at asc, ranked.id asc)
    from (
      select item.id, item.formula_key, item.sort_order, item.created_at
      from public.classroom_contests item
      where item.classroom_id = room.classroom_id
        and item.room_id = room.id
      order by item.sort_order asc nulls last, item.created_at asc, item.id asc
      limit 6
    ) ranked
  ), '[]'::jsonb)
  || '[{"key":"total_solved","direction":"desc"},{"key":"attended_count","direction":"desc"}]'::jsonb,
  '[]'::jsonb,
  0,
  1
from public.classroom_contest_rooms room
on conflict (room_id) do nothing;

create or replace function public.enforce_global_contest_merge_group_scope()
returns trigger
language plpgsql
as $$
begin
  if new.merge_group_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.contest_report_merge_groups merge_group
    where merge_group.id = new.merge_group_id
      and merge_group.room_id = new.room_id
  ) then
    raise exception 'contest merge group must belong to the same room';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_classroom_contest_merge_group_scope()
returns trigger
language plpgsql
as $$
begin
  if new.merge_group_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.classroom_contest_merge_groups merge_group
    where merge_group.id = new.merge_group_id
      and merge_group.classroom_id = new.classroom_id
      and merge_group.room_id = new.room_id
  ) then
    raise exception 'classroom contest merge group must belong to the same classroom room';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_global_contest_merge_group_scope_trg on public."Contest_room_contests";
create trigger enforce_global_contest_merge_group_scope_trg
  before insert or update of room_id, merge_group_id on public."Contest_room_contests"
  for each row
  execute function public.enforce_global_contest_merge_group_scope();

drop trigger if exists enforce_classroom_contest_merge_group_scope_trg on public.classroom_contests;
create trigger enforce_classroom_contest_merge_group_scope_trg
  before insert or update of classroom_id, room_id, merge_group_id on public.classroom_contests
  for each row
  execute function public.enforce_classroom_contest_merge_group_scope();

revoke all on function public.enforce_global_contest_merge_group_scope() from public;
revoke all on function public.enforce_classroom_contest_merge_group_scope() from public;

alter table public.contest_report_merge_groups enable row level security;
alter table public.contest_report_scoring_configs enable row level security;
alter table public.classroom_contest_merge_groups enable row level security;
alter table public.classroom_contest_scoring_configs enable row level security;

revoke all on table public.contest_report_merge_groups from anon, authenticated;
revoke all on table public.contest_report_scoring_configs from anon, authenticated;
revoke all on table public.classroom_contest_merge_groups from anon, authenticated;
revoke all on table public.classroom_contest_scoring_configs from anon, authenticated;

-- Harden global contest-report persistence touched by this rollout. Hono keeps
-- serving authorized paths through the server database connection.
alter table public."Contest_report_room" enable row level security;
alter table public."Contest_room_contests" enable row level security;
alter table public."Demerit" enable row level security;
alter table public."Public_contest_report" enable row level security;

revoke all on table public."Contest_report_room" from anon, authenticated;
revoke all on table public."Contest_room_contests" from anon, authenticated;
revoke all on table public."Demerit" from anon, authenticated;
revoke all on table public."Public_contest_report" from anon, authenticated;

alter table public.classroom_contest_merge_groups enable row level security;
alter table public.classroom_contest_scoring_configs enable row level security;
alter table public.classroom_contests enable row level security;
alter table public.classroom_contest_reports enable row level security;

commit;

-- Verification:
--
-- select relname, relrowsecurity
-- from pg_class
-- where relnamespace = 'public'::regnamespace
--   and relname in (
--     'contest_report_merge_groups',
--     'contest_report_scoring_configs',
--     'classroom_contest_merge_groups',
--     'classroom_contest_scoring_configs',
--     'Contest_report_room',
--     'Contest_room_contests',
--     'Demerit',
--     'Public_contest_report'
--   )
-- order by relname;
--
-- select grantee, table_name, privilege_type
-- from information_schema.role_table_grants
-- where table_schema = 'public'
--   and table_name in (
--     'contest_report_merge_groups',
--     'contest_report_scoring_configs',
--     'classroom_contest_merge_groups',
--     'classroom_contest_scoring_configs',
--     'Contest_report_room',
--     'Contest_room_contests',
--     'Demerit',
--     'Public_contest_report'
--   )
--   and grantee in ('anon', 'authenticated')
-- order by table_name, grantee, privilege_type;
--
-- select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conname like '%formula_key%'
--    or conname like '%scoring_configs%'
-- order by table_name::text, conname;
--
-- select conrelid::regclass as table_name, a.attname as fk_column
-- from pg_constraint c
-- join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
-- where c.contype = 'f'
--   and conrelid in (
--     'public.contest_report_merge_groups'::regclass,
--     'public.contest_report_scoring_configs'::regclass,
--     'public.classroom_contest_merge_groups'::regclass,
--     'public.classroom_contest_scoring_configs'::regclass
--   )
--   and not exists (
--     select 1
--     from pg_index i
--     where i.indrelid = c.conrelid and a.attnum = any(i.indkey)
--   );

