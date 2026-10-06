-- Contest report solved-score and penalty-score formulas.
-- Task: contest-report-score-pair-v2-20260829
-- Apply after contest-report-scoring-v1-20260828 and
-- contest-report-composite-formulas-v1-20260829.

begin;

alter table public.contest_report_scoring_configs
  add column if not exists solved_score_formula text,
  add column if not exists penalty_score_formula text;

alter table public.classroom_contest_scoring_configs
  add column if not exists solved_score_formula text,
  add column if not exists penalty_score_formula text;

alter table public.contest_report_merge_groups
  add column if not exists solved_score_formula text,
  add column if not exists penalty_score_formula text;

alter table public.classroom_contest_merge_groups
  add column if not exists solved_score_formula text,
  add column if not exists penalty_score_formula text;

update public.contest_report_scoring_configs
set solved_score_formula = coalesce(nullif(btrim(solved_score_formula), ''), formula),
    penalty_score_formula = coalesce(nullif(btrim(penalty_score_formula), ''), 'sum(penalty) + stddev(penalty)');

update public.classroom_contest_scoring_configs
set solved_score_formula = coalesce(nullif(btrim(solved_score_formula), ''), formula),
    penalty_score_formula = coalesce(nullif(btrim(penalty_score_formula), ''), 'sum(penalty) + stddev(penalty)');

update public.contest_report_merge_groups
set solved_score_formula = coalesce(nullif(btrim(solved_score_formula), ''), formula),
    penalty_score_formula = coalesce(nullif(btrim(penalty_score_formula), ''), 'sum(penalty)');

update public.classroom_contest_merge_groups
set solved_score_formula = coalesce(nullif(btrim(solved_score_formula), ''), formula),
    penalty_score_formula = coalesce(nullif(btrim(penalty_score_formula), ''), 'sum(penalty)');

alter table public.contest_report_scoring_configs
  alter column solved_score_formula set default 'sum(raw_score) - stddev(raw_score)',
  alter column solved_score_formula set not null,
  alter column penalty_score_formula set default 'sum(penalty) + stddev(penalty)',
  alter column penalty_score_formula set not null;

alter table public.classroom_contest_scoring_configs
  alter column solved_score_formula set default 'sum(solved)',
  alter column solved_score_formula set not null,
  alter column penalty_score_formula set default 'sum(penalty) + stddev(penalty)',
  alter column penalty_score_formula set not null;

alter table public.contest_report_merge_groups
  alter column solved_score_formula set default 'sum(raw_score)',
  alter column solved_score_formula set not null,
  alter column penalty_score_formula set default 'sum(penalty)',
  alter column penalty_score_formula set not null;

alter table public.classroom_contest_merge_groups
  alter column solved_score_formula set default 'sum(raw_score)',
  alter column solved_score_formula set not null,
  alter column penalty_score_formula set default 'sum(penalty)',
  alter column penalty_score_formula set not null;

do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('contest_report_scoring_configs_score_pair_not_blank', 'public.contest_report_scoring_configs'::regclass),
      ('classroom_contest_scoring_configs_score_pair_not_blank', 'public.classroom_contest_scoring_configs'::regclass),
      ('contest_report_merge_groups_score_pair_not_blank', 'public.contest_report_merge_groups'::regclass),
      ('classroom_contest_merge_groups_score_pair_not_blank', 'public.classroom_contest_merge_groups'::regclass)
    ) as values_table(constraint_name, relation_id)
  loop
    if not exists (
      select 1
      from pg_constraint
      where conname = target.constraint_name
        and conrelid = target.relation_id
    ) then
      execute format(
        'alter table %s add constraint %I check (
          length(btrim(solved_score_formula)) between 1 and 1000
          and length(btrim(penalty_score_formula)) between 1 and 1000
        )',
        target.relation_id,
        target.constraint_name
      );
    end if;
  end loop;
end $$;

alter table public.contest_report_scoring_configs
  alter column sort_rules set default '[{"key":"solved_score","direction":"desc"},{"key":"penalty_score","direction":"asc"},{"key":"attended_count","direction":"desc"}]'::jsonb;

alter table public.classroom_contest_scoring_configs
  alter column sort_rules set default '[{"key":"solved_score","direction":"desc"},{"key":"penalty_score","direction":"asc"},{"key":"attended_count","direction":"desc"}]'::jsonb;

commit;
