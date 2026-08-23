# Trainer Classroom Discord Integration Implementation Review

Date: 2026-08-02; follow-up updated 2026-08-09
Task ID: trainer-classroom-discord-integration-20260802
Status: Foundation implemented; base SQL and trusted/manual link SQL applied; env/live guild rollout pending

## What Changed

This change implements the first production-gated Discord bridge foundation for trainer classrooms. PostgreSQL/MCC remains authoritative; Discord is added as a linked-identity, private-channel, inbound-thread-sync, notification, and command-adapter surface.

The 2026-08-09 follow-up closes the classroom-access and late-linking gaps: active real students are forced to connect Discord before entering Discord-bound classrooms, classroom managers can add a verified Discord snowflake/@mention for a student as a trusted manual link, all link/enrollment paths queue a Discord reconcile job so the worker can add/repair the private channel, and trainers can assign live class problems from Discord through `/mcc assign`.

## Review Flow

1. Planning and source-of-truth boundary
   - Added the RSD at `docs/rsd/trainer-classroom-discord-integration-20260802-rsd.md`.
   - Added technical decisions at `docs/decisions/trainer-classroom-discord-integration-20260802-technical-decisions.md`.
   - Added ADR-0012 at `docs/adr/0012-classroom-discord-bridge.md`.
   - Added the execution/deployment plan at `docs/tasks/trainer-classroom-discord-integration-20260802-task-plan.md`.

2. Database artifact
   - Added `docs/sql/trainer-classroom-discord-integration-20260802.sql`.
   - The SQL is additive and keeps Discord data in `mcc_private`.
   - It adds Discord OAuth state/connection, guild binding, channel mapping, message-link, notification-rule, delivery-job, check-in, and body-free command-audit tables.
   - It adds `due_at` for live/topic assignments and mutation fields/ledger support for student-thread edits/deletions.
   - It enables RLS and revokes browser roles for new private tables.
   - Applied to Supabase through MCP as migration `20260802150430 trainer_classroom_discord_integration_20260802` on 2026-08-02.
   - Added follow-up SQL `docs/sql/trainer-classroom-discord-manual-links-20260809.sql` for trusted/manual Discord links.
   - The follow-up SQL keeps OAuth rows token-backed while allowing `trusted_manual` rows to have null token columns only when `verified_at` and `verified_by_user_id` are present.
   - Applied the follow-up SQL on 2026-08-09 through the server PostgreSQL connection because Supabase MCP tools were not exposed in this session.
   - Follow-up verification confirmed the manual-link columns, check constraints, indexes, RLS enabled on `mcc_private.discord_user_connections`, and zero `anon`/`authenticated` grants.

3. Server configuration, OAuth, and API surface
   - Added Discord config, OAuth REST, token encryption, delivery queue, provisioning, and thread-bridge utilities under `server/src/utils/`.
   - Added `server/src/controllers/discordController.ts` for:
     - `POST /auth/discord/authorize`
     - `GET /auth/discord/callback`
     - `GET /auth/discord/status`
     - `GET /classroom/discord/guilds`
     - classroom Discord status/settings/rules/roster/reconcile
     - classroom daily check-ins
   - Added `server/src/middleware/discordLinkMiddleware.ts` for feature-flagged HTTP 428 Discord-link enforcement.
   - Extended the middleware so active real students are forced through HTTP 428 Discord linking when accessing a Discord-bound classroom, even when broad/global migration mode is still off.
   - Wired the new routes in `server/src/routes/authRoute.ts` and `server/src/routes/classroomRoute.ts`.
   - Extended `createClassroom` in `server/src/controllers/classroomController.ts` to accept Discord guild/timezone/reminder data and queue provisioning in the same DB transaction.
   - Extended live problem assignment and topic assignment APIs to accept ISO `dueAt` values for reminder scheduling.
   - Added `POST /classroom/:id/discord/roster/:studentId/trusted-link` for managers/admins to trust a Discord user ID/@mention after out-of-band verification.
   - OAuth callback, single-student enrollment, bulk enrollment, pre-enrollment approval, and trusted/manual linking now queue Discord reconcile work so late links/enrollments are provisioned.

