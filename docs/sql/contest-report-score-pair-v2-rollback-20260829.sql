-- Roll back contest-report-score-pair-v2-20260829.
-- The legacy formula column is retained and dual-written, so solved-score rules
-- remain available after this rollback. Penalty formulas are removed.

begin;

alter table public.contest_report_scoring_configs
  alter column sort_rules set default '[{"key":"score","direction":"desc"},{"key":"effective_penalty","direction":"asc"},{"key":"attended_count","direction":"desc"}]'::jsonb,
  drop column if exists solved_score_formula,
  drop column if exists penalty_score_formula;

alter table public.classroom_contest_scoring_configs
  alter column sort_rules set default '[{"key":"total_solved","direction":"desc"},{"key":"attended_count","direction":"desc"}]'::jsonb,
  drop column if exists solved_score_formula,
  drop column if exists penalty_score_formula;

alter table public.contest_report_merge_groups
  drop column if exists solved_score_formula,
  drop column if exists penalty_score_formula;

alter table public.classroom_contest_merge_groups
  drop column if exists solved_score_formula,
  drop column if exists penalty_score_formula;

commit;
