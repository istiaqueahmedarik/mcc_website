begin;

create table if not exists public.global_contest_report_eligibility (
  room_id uuid primary key references public."Contest_report_room"(id) on delete cascade,
  campaign_id uuid null references public.global_form_campaigns(id) on delete restrict,
  selection_version bigint not null default 0 check (selection_version >= 0),
  membership_revision bigint null check (membership_revision is null or membership_revision >= 0),
  updated_by uuid null references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint global_contest_report_eligibility_revision_check
    check (
      (campaign_id is null and membership_revision is null)
      or (campaign_id is not null and membership_revision is not null)
    )
);

create index if not exists global_contest_report_eligibility_campaign_idx
  on public.global_contest_report_eligibility (campaign_id, room_id)
  where campaign_id is not null;

create index if not exists global_contest_report_eligibility_updated_by_idx
  on public.global_contest_report_eligibility (updated_by)
  where updated_by is not null;

alter table public.global_contest_report_snapshots
  add column if not exists eligibility_campaign_id uuid null references public.global_form_campaigns(id) on delete restrict,
  add column if not exists eligibility_membership_revision bigint null,
  add column if not exists eligibility_selection_version bigint not null default 0;

alter table public."Public_contest_report"
  add column if not exists eligibility_campaign_id uuid null references public.global_form_campaigns(id) on delete restrict,
  add column if not exists eligibility_membership_revision bigint null,
  add column if not exists eligibility_selection_version bigint not null default 0;

create index if not exists global_contest_report_snapshots_campaign_idx
  on public.global_contest_report_snapshots (eligibility_campaign_id, eligibility_membership_revision)
  where eligibility_campaign_id is not null;

create index if not exists public_contest_report_eligibility_campaign_idx
  on public."Public_contest_report" (eligibility_campaign_id, eligibility_membership_revision)
  where eligibility_campaign_id is not null;

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

drop trigger if exists global_form_campaign_report_stale_trigger on public.global_form_campaigns;
create trigger global_form_campaign_report_stale_trigger
after update of revision on public.global_form_campaigns
for each row
when (new.revision is distinct from old.revision)
execute function public.mark_global_form_report_cohorts_stale();

alter table public.global_contest_report_eligibility enable row level security;
alter table public.global_contest_report_eligibility force row level security;

revoke all on table public.global_contest_report_eligibility from public, anon, authenticated;
revoke all on function public.mark_global_form_report_cohorts_stale() from public, anon, authenticated;

commit;

-- Verification:
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name in ('global_contest_report_eligibility', 'global_contest_report_snapshots', 'Public_contest_report')
--   and column_name like 'eligibility_%' or table_name = 'global_contest_report_eligibility'
-- order by table_name, ordinal_position;
--
-- select relname, relrowsecurity, relforcerowsecurity
-- from pg_class
-- where oid = 'public.global_contest_report_eligibility'::regclass;
--
-- select trigger_name, event_manipulation
-- from information_schema.triggers
-- where event_object_schema = 'public'
--   and event_object_table = 'global_form_campaigns';