4. Discord worker
   - Added `discord.js@14.26.2` and `bun run discord:worker`.
   - Added `server/src/workers/discordWorker.ts`.
   - The worker owns Gateway login, slash command registration, durable job leasing, provisioning/reconcile jobs, notification jobs, and Discord message create/edit/delete forwarding.
   - The worker can register slash commands to an optional `DISCORD_DEV_GUILD_ID` / `DISCORD_TEST_GUILD_ID` for faster local test-guild iteration.
   - Added `server/src/utils/discordCommandHandlers.ts` for mapped-channel `/mcc` command resolution, audit records, read-only classroom summaries, trainer roster/pending/reminder views, and trainer Repair queueing.
   - Added `/mcc checkin` as a Discord modal for students in their own private channel; it writes to `mcc_private.classroom_daily_checkins` with body-free command audit metadata.
   - Added `/mcc submit` as a Discord modal for students in their own private channel. Students paste a reference from `/mcc problems`, provide a solution link and/or code, and MCC updates either live `class_problems` or topic `classroom_topic_problem_progress` to `pending_approval`.
   - `/mcc submit` writes a website student-thread system event in the same database transaction as the submission status mutation and publishes the existing private Realtime thread update after commit. Command audit metadata stores IDs/booleans only, not submitted code or notes.
   - Added `/mcc review` as a trainer-only Discord modal. Trainers paste a Review Ref from `/mcc pending`, choose `approve` or `needs_revision`, and MCC preserves trainer-owned final verdicts by updating live/topic pending rows to `solved` or `tried`.
   - `/mcc review` writes trainer feedback to the website student thread in the same database transaction as the review mutation and audits only target IDs/status/feedback-presence, not feedback bodies.
   - Added `/mcc assign` as a trainer-only live-class assignment flow with class and student/team autocomplete, platform choices, a five-field modal, strict deadline/link validation, assignment insertion, delivery-job enqueueing, website student-thread system events, and body-free idempotent audit metadata.
   - Reconcile now resets permission overwrites and naming on existing private student channels instead of assuming already-created rows are healthy.
   - Student private Discord channels use the human naming convention `Student Name [Student ID]`, rendered as a Discord-safe slug such as `john-doe-2022001`; category shards use `<classroom-slug> students NN` with 45 active student channels per category.
   - OAuth-linked students can be auto-added to a guild with `guilds.join`; trusted/manual students can be channel-permissioned by Discord ID, but cannot be force-joined without their OAuth token.

5. Client UI
   - Added `client/src/components/CreateClassroomWizard.jsx`, a reusable three-step wizard:
     - Classroom Details
     - Discord Server
     - Automation
   - Replaced duplicate create-classroom dialogs in:
     - `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
     - `client/src/app/classroom/list/ClassroomListClient.js`
   - Added `client/src/app/api/classroom/discord/guilds/route.js` so the wizard can load eligible trainer guilds through the existing cookie-authenticated Next API proxy.
   - Added `client/src/app/api/auth/callback/discord/route.js` as a frontend OAuth callback bridge for Discord Developer Portal redirect URIs that point at the Next.js app.
   - Added classroom Discord settings/rules/roster/reconcile proxy routes under `client/src/app/api/classroom/[id]/discord/`.
   - Added `client/src/components/ClassroomDiscordSettingsCard.jsx` inside the existing classroom Settings tab for provisioning health, privacy copy, reminder rule edits, Repair, staff-channel deep link, and roster states.
   - Added inline trusted/manual link controls to the Discord roster. Trainers enter a Discord user ID or @mention, optional display label, and queue bot repair after the server records the trusted link.
   - Updated classroom live loading so HTTP 428 `DISCORD_LINK_REQUIRED` renders a focused connect-card recovery screen for students entering a Discord-bound classroom.
   - Updated `client/src/components/ClassroomThreadsTab.js` so Discord-origin edit/delete deltas update existing message rows and show edited/deleted labels.
   - Added `client/src/components/DiscordConnectionRequiredCard.jsx` and wired it into the trainer dashboard/classroom list for HTTP 428 recovery.

## Security and Privacy Review

- Discord tokens are encrypted before storage and require a server-only encryption key.
- Discord IDs are stored as `text` snowflakes.
- Browser roles are revoked from new `mcc_private` Discord tables.
- Inbound Discord messages resolve by exact `(guild_id, channel_id)` and linked Discord user, not names.
- Bots, webhooks, unmapped channels, and unauthorized users are ignored/rejected.
- Website-authored human message bodies are not posted to Discord.
- Discord-origin deletions become website tombstones and remove copied attachment objects.
- Automatic mentions are disabled for bot sends/replies.
- Message bodies and OAuth tokens should not be logged.
- Trusted/manual links require a Discord snowflake ID or @mention; display usernames are stored only as labels and are not trusted as stable authorization identifiers.
- Trusted/manual rows do not fabricate OAuth tokens. Trainer guild selection and automatic guild join still require direct OAuth with the relevant Discord scopes.
- Classroom access gating still exempts pre-enrolled placeholders until they become active real student accounts.
- Production rollout remains blocked until the existing public classroom-table RLS advisor finding is fixed with a separate security RSD.

## Verification

Passed:

- `server`: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build`
- `server`: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-discord-settings`
- `server`: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-server-callback`
- `server`: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker`
- `server`: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-callback`
- `server`: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-commands`
- `server`: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-checkin`
- `server`: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-submit-2`
- `server`: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-review-help`
- `client`: `./node_modules/.bin/eslint src/components/DiscordConnectionRequiredCard.jsx src/components/CreateClassroomWizard.jsx src/components/ClassroomThreadsTab.js src/app/trainer/dashboard/TrainerDashboardClient.js src/app/classroom/list/ClassroomListClient.js src/app/api/classroom/discord/guilds/route.js`
- `client`: `./node_modules/.bin/eslint src/components/ClassroomDiscordSettingsCard.jsx src/app/classroom/live/[id]/ClassroomLiveClient.js src/app/api/classroom/[id]/discord/route.js src/app/api/classroom/[id]/discord/rules/route.js src/app/api/classroom/[id]/discord/reconcile/route.js src/app/api/classroom/[id]/discord/roster/route.js`
- `client`: `./node_modules/.bin/eslint src/app/api/auth/callback/discord/route.js src/components/ClassroomDiscordSettingsCard.jsx src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `client`: `npm run build`
- Live worker smoke in Discord test guild `test_server`: worker reached `Ready as MCC_Trainer#8415` and guild command readback confirmed `/mcc` with expected subcommands.
- `server`: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-server-discord-manual`
- `server`: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-discord-manual`
- `server`: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-server-discord-assign`
- `server`: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-discord-assign`
- `server`: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-discord-naming`
- `server`: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-discord-naming`
- `client`: `./node_modules/.bin/eslint src/components/DiscordConnectionRequiredCard.jsx src/components/ClassroomDiscordSettingsCard.jsx src/app/classroom/live/[id]/ClassroomLiveClient.js src/app/api/classroom/[id]/discord/roster/[studentId]/trusted-link/route.js`
- `git diff --check`
- Follow-up SQL apply through direct Postgres with `server/.env` `DATABASE_URL`: `docs/sql/trainer-classroom-discord-manual-links-20260809.sql`.
- Direct follow-up SQL verification confirmed `connection_source`, `verified_at`, `verified_by_user_id`, `manual_note`, `discord_user_connections_source_check`, `discord_user_connections_token_source_shape_check`, `discord_user_connections_source_idx`, `discord_user_connections_verified_by_idx`, RLS enabled, and zero browser-role grants.

