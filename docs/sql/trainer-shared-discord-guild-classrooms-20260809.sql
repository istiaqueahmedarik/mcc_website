-- Allow several MCC classrooms to share one Discord guild installation.
-- Task: trainer-shared-discord-guild-classrooms-20260809
-- Apply after docs/sql/trainer-classroom-discord-integration-20260802.sql.
--
-- This intentionally preserves:
--   * one binding per classroom;
--   * one installation row per Discord guild;
--   * channel/category uniqueness and all foreign keys;
--   * existing RLS and browser-role revocations in mcc_private.

begin;

-- Avoid waiting indefinitely for an ACCESS EXCLUSIVE table lock during rollout.
set local lock_timeout = '5s';

alter table mcc_private.classroom_discord_bindings
  drop constraint if exists classroom_discord_bindings_guild_unique;

-- The removed unique constraint previously supplied the guild lookup index.
create index if not exists classroom_discord_bindings_guild_idx
  on mcc_private.classroom_discord_bindings (guild_id);

commit;

-- Verification:
--
-- select conname, contype, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'mcc_private.classroom_discord_bindings'::regclass
-- order by conname;
--
-- select indexname, indexdef
-- from pg_indexes
-- where schemaname = 'mcc_private'
--   and tablename = 'classroom_discord_bindings'
-- order by indexname;
--
-- Rollback is conditional. Before recreating guild uniqueness, first run:
-- select guild_id, count(*)
-- from mcc_private.classroom_discord_bindings
-- group by guild_id
-- having count(*) > 1;
-- Resolve every returned binding through an explicit product decision. Never
-- delete or detach classrooms automatically merely to make rollback succeed.
