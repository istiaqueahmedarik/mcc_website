begin;

drop trigger if exists global_form_campaign_report_stale_trigger on public.global_form_campaigns;
drop function if exists public.mark_global_form_report_cohorts_stale();

drop index if exists public.public_contest_report_eligibility_campaign_idx;
drop index if exists public.global_contest_report_snapshots_campaign_idx;

alter table if exists public."Public_contest_report"
  drop column if exists eligibility_selection_version,
  drop column if exists eligibility_membership_revision,
  drop column if exists eligibility_campaign_id;

alter table if exists public.global_contest_report_snapshots
  drop column if exists eligibility_selection_version,
  drop column if exists eligibility_membership_revision,
  drop column if exists eligibility_campaign_id;

drop table if exists public.global_contest_report_eligibility;

commit;
