# Trainer Shared Discord Guild Classrooms Implementation Review

Date: 2026-08-09
Task ID: trainer-shared-discord-guild-classrooms-20260809
Status: Implemented and internally approved through user full-auto instruction; database migration applied

## Outcome

One Discord server can now host multiple MCC classrooms. Each classroom still has exactly one binding and keeps independent staff/student channels, permission overwrites, notification rules, delivery jobs, command/message routing, and provisioning health.

The configured Postgres/Supabase database has the shared-guild migration applied and verified. A transactionally rolled-back probe successfully created a second classroom binding for an existing guild installation, proving that guild reuse is accepted without leaving test rows.

## Review Flow

### 1. Requirement and architecture

- Added `docs/rsd/trainer-shared-discord-guild-classrooms-20260809-rsd.md` and recorded user approval/full-auto delivery.
- Added `docs/decisions/trainer-shared-discord-guild-classrooms-20260809-technical-decisions.md`.
- Added ADR-0013 at `docs/adr/0013-shared-discord-guild-classroom-bindings.md`, narrowly superseding ADR-0012's dedicated-guild restriction while preserving every other bridge boundary.
- Added the completed plan at `docs/tasks/trainer-shared-discord-guild-classrooms-20260809-task-plan.md`.

### 2. Database topology

- Updated the clean-install SQL in `docs/sql/trainer-classroom-discord-integration-20260802.sql` so `classroom_discord_bindings.guild_id` is no longer unique.
- Preserved `classroom_discord_bindings.classroom_id` uniqueness, the unique installation row per guild, foreign keys, channel/category uniqueness, RLS, and private-schema browser revocations.
- Added `docs/sql/trainer-shared-discord-guild-classrooms-20260809.sql` for already-migrated databases.
- The follow-up migration drops only `classroom_discord_bindings_guild_unique`, uses a five-second local lock timeout, and creates non-unique `classroom_discord_bindings_guild_idx` so guild lookups remain indexed.
- Applied the follow-up through the configured server `DATABASE_URL` because no Supabase MCP/plugin tools were exposed in this session.

### 3. Classroom creation authorization

- `server/src/controllers/classroomController.ts` no longer rejects a guild already used by another classroom and no longer asks for a dedicated server.
- `server/src/controllers/discordController.ts` now revalidates the posted guild snowflake against the trainer's current OAuth guild list and requires Manage Server permission before the classroom transaction.
- The server requires the OAuth `guilds` scope, returns the existing Discord reconnection recovery code when necessary, and uses Discord's verified guild name instead of trusting the browser label.
- This permission check closes the crafted-request path that would otherwise become material once an already-installed guild can be reused.

### 4. Shared-guild provisioning and privacy

- `server/src/utils/discordProvisioning.ts` names staff channels and student category shards with a normalized classroom name plus the first eight characters of the classroom UUID.
- Existing mapped staff/category Discord IDs remain stable and are renamed in place during reconciliation.
- Existing staff channels now receive full overwrite reconciliation: `@everyone` is denied and only the bot plus linked authorized classroom owner/substitutes are allowed.
- Student private channel mappings remain unique per binding/student, so a student enrolled in two classrooms receives two independently mapped channels.

### 5. Failure isolation

- `server/src/utils/discordDeliveryQueue.ts` keeps retry behavior unchanged for transient failures.
- When a `provision_classroom` or `reconcile_classroom` job exhausts retries, the same short database transaction marks only that job's binding `action_required` with a safe error code and repair guidance.
- Other bindings sharing the guild are not detached or marked failed.

### 6. Existing UI flow

- `client/src/components/CreateClassroomWizard.jsx` now labels the selection “Discord server” and explains that a server can be reused while classroom channels/permissions remain separate.
- `client/src/components/ClassroomDiscordSettingsCard.jsx` uses the same shared-server wording.
- No new page, component, route, dependency, interaction model, or global design abstraction was added.

## Requirement Satisfaction

- Multiple bindings can reference one guild installation: verified with the rolled-back database insert probe.
- One binding per classroom remains enforced: verified from `classroom_discord_bindings_classroom_unique`.
- Existing single-classroom bindings need no remap: the migration changes only guild uniqueness and adds a lookup index.
- Runtime messages and commands remain classroom-isolated: source audit confirms both paths require exact `binding.guild_id` and `channel.channel_id` matches before authorization.
- Staff/student presentation is classroom-distinct: provisioning uses stable short classroom-ID suffixes.
- Staff privacy is repaired on every reconcile: existing and new staff channels receive explicit overwrites.
- Invalid crafted guild selection is rejected server-side using current Discord Manage Server permission.
- Exhausted provisioning failures are binding-scoped and recoverable through Repair.

