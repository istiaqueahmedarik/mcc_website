-- Roll back global-form-response-deletion-20261121.sql.
-- Restore the previous application version first, so nothing requests response deletion.
--
-- Deleted responses are not restored. If a profile review already lost its response
-- (response_id is null), the strict NOT NULL / ON DELETE RESTRICT reference cannot be
-- restored without deleting review history, so this script stops and changes nothing.

begin;

do $$
declare
  orphaned integer;
begin
  select count(*) into orphaned
  from public.global_form_profile_reviews
  where response_id is null;

  if orphaned > 0 then
    raise exception 'Rollback stopped: % profile review(s) belong to deleted responses. Keep this migration applied.', orphaned
      using errcode = '55000';
  end if;
end;
$$;

drop trigger if exists global_form_response_delete_revision_trigger on public.global_form_responses;
drop function if exists public.bump_global_form_campaign_revision_on_delete();

create or replace function public.reject_global_form_response_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception 'Global form responses are immutable' using errcode = '55000';
end;
$$;

revoke execute on function public.reject_global_form_response_mutation() from public, anon, authenticated;

alter table public.global_form_profile_reviews
  drop constraint if exists global_form_profile_reviews_response_id_fkey;
alter table public.global_form_profile_reviews
  add constraint global_form_profile_reviews_response_id_fkey
  foreign key (response_id) references public.global_form_responses(id) on delete restrict;
alter table public.global_form_profile_reviews
  alter column response_id set not null;

drop index if exists public.global_form_profile_reviews_response_idx;

commit;
