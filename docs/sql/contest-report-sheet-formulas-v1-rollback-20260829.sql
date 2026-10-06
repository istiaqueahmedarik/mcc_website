-- Rollback for contest-report-sheet-formulas-v1-20260829.
-- This only restores known legacy defaults; arbitrary manager-authored
-- sheet formulas are intentionally left unchanged.

begin;

alter table public.contest_report_merge_groups
  alter column formula set default 'total_raw_score';

alter table public.classroom_contest_merge_groups
  alter column formula set default 'total_raw_score';

update public.contest_report_merge_groups
set formula = 'total_raw_score'
where btrim(formula) = 'sum(raw_score)';

update public.classroom_contest_merge_groups
set formula = 'total_raw_score'
where btrim(formula) = 'sum(raw_score)';

update public.contest_report_scoring_configs
set
  formula = case btrim(formula)
    when 'sum(solved)' then 'total_solved'
    when 'sum(raw_score)' then 'total_raw_score'
    when 'sum(raw_score) - stddev(raw_score)' then 'total_raw_score - raw_score_deviation'
    else formula
  end,
  version = version + 1,
  updated_at = now()
where btrim(formula) in (
  'sum(solved)',
  'sum(raw_score)',
  'sum(raw_score) - stddev(raw_score)'
);

update public.classroom_contest_scoring_configs
set
  formula = case btrim(formula)
    when 'sum(solved)' then 'total_solved'
    when 'sum(raw_score)' then 'total_raw_score'
    when 'sum(raw_score) - stddev(raw_score)' then 'total_raw_score - raw_score_deviation'
    else formula
  end,
  version = version + 1,
  updated_at = now()
where btrim(formula) in (
  'sum(solved)',
  'sum(raw_score)',
  'sum(raw_score) - stddev(raw_score)'
);

commit;
