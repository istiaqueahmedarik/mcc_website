begin;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'Contest_report_room'
      and column_name = 'report_input_revision'
  ) then
    alter table public."Contest_report_room"
      add column report_input_revision bigint not null default 0;

    -- Earlier eligibility-only recomputation could already have cleared source
    -- invalidation. Require one refresh for reports that previously used a filter.
    update public.global_contest_report_snapshots set is_stale = true
    where eligibility_selection_version > 0 or eligibility_campaign_id is not null;
    update public."Public_contest_report" set is_stale = true, "Updated_at" = now()
    where eligibility_selection_version > 0 or eligibility_campaign_id is not null;
  end if;
end;
$$;

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

  -- Private snapshot staleness is reserved for non-eligibility inputs.
  -- Campaign freshness is derived from selection/membership revisions on reads.

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

-- Existing private stale flags are conservatively retained: refresh once if their
-- cause predates this separation. Never silently bless a previous identity mapping.

-- Repair proposals already changed through ordinary profile edits. Rejection keeps
-- its original prior_values baseline and the registration response is untouched.
with pending_accounts as materialized (
  select account.id, account.full_name
  from public.users account
  where account.account_review_origin = 'profile_change' and account.full_name is not null
    and exists (select 1 from public.global_form_profile_reviews review
                where review.user_id = account.id and review.status = 'pending')
  for update of account
)
update public.global_form_profile_reviews review
set proposed_values = jsonb_set(review.proposed_values, '{full_name}', to_jsonb(account.full_name), true)
from pending_accounts account
where account.id = review.user_id and review.status = 'pending'
  and review.proposed_values->>'full_name' is distinct from account.full_name;

commit;