## Security and Privacy Review

- Authorization: classroom creation still requires MCC trainer/admin status; shared-guild selection additionally requires current Discord Manage Server permission for the exact guild snowflake.
- Data exposure: no new API response exposes other classrooms, guild bindings, rosters, channels, or message content.
- Input validation: guild IDs remain normalized Discord snowflakes; verified Discord API results supply the stored guild identity/name.
- Channel isolation: command and message bridges continue using exact immutable IDs, never names, as authority.
- Permission isolation: staff and student private channels deny `ViewChannel` to `@everyone` and explicitly allow only scoped identities.
- Secret handling: OAuth/database tokens were not printed; database checks output only schema booleans/metadata. The existing encryption and body-free logging rules are unchanged.
- Database exposure: `mcc_private.classroom_discord_bindings` retains RLS and has zero `anon`/`authenticated` table grants after migration.
- Migration safety: only one named unique constraint is dropped; the transaction has a bounded lock wait and a safe conditional rollback note. No data was deleted.

## Verification

Passed:

- Configured database preflight found the expected guild/classroom unique constraints, zero duplicate guild groups, RLS enabled, and zero browser grants.
- Applied `docs/sql/trainer-shared-discord-guild-classrooms-20260809.sql` successfully.
- Post-migration check confirmed guild uniqueness removed, classroom uniqueness preserved, and the normal guild lookup index present.
- A rolled-back database probe inserted a second binding for an existing guild installation and left zero probe classroom rows.
- Reapplying the follow-up SQL succeeded idempotently.
- Server HTTP bundle: `/home/arik/.bun/bin/bun build src/index.ts --target=bun`.
- Discord worker bundle: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun`.
- Targeted client ESLint for `CreateClassroomWizard.jsx` and `ClassroomDiscordSettingsCard.jsx`.
- Full client production build: `npm run build` with Next.js 16.1.1.
- `git diff --check`.
- Source audit found no remaining dedicated-server rejection/copy in client/server runtime code and confirmed exact channel-ID routing in both Discord command and message bridges.

Partially available:

- Server TypeScript was run with modern module-resolution overrides because the repository's current `moduleResolution=node` configuration is rejected by current TypeScript. The wider check remains blocked by existing missing tldraw/lodash declarations, Bun global typing, Node buffer-version conflicts, and unrelated controller errors. After the new guild-access typing fix, the changed Discord controller/provisioning/queue files produce no focused TypeScript diagnostics.

Not run:

- A live Discord smoke with two newly created classrooms in the same guild was not run because it would create real Discord channels and requires suitable trainer/student test identities. Database behavior, bundle behavior, permission construction, and exact-ID routing were verified locally; live platform capacity and visibility remain rollout checks.
- Supabase advisors were not available because the Supabase MCP/plugin is not installed/exposed in this session.

## Rollout and Rollback

- The follow-up migration is already applied to the configured database.
- Deploy the HTTP server and Discord worker together so creation authorization, naming reconciliation, and binding failure state agree.
- Run Repair per existing binding to adopt the classroom-suffixed names and refresh staff overwrites.
- Before any database rollback, query for guilds with more than one binding. Resolve those bindings explicitly; do not delete or detach classrooms automatically. Recreate guild uniqueness only when no duplicates remain.

## Residual Risks

- Discord channel/category capacity is shared by all classroom bindings in a guild. Exhausted jobs now surface action-required state, but live capacity behavior still needs a shared-guild smoke test.
- Discord administrators retain platform-level visibility capabilities, as already acknowledged by the original integration.
- The pre-existing public classroom-table Supabase RLS production blocker remains outside this task.

## Skill Influence

- The Supabase skill required current changelog review, a real post-migration verification query, RLS/grant confirmation, and explicit disclosure that direct Postgres was used because Supabase MCP was unavailable.
- The Supabase Postgres best-practice skill led to preserving the guild lookup index, bounding migration lock wait, keeping the transaction short, and avoiding database locks across Discord API calls.
- Context7 supplied current official Discord channel, category-parenting, permission-overwrite, and stable-ID documentation.