Not run / not available:

- `server`: `/home/arik/.bun/bin/bun test` reported no tests found.
- `server`: `bun x tsc --noEmit --pretty false` is blocked by the existing `moduleResolution=node10` tsconfig value, which current TypeScript rejects before checking source files.
- End-to-end Discord guild smoke with separate trainer/student accounts has not been run yet.
- Supabase MCP advisor run after `docs/sql/trainer-classroom-discord-manual-links-20260809.sql` is still pending because the Supabase MCP/plugin tools are unavailable in the current session.

Supabase MCP verification after SQL apply:

- Migration list includes `20260802150430 trainer_classroom_discord_integration_20260802`.
- Expected `mcc_private` Discord tables and `public.classroom_student_thread_message_revisions` exist.
- New private/revision tables have RLS enabled.
- `anon` and `authenticated` have no direct grants on the new `mcc_private` tables or the thread revision ledger.
- `due_at`, `edited_at`, `deleted_at`, and `mutation_revision` columns are present with expected types.

Cleanup:

- Temporary server bundle output folders created during verification were moved out of the repo after the build checks.

## Current Rollout Blockers

- Configure Discord OAuth/bot environment variables and token encryption key.
- Run Supabase advisors once the Supabase connector/plugin is enabled.
- Enable Discord bot Gateway intents, including privileged Message Content when needed for rollout.
- Run a live test-guild smoke with separate trainer and student accounts.
- Run `/mcc assign` in the live Discord test guild with separate trainer/student accounts.
- Remediate the pre-existing critical Supabase RLS advisor finding for core public classroom tables through a separate approved security RSD.

## References Used

- Discord OAuth and permissions: https://docs.discord.com/developers/platform/oauth2-and-permissions
- Discord Guild resource / Add Guild Member: https://docs.discord.com/developers/resources/guild
- Discord Gateway intents: https://docs.discord.com/developers/events/gateway
- Discord rate limits: https://docs.discord.com/developers/topics/rate-limits
- Supabase changelog reviewed on 2026-08-02: https://supabase.com/changelog
