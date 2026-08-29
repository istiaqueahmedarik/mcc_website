-- Contest report composite formulas follow-up.
-- Task: contest-report-composite-formulas-v1-20260829
-- Apply after contest-report-scoring-v1-20260828.
--
-- Adds a per-composite formula to global/admin and classroom/trainer merge
-- groups. Existing composites keep the old summed behavior with
-- total_raw_score.

begin;

alter table public.contest_report_merge_groups
  add column if not exists formula text;

alter table public.classroom_contest_merge_groups
  add column if not exists formula text;

update public.contest_report_merge_groups
set formula = 'total_raw_score'
where formula is null
   or length(btrim(formula)) = 0;

update public.classroom_contest_merge_groups
set formula = 'total_raw_score'
where formula is null
   or length(btrim(formula)) = 0;

alter table public.contest_report_merge_groups
  alter column formula set default 'total_raw_score',
  alter column formula set not null;

alter table public.classroom_contest_merge_groups
  alter column formula set default 'total_raw_score',
  alter column formula set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contest_report_merge_groups_formula_not_blank'
      and conrelid = 'public.contest_report_merge_groups'::regclass
  ) then
    alter table public.contest_report_merge_groups
      add constraint contest_report_merge_groups_formula_not_blank
      check (length(btrim(formula)) > 0 and length(formula) <= 1000);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'classroom_contest_merge_groups_formula_not_blank'
      and conrelid = 'public.classroom_contest_merge_groups'::regclass
  ) then
    alter table public.classroom_contest_merge_groups
      add constraint classroom_contest_merge_groups_formula_not_blank
      check (length(btrim(formula)) > 0 and length(formula) <= 1000);
  end if;
end $$;

commit;
