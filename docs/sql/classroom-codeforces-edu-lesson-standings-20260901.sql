-- Allow classroom Codeforces items to identify an EDU course lesson standings source.
-- Apply before deploying the matching server/client code.

begin;

alter table public.classroom_contests
  drop constraint if exists classroom_contests_external_id_check;

alter table public.classroom_contests
  add constraint classroom_contests_external_id_check
  check (
    external_contest_id ~ '^[0-9]+$'
    or external_contest_id ~ '^edu:[0-9]+:[0-9]+(:friends|:list:[A-Za-z0-9]+)?$'
  );

commit;

-- Verification:
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.classroom_contests'::regclass
--   and conname = 'classroom_contests_external_id_check';
