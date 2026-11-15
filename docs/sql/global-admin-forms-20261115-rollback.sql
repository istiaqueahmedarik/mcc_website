begin;

-- Destructive feature rollback: back up campaign/response tables first.
-- Roll back global-form-report-eligibility before this file.
-- Never remove review provenance while an existing account is awaiting review.
do $$ begin
  if exists(select 1 from public.users where account_review_origin = 'profile_change') then
    raise exception 'Resolve pending profile changes before rolling back global forms';
  end if;
end $$;

drop trigger if exists global_form_response_revision_trigger on public.global_form_responses;
drop trigger if exists global_form_response_immutable_trigger on public.global_form_responses;
drop function if exists public.bump_global_form_campaign_revision();
drop function if exists public.reject_global_form_response_mutation();
drop table if exists public.global_form_profile_reviews;
drop table if exists public.global_form_presence;
drop table if exists public.global_form_responses;
drop table if exists public.global_form_campaigns;
drop table if exists public.global_form_templates;
alter table public.users drop constraint if exists users_account_review_origin_check;
alter table public.users drop column if exists account_review_origin;

commit;
