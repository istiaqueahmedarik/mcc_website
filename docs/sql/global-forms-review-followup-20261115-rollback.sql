begin;

create or replace function public.mark_global_form_report_cohorts_stale()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update public.global_contest_report_eligibility
  set membership_revision = new.revision,
      updated_at = now()
  where campaign_id = new.id;

  update public.global_contest_report_snapshots snapshot
  set is_stale = true
  from public.global_contest_report_eligibility eligibility
  where eligibility.campaign_id = new.id
    and snapshot.room_id = eligibility.room_id
    and snapshot.is_stale = false;

  update public."Public_contest_report" published
  set is_stale = true,
      "Updated_at" = now()
  from public.global_contest_report_eligibility eligibility
  where eligibility.campaign_id = new.id
    and published."Shared_contest_id"::text = eligibility.room_id::text
    and published.is_stale = false;

  return new;
end;
$$;

alter table public."Contest_report_room" drop column if exists report_input_revision;
-- Reconciled proposals remain valid historical review data; no data is reverted.
commit;
