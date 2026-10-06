begin;

alter table public.global_contest_report_snapshots
  add column if not exists source_snapshots jsonb not null default '{}'::jsonb;

alter table public.global_contest_report_snapshots
  drop constraint if exists global_contest_report_snapshots_source_object_check;

alter table public.global_contest_report_snapshots
  add constraint global_contest_report_snapshots_source_object_check
  check (jsonb_typeof(source_snapshots) = 'object');

commit;

-- Existing report snapshots remain readable. Their empty source_snapshots value
-- means a failed source can begin falling back after the next successful refresh.
