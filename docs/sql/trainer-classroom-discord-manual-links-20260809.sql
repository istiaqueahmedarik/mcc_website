-- Trusted/manual Discord user links for classroom provisioning.
-- Task: trainer-classroom-discord-integration-20260802 follow-up.
-- Additive migration: lets a classroom manager/admin mark a verified Discord
-- snowflake for an active real student without fabricating OAuth tokens.

begin;

alter table mcc_private.discord_user_connections
  add column if not exists connection_source text not null default 'oauth',
  add column if not exists verified_at timestamptz null,
  add column if not exists verified_by_user_id uuid null references public.users(id) on delete set null,
  add column if not exists manual_note text null;

alter table mcc_private.discord_user_connections
  alter column encrypted_access_token drop not null,
  alter column encrypted_refresh_token drop not null,
  alter column token_expires_at drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'discord_user_connections_source_check'
      and conrelid = 'mcc_private.discord_user_connections'::regclass
  ) then
    alter table mcc_private.discord_user_connections
      add constraint discord_user_connections_source_check
      check (connection_source in ('oauth', 'trusted_manual'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'discord_user_connections_token_source_shape_check'
      and conrelid = 'mcc_private.discord_user_connections'::regclass
  ) then
    alter table mcc_private.discord_user_connections
      add constraint discord_user_connections_token_source_shape_check
      check (
        (
          connection_source = 'oauth'
          and encrypted_access_token is not null
          and encrypted_refresh_token is not null
          and token_expires_at is not null
        )
        or (
          connection_source = 'trusted_manual'
          and verified_at is not null
          and verified_by_user_id is not null
        )
      );
  end if;
end
$$;

create index if not exists discord_user_connections_verified_by_idx
  on mcc_private.discord_user_connections (verified_by_user_id)
  where verified_by_user_id is not null;

create index if not exists discord_user_connections_source_idx
  on mcc_private.discord_user_connections (connection_source, status);

commit;
