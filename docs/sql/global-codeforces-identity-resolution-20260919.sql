-- Codeforces source classification and immutable MCC account mappings.
-- Apply before deploying the matching server/client code.

begin;

alter table public."Contest_room_contests"
  add column if not exists codeforces_source_type text,
  add column if not exists codeforces_group_identity_mode text;

update public."Contest_room_contests"
set codeforces_source_type = case
  when provider <> 'codeforces' then null
  when contest_id like 'group:%' then 'group'
  when contest_id like 'edu:%' then 'edu'
  when contest_id like 'gym:%' then 'gym'
  when contest_id like 'contest:%' then 'public'
  when contest_id ~ '^\d+$' and contest_id::numeric >= 100000 then 'gym'
  else 'public'
end,
codeforces_group_identity_mode = case
  when provider = 'codeforces' and contest_id like 'group:%' then 'student_id_suffix'
  else null
end
where codeforces_source_type is null
   or (provider = 'codeforces' and contest_id like 'group:%' and codeforces_group_identity_mode is null);

alter table public."Contest_room_contests"
  drop constraint if exists contest_room_contests_codeforces_source_type_check,
  drop constraint if exists contest_room_contests_codeforces_group_identity_mode_check;

alter table public."Contest_room_contests"
  add constraint contest_room_contests_codeforces_source_type_check
  check (
    (provider = 'codeforces' and codeforces_source_type in ('public', 'gym', 'group', 'edu'))
    or (provider <> 'codeforces' and codeforces_source_type is null)
  ),
  add constraint contest_room_contests_codeforces_group_identity_mode_check
  check (
    (provider = 'codeforces' and codeforces_source_type = 'group'
      and codeforces_group_identity_mode in ('student_id_suffix', 'csv'))
    or ((provider <> 'codeforces' or codeforces_source_type <> 'group')
      and codeforces_group_identity_mode is null)
  );

create table if not exists public.contest_report_codeforces_identity_mappings (
  id uuid primary key default gen_random_uuid(),
  contest_item_id uuid not null references public."Contest_room_contests"(id) on delete cascade,
  provider_username text not null,
  provider_username_normalized text not null,
  student_user_id uuid not null references public.users(id) on delete restrict,
  created_by uuid not null references public.users(id) on delete restrict,
  updated_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contest_report_cf_mapping_username_check
    check (char_length(provider_username) between 1 and 160),
  constraint contest_report_cf_mapping_normalized_check
    check (
      char_length(provider_username_normalized) between 1 and 160
      and provider_username_normalized = lower(btrim(provider_username_normalized))
    ),
  unique (contest_item_id, provider_username_normalized),
  unique (contest_item_id, student_user_id)
);

create index if not exists contest_report_cf_mapping_student_idx
  on public.contest_report_codeforces_identity_mappings (student_user_id);

alter table public.contest_report_codeforces_identity_mappings enable row level security;
alter table public.contest_report_codeforces_identity_mappings force row level security;
revoke all on table public.contest_report_codeforces_identity_mappings from anon, authenticated;

commit;

-- Read-only verification after apply:
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'Contest_room_contests'
--   and column_name in ('codeforces_source_type', 'codeforces_group_identity_mode');
--
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename = 'contest_report_codeforces_identity_mappings'
-- order by indexname;
--
-- select relrowsecurity, relforcerowsecurity
-- from pg_class
-- where oid = 'public.contest_report_codeforces_identity_mappings'::regclass;
