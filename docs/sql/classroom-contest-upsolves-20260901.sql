-- Add an opt-in upsolve mode to classroom Codeforces and VJudge contest items.
-- Apply before deploying the matching server/client code.

begin;

alter table public.classroom_contests
  add column if not exists include_upsolves boolean not null default false;

commit;

-- Verification:
--
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'classroom_contests'
--   and column_name = 'include_upsolves';
