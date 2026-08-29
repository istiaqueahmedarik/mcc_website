-- Contest report sheet-style formulas follow-up.
-- Task: contest-report-sheet-formulas-v1-20260829
-- Apply after contest-report-composite-formulas-v1-20260829.
--
-- Moves known saved defaults from legacy flat aggregate variables to the
-- row-based sheet syntax used by the scoring engine.

begin;

alter table public.contest_report_merge_groups
  alter column formula set default 'sum(raw_score)';

alter table public.classroom_contest_merge_groups
  alter column formula set default 'sum(raw_score)';

update public.contest_report_merge_groups
set formula = 'sum(raw_score)'
where btrim(formula) in ('total_raw_score', 'total_score');

update public.classroom_contest_merge_groups
set formula = 'sum(raw_score)'
where btrim(formula) in ('total_raw_score', 'total_score');

update public.contest_report_scoring_configs
set
  formula = case btrim(formula)
    when 'total_solved' then 'sum(solved)'
    when 'total_raw_score' then 'sum(raw_score)'
    when 'total_score' then 'sum(raw_score)'
    when 'total_raw_score - raw_score_deviation' then 'sum(raw_score) - stddev(raw_score)'
    else formula
  end,
  version = version + 1,
  updated_at = now()
where btrim(formula) in (
  'total_solved',
  'total_raw_score',
  'total_score',
  'total_raw_score - raw_score_deviation'
);

with rewritten as (
  update public.classroom_contest_scoring_configs
  set
    formula = case btrim(formula)
      when 'total_solved' then 'sum(solved)'
      when 'total_raw_score' then 'sum(raw_score)'
      when 'total_score' then 'sum(raw_score)'
      when 'total_raw_score - raw_score_deviation' then 'sum(raw_score) - stddev(raw_score)'
      else formula
    end,
    version = version + 1,
    updated_at = now()
  where btrim(formula) in (
    'total_solved',
    'total_raw_score',
    'total_score',
    'total_raw_score - raw_score_deviation'
  )
  returning room_id
)
update public.classroom_contest_rooms room
set updated_at = now()
from rewritten
where room.id = rewritten.room_id;

with allowed_sort_keys(key) as (
  values
    ('score'), ('total_solved'), ('total_penalty'), ('total_raw_score'),
    ('total_score'), ('total_demerits'), ('attended_count'),
    ('attendance_rate'), ('included_unit_count'), ('result_unit_count'),
    ('avg_solved'), ('avg_penalty'), ('avg_raw_score'), ('avg_demerits'),
    ('best_solved'), ('worst_solved'), ('best_raw_score'),
    ('worst_raw_score'), ('solved_deviation'), ('penalty_deviation'),
    ('raw_score_deviation'), ('effective_penalty'), ('tfc_score'),
    ('tsc_score'), ('tfc_component'), ('tsc_component'),
    ('highest_tfc_score'), ('highest_tsc_score'), ('name'), ('username'),
    ('rank')
)
update public.contest_report_scoring_configs config
set
  sort_rules = '[{"key":"score","direction":"desc"},{"key":"effective_penalty","direction":"asc"},{"key":"attended_count","direction":"desc"}]'::jsonb,
  version = version + 1,
  updated_at = now()
where exists (
  select 1
  from jsonb_array_elements(config.sort_rules) as rule
  left join allowed_sort_keys allowed on allowed.key = rule->>'key'
  where allowed.key is null
);

with allowed_sort_keys(key) as (
  values
    ('score'), ('total_solved'), ('total_penalty'), ('total_raw_score'),
    ('total_score'), ('total_demerits'), ('attended_count'),
    ('attendance_rate'), ('included_unit_count'), ('result_unit_count'),
    ('avg_solved'), ('avg_penalty'), ('avg_raw_score'), ('avg_demerits'),
    ('best_solved'), ('worst_solved'), ('best_raw_score'),
    ('worst_raw_score'), ('solved_deviation'), ('penalty_deviation'),
    ('raw_score_deviation'), ('effective_penalty'), ('tfc_score'),
    ('tsc_score'), ('tfc_component'), ('tsc_component'),
    ('highest_tfc_score'), ('highest_tsc_score'), ('name'), ('username'),
    ('rank')
)
update public.classroom_contest_scoring_configs config
set
  sort_rules = '[{"key":"score","direction":"desc"},{"key":"attended_count","direction":"desc"}]'::jsonb,
  version = version + 1,
  updated_at = now()
where exists (
  select 1
  from jsonb_array_elements(config.sort_rules) as rule
  left join allowed_sort_keys allowed on allowed.key = rule->>'key'
  where allowed.key is null
);

commit;
