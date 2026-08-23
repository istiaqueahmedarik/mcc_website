# Trainer Shared Discord Guild Classrooms Technical Decisions

Status: Auto-approved by user full-auto instruction
Task ID: trainer-shared-discord-guild-classrooms-20260809
Last updated: 2026-08-09

## TD-001: One Guild Installation, Many Classroom Bindings

Supersede only the one-dedicated-guild-per-classroom portion of the 2026-08-02 Discord decision. Keep one `discord_guild_installations` row per Discord guild and allow many `classroom_discord_bindings` rows to reference it. Keep `classroom_id` unique so one classroom still binds to at most one guild.

Why: a bot is installed once per guild, while classroom rules, channels, jobs, and health belong to distinct classroom bindings.

## TD-002: Exact Channel Mapping Selects Classroom Context

Continue resolving inbound messages and `/mcc` interactions from the exact `(guild_id, channel_id)` mapping. Do not introduce a classroom picker inside Discord commands and do not infer classroom identity from channel/category names.

Why: channel snowflakes are stable and the current bridge already authorizes against the mapped classroom. Names remain presentation only.

## TD-003: Classroom-Distinct Channel Names

Name staff channels and student-category shards with a normalized classroom name by default. Add the first eight characters of the classroom UUID only when another bound classroom in the same Discord guild normalizes to the same classroom slug. Reconcile mapped existing staff channels and categories to that convention while preserving their Discord channel IDs and database mappings.

Why: shared guilds can contain classrooms with identical or similar names, but unique classroom slugs should stay readable. A short stable suffix is still available for real collisions without becoming authorization data.

## TD-004: Reconcile Staff Privacy, Not Just Existence

When a mapped staff channel exists, reconcile its name and full permission overwrites just as student channels are reconciled. Allowed members remain the bot, classroom owner, and active classroom substitutes with linked Discord accounts; `@everyone` remains denied.

Why: a shared guild increases the impact of stale overwrites. Returning an existing channel without repairing privacy is unsafe.

## TD-005: Keep Installation Health and Binding Health Separate

Successful provisioning updates the shared installation's bot-install health and the target binding's readiness. A delivery job that exhausts retries marks only its target binding `action_required`, retaining a safe error code; it does not detach other bindings or mark the whole installation unhealthy.

Why: capacity, naming, or one classroom's roster can fail while the bot installation and other classrooms remain healthy. Installation-wide permission loss can still surface through each binding's independent repair attempt.

## TD-006: Do Not Hold Database Locks Across Discord Calls

Retain durable, idempotent per-binding delivery jobs and sequential processing inside each worker batch. Do not hold row/advisory locks while calling Discord. Concurrent workers may operate on different bindings in one guild; Discord/API conflicts use existing retry/dead-letter handling.

Why: external calls inside database locks create long transactions and pool hazards. Channel IDs and per-binding uniqueness protect mappings, while failed capacity races are recoverable provisioning failures.

## TD-007: Follow-Up Migration Drops Only Guild Uniqueness

For clean installs, remove `classroom_discord_bindings_guild_unique` from the base SQL and add a normal `guild_id` index. For an already-migrated database, provide a short follow-up transaction with a local lock timeout that drops exactly that constraint and creates the lookup index.

Why: the unique constraint's index currently serves guild lookup queries. The replacement index preserves lookup performance without enforcing one binding per guild.

## TD-008: Reuse the Existing Creation Flow

Keep the current three-step classroom wizard and eligible-guild API. Update only dedicated-server labels/descriptions and remove the obsolete duplicate-guild error translation.

Why: the UI already sends a valid guild snowflake and already lists reusable eligible guilds. No new interface or API shape is needed.

## TD-009: Revalidate Manage Server Permission on Create

Treat the posted guild ID as untrusted. Before opening the classroom database transaction, refresh/read the trainer's Discord OAuth guild list, require the `guilds` scope and current Manage Server permission for the exact snowflake, and use Discord's guild name rather than the posted label.

Why: once a guild can have an existing bot installation and binding, client-only filtering is insufficient. A crafted request must not bind a classroom to a guild the trainer cannot manage.

## Rollout and Rollback

Apply the follow-up SQL before deploying server behavior that accepts shared guilds. Rollback requires first resolving any duplicate guild bindings; only then may the unique guild constraint be recreated. Never delete classroom bindings automatically to make rollback succeed.
