begin;

alter table public.global_contest_report_snapshots
  drop constraint if exists global_contest_report_snapshots_source_object_check;

alter table public.global_contest_report_snapshots
  drop column if exists source_snapshots;

commit;
