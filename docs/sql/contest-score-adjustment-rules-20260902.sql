-- Ordered score-adjustment rules for global and classroom scoring configs.
-- Apply after contest-report-score-pair-v2-20260829.sql.

alter table public.contest_report_scoring_configs
  add column if not exists adjustment_rules jsonb not null default '[]'::jsonb;

alter table public.classroom_contest_scoring_configs
  add column if not exists adjustment_rules jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contest_report_scoring_configs_adjustment_rules_array'
      and conrelid = 'public.contest_report_scoring_configs'::regclass
  ) then
    alter table public.contest_report_scoring_configs
      add constraint contest_report_scoring_configs_adjustment_rules_array
      check (
        jsonb_typeof(adjustment_rules) = 'array'
        and jsonb_array_length(adjustment_rules) <= 32
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'classroom_contest_scoring_configs_adjustment_rules_array'
      and conrelid = 'public.classroom_contest_scoring_configs'::regclass
  ) then
    alter table public.classroom_contest_scoring_configs
      add constraint classroom_contest_scoring_configs_adjustment_rules_array
      check (
        jsonb_typeof(adjustment_rules) = 'array'
        and jsonb_array_length(adjustment_rules) <= 32
      );
  end if;
end $$;

comment on column public.contest_report_scoring_configs.adjustment_rules is
  'Ordered, server-validated result-unit metric adjustments applied before drop-worst and final formulas.';

comment on column public.classroom_contest_scoring_configs.adjustment_rules is
  'Ordered, server-validated result-unit metric adjustments applied before drop-worst and final formulas.';

-- Verification:
-- select table_name, column_name, column_default, is_nullable
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('contest_report_scoring_configs', 'classroom_contest_scoring_configs')
--   and column_name = 'adjustment_rules';
