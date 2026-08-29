-- Rollback for contest-report-composite-formulas-v1-20260829.

begin;

alter table if exists public.contest_report_merge_groups
  drop constraint if exists contest_report_merge_groups_formula_not_blank,
  drop column if exists formula;

alter table if exists public.classroom_contest_merge_groups
  drop constraint if exists classroom_contest_merge_groups_formula_not_blank,
  drop column if exists formula;

commit;
