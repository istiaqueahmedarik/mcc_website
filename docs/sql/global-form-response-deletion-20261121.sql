-- Issue #63: allow an administrator to delete one global form response.
-- Apply after global-admin-forms-20261115.sql, global-form-report-eligibility-20261115.sql,
-- and global-forms-review-followup-20261115.sql. Safe to re-run.
--
-- 1. Responses stay immutable by default. UPDATE is always rejected. DELETE is accepted only
--    when the deleting transaction first runs
--      select set_config('mcc.global_form_response_delete', '<response id>', true);
--    The setting is transaction-local, so it cannot leak to other statements or pooled sessions.
--    This guards against accidental deletes by trusted server roles; table privileges and RLS
--    remain the access boundary.
-- 2. Deleting a response increments its campaign revision, mirroring inserts. The existing
--    mark_global_form_report_cohorts_stale trigger then records the new membership revision for
--    filtered contest rooms and marks published reports stale without rewriting them.
-- 3. Profile reviews belong to the account, not the campaign, so they survive response deletion
--    with response_id set to null. The new index keeps that ON DELETE SET NULL lookup fast.

begin;

create or replace function public.reject_global_form_response_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE'
     and old.id::text = current_setting('mcc.global_form_response_delete', true) then
    return old;
  end if;
  raise exception 'Global form responses are immutable' using errcode = '55000';
end;
$$;

create or replace function public.bump_global_form_campaign_revision_on_delete()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update public.global_form_campaigns
  set revision = revision + 1, updated_at = now()
  where id = old.campaign_id;
  return old;
end;
$$;

drop trigger if exists global_form_response_delete_revision_trigger on public.global_form_responses;
create trigger global_form_response_delete_revision_trigger
after delete on public.global_form_responses
for each row execute function public.bump_global_form_campaign_revision_on_delete();

alter table public.global_form_profile_reviews
  alter column response_id drop not null;
alter table public.global_form_profile_reviews
  drop constraint if exists global_form_profile_reviews_response_id_fkey;
alter table public.global_form_profile_reviews
  add constraint global_form_profile_reviews_response_id_fkey
  foreign key (response_id) references public.global_form_responses(id) on delete set null;

create index if not exists global_form_profile_reviews_response_idx
  on public.global_form_profile_reviews(response_id);

revoke execute on function public.reject_global_form_response_mutation() from public, anon, authenticated;
revoke execute on function public.bump_global_form_campaign_revision_on_delete() from public, anon, authenticated;

commit;

-- Verification:
-- select tgname from pg_trigger
-- where tgrelid = 'public.global_form_responses'::regclass and not tgisinternal order by tgname;
--   -> global_form_response_delete_revision_trigger, global_form_response_immutable_trigger,
--      global_form_response_revision_trigger
--
-- select pg_get_constraintdef(oid) from pg_constraint
-- where conname = 'global_form_profile_reviews_response_id_fkey';
--   -> FOREIGN KEY (response_id) REFERENCES global_form_responses(id) ON DELETE SET NULL
