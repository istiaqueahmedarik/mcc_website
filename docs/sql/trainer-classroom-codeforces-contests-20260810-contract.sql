-- Contract migration for classroom Codeforces contest support.
-- Apply only after the rollback window for the provider-aware deployment.

begin;

drop index if exists public.classroom_contest_handle_overrides_handle_uidx;

commit;

-- Verification:
--
-- select indexname
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename = 'classroom_contest_handle_overrides'
-- order by indexname;
