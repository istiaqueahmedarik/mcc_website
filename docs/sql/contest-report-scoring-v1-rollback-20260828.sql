-- Rollback for contest-report-scoring-v1-20260828.
--
-- This removes scoring configuration objects and item-level scoring pointers.
-- It intentionally does not delete or rewrite existing Public_contest_report
-- JSON strings or classroom_contest_reports.data snapshots.
--
-- Review the legacy grants before applying this rollback in production. The
-- GRANT statements below restore broad direct Data API visibility that existed
-- in older public-schema deployments; skip them if server-owned Hono access
-- should remain the only access path.

begin;

drop trigger if exists enforce_global_contest_merge_group_scope_trg on public."Contest_room_contests";
drop trigger if exists enforce_classroom_contest_merge_group_scope_trg on public.classroom_contests;

drop function if exists public.enforce_global_contest_merge_group_scope();
drop function if exists public.enforce_classroom_contest_merge_group_scope();

drop table if exists public.contest_report_scoring_configs;
drop table if exists public.classroom_contest_scoring_configs;

alter table if exists public."Contest_room_contests"
  drop column if exists merge_group_id,
  drop column if exists formula_key;

alter table if exists public.classroom_contests
  drop column if exists merge_group_id,
  drop column if exists formula_key;

drop table if exists public.contest_report_merge_groups;
drop table if exists public.classroom_contest_merge_groups;

alter table if exists public.classroom_contest_reports
  drop column if exists scoring_config_version,
  drop column if exists is_stale;

alter table if exists public."Public_contest_report"
  drop column if exists scoring_config_version,
  drop column if exists is_stale;

-- Optional legacy direct-access restore. See header note before using.
alter table if exists public."Contest_report_room" disable row level security;
alter table if exists public."Contest_room_contests" disable row level security;
alter table if exists public."Demerit" disable row level security;
alter table if exists public."Public_contest_report" disable row level security;

grant select, insert, update, delete on table public."Contest_report_room" to anon, authenticated;
grant select, insert, update, delete on table public."Contest_room_contests" to anon, authenticated;
grant select, insert, update, delete on table public."Demerit" to anon, authenticated;
grant select, insert, update, delete on table public."Public_contest_report" to anon, authenticated;

commit;

