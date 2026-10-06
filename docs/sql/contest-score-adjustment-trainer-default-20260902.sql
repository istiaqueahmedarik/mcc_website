-- Trainer/classroom scoring ignores penalty by default.
-- Apply after contest-score-adjustment-rules-20260902.sql.

alter table public.classroom_contest_scoring_configs
  alter column adjustment_rules set default '[
    {
      "id": "classroom_ignore_penalty",
      "unitKey": "*",
      "field": "penalty",
      "operation": "multiply",
      "value": 0,
      "attendance": "attended"
    }
  ]'::jsonb;

-- Existing classroom configs created under the empty default adopt the new
-- trainer policy. Non-empty manager-authored rule lists remain untouched.
with changed as (
  update public.classroom_contest_scoring_configs
  set adjustment_rules = '[
      {
        "id": "classroom_ignore_penalty",
        "unitKey": "*",
        "field": "penalty",
        "operation": "multiply",
        "value": 0,
        "attendance": "attended"
      }
    ]'::jsonb,
    version = version + 1,
    updated_at = now()
  where adjustment_rules = '[]'::jsonb
  returning classroom_id, room_id
)
update public.classroom_contest_reports as report
set is_stale = true,
    updated_at = now()
from changed
where report.classroom_id = changed.classroom_id
  and report.room_id = changed.room_id;

-- Verification:
-- select room_id, adjustment_rules
-- from public.classroom_contest_scoring_configs
-- where adjustment_rules = '[]'::jsonb
--    or adjustment_rules @> '[{"id":"classroom_ignore_penalty"}]'::jsonb;
