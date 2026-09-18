-- Provider-aware global contest report items.
-- Apply before deploying the matching server/client code.

begin;

alter table public."Contest_room_contests"
  add column if not exists provider text not null default 'vjudge';

update public."Contest_room_contests"
set provider = 'vjudge'
where provider is null
   or provider not in ('vjudge', 'codeforces');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contest_room_contests_provider_check'
      and conrelid = 'public."Contest_room_contests"'::regclass
  ) then
    alter table public."Contest_room_contests"
      add constraint contest_room_contests_provider_check
      check (provider in ('vjudge', 'codeforces'));
  end if;
end $$;

alter table public."Contest_room_contests"
  drop constraint if exists "Contest_room_contests_contest_id_key";

drop index if exists public."Contest_room_contests_contest_id_key";
drop index if exists public.contest_room_contests_room_id_contest_id_uidx;

create unique index if not exists contest_room_contests_room_provider_contest_uidx
  on public."Contest_room_contests" (room_id, provider, contest_id);

-- This table is reached only through the authenticated Hono service. Do not
-- add anon/authenticated Data API grants as part of this provider expansion.

commit;

-- Read-only verification after apply:
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'Contest_room_contests'
--   and column_name = 'provider';
--
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename = 'Contest_room_contests'
-- order by indexname;
