# Trainer Classroom Discord Integration Handoff

Date: 2026-08-09  
Scope: Discord-first classroom integration continuation  
Repo: `/home/arik/mcc_website`

## Current State

The Discord classroom integration foundation is implemented locally behind feature flags. The base SQL has already been applied to Supabase as migration `20260802150430 trainer_classroom_discord_integration_20260802`. The follow-up trusted/manual-link SQL was applied on 2026-08-09 through the server PostgreSQL connection because Supabase MCP tools were not exposed in this session.

Core feature status:

- Discord OAuth/link/status endpoints are implemented.
- Classroom create can bind a dedicated Discord guild.
- Dedicated Discord worker exists and can register/test `/mcc` commands.
- Private staff/student channel provisioning exists.
- Student private channel naming convention is `Student Name [Student ID]` in product language, rendered as a Discord-safe slug like `john-doe-2022001`; if `users.mist_id` is missing, MCC falls back to the first eight characters of the user UUID.
- Student category shard naming convention is `<classroom-slug> students NN`, for example `advanced-cp students 01`; each shard holds at most 45 active private student channels before creating `02`, `03`, etc.
- Discord-origin message create/edit/delete sync into website student threads.
- `/mcc today`, `/mcc schedule`, `/mcc problems`, `/mcc resources`, `/mcc status`, `/mcc reminders`, `/mcc roster`, `/mcc pending`, `/mcc reconcile`, `/mcc checkin`, `/mcc submit`, `/mcc review`, and live-class `/mcc assign` are implemented.
- Active real students are now forced to connect Discord before entering a Discord-bound classroom.
- Trainers/admins can manually trust a student's Discord account using Discord user ID or @mention.
- OAuth/manual link and enrollment flows queue Discord reconcile jobs so the worker can provision or repair channels.

## Recent Changes From 2026-08-09 Follow-Up

### Server

- `server/src/middleware/discordLinkMiddleware.ts`
  - Resolves classroom context from `/classroom/:id`, `/classroom/class/:classId`, and `/classroom/problem/:problemId`.
  - Forces active real students to connect Discord before accessing a Discord-bound classroom, even if broad migration is staged/off.
  - Returns HTTP 428 with `code: "DISCORD_LINK_REQUIRED"` and a classroom return URL.

- `server/src/controllers/discordController.ts`
  - Adds trusted/manual link endpoint:
    - `POST /classroom/:id/discord/roster/:studentId/trusted-link`
  - Requires Discord snowflake ID or @mention; usernames/display names are labels only.
  - Stores `connection_source = 'trusted_manual'`, `verified_at`, `verified_by_user_id`, and optional `manual_note`.
  - Does not fabricate OAuth tokens.
  - OAuth callback now queues reconcile jobs for all active Discord-bound classroom memberships.
  - Trainer guild listing now rejects manual-only rows because OAuth tokens are still required for Discord guild APIs.

- `server/src/utils/discordProvisioningRequests.ts`
  - New helper to queue `reconcile_classroom` jobs for a classroom or linked user.

- `server/src/controllers/classroomController.ts`
  - Queues Discord reconcile after single enrollment, bulk enrollment, and pre-enrollment approval.

- `server/src/utils/discordProvisioning.ts`
  - Includes `OverwriteType` in channel permission overwrites.
  - Skips Add Guild Member when the connection is manual/no OAuth token.
  - Repairs permission overwrites and naming on existing student channels instead of skipping them.

- `server/src/routes/classroomRoute.ts`
  - Wires the trusted-link route.

### Client

- `client/src/components/DiscordConnectionRequiredCard.jsx`
  - Accepts `returnTo` so classroom OAuth returns students to the attempted classroom.

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  - Handles HTTP 428 `DISCORD_LINK_REQUIRED` with a focused Discord connect screen.

- `client/src/components/ClassroomDiscordSettingsCard.jsx`
  - Adds inline trusted/manual link controls in the Discord roster.
  - Trainer enters Discord ID or @mention, optional display label, then queues bot repair.

- `client/src/app/api/classroom/[id]/discord/roster/[studentId]/trusted-link/route.js`
  - New Next.js proxy for the server trusted-link endpoint.

### SQL

- `docs/sql/trainer-classroom-discord-manual-links-20260809.sql`
  - Adds `connection_source`, `verified_at`, `verified_by_user_id`, and `manual_note`.
  - Relaxes token columns to nullable only because `trusted_manual` rows do not have OAuth tokens.
  - Adds check constraints so OAuth rows still require encrypted tokens and manual rows require verifier metadata.
  - Adds source/verifier indexes.
  - Applied on 2026-08-09 with Bun/postgres using `server/.env` `DATABASE_URL`; follow-up verification confirmed the columns, constraints, indexes, RLS, and zero browser-role grants.

### Discord command continuation

- `server/src/utils/discordCommandHandlers.ts`
  - Adds manager-only `/mcc assign` autocomplete for classes and student/team targets.
  - Adds live-class assignment modal preparation and submission.
  - Validates target refs against exact classroom membership/team data; Discord labels are never trusted as identity.
  - Accepts Codeforces, CodeChef, AtCoder, or custom problem links with platform host checks.
  - Requires strict ISO-with-timezone due dates when a deadline is provided.
  - Inserts `class_problems`, queues private-channel Discord notifications, and mirrors assignment system events into website student threads.
  - Uses command-interaction idempotency with advisory locking and body-free audit metadata.

- `server/src/workers/discordWorker.ts`
  - Registers `/mcc assign` with `class_ref` and `target_ref` autocomplete plus platform choices.
  - Opens the assign modal and handles assign modal submissions.

## Important Security Rules

- Never trust Discord usernames/display names as identity. Use snowflake ID or @mention only.
- Manual/trusted rows can satisfy classroom access and channel overwrite provisioning.
- Manual/trusted rows cannot power automatic guild join or trainer guild listing; those require OAuth access/refresh tokens and scopes.
- Discord Add Guild Member requires the user's OAuth token with `guilds.join`; do not claim manual links can force-join a user to the server.
- Keep OAuth tokens encrypted and never log tokens/message bodies.
- Do not post website-authored human message bodies to Discord.
- Production rollout remains blocked by the pre-existing critical Supabase advisor finding: core public classroom tables have RLS disabled. Fix through a separate security RSD, not blanket RLS.

## Verification Already Run

Passed:

- `cd server && /home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-server-discord-manual`
- `cd server && /home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-discord-manual`
- `cd server && /home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-server-discord-assign`
- `cd server && /home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-discord-assign`
- `cd server && /home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-discord-naming`
- `cd server && /home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-discord-naming`
- `cd client && ./node_modules/.bin/eslint 'src/components/DiscordConnectionRequiredCard.jsx' 'src/components/ClassroomDiscordSettingsCard.jsx' 'src/app/classroom/live/[id]/ClassroomLiveClient.js' 'src/app/api/classroom/[id]/discord/roster/[studentId]/trusted-link/route.js'`
- `git diff --check`

Base live worker smoke previously passed:

- Worker reached `Ready as MCC_Trainer#8415`.
- Guild command readback in `test_server` confirmed `/mcc` registered with expected subcommands.

Not run:

- Supabase MCP apply was unavailable, so the follow-up SQL was applied directly through Postgres; Supabase advisors after the follow-up SQL are still not run.
- End-to-end Discord guild smoke with separate trainer/student accounts.
- `/mcc assign` live Discord smoke with separate trainer/student accounts.

## Remaining Work Queue

Recommended order:

1. Run Supabase security/performance advisors once the Supabase MCP/plugin tools are available.

2. Live E2E smoke in the dedicated Discord test guild:
   - Separate trainer account.
   - Separate student account.
   - OAuth link student.
   - Create/bind classroom.
   - Enroll student.
   - Verify worker provisions private channel.
   - Check `/mcc problems`, `/mcc assign`, `/mcc submit`, `/mcc pending`, `/mcc review`.
   - Verify website thread receives Discord-origin system events.
   - Verify website human messages do not post to Discord.
   - Verify manual trusted-link path with an ID/mention and bot repair.

3. Production hardening:
   - Rotate any Discord secrets pasted in chat before production.
   - Confirm privileged Message Content intent status before wider rollout.
   - Keep `DISCORD_INTEGRATION_ENABLED` and `DISCORD_LINK_ENFORCEMENT_MODE` staged.
   - Address public-table RLS through a separate approved security RSD.

## Files To Review First

- `docs/tasks/trainer-classroom-discord-integration-20260802-task-plan.md`
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`
- `docs/knowledge-base/project-index.md`
- `docs/knowledge-base/patterns.md`
- `docs/knowledge-base/decisions.md`
- `docs/knowledge-base/quality-rules.md`
- `server/src/utils/discordCommandHandlers.ts`
- `server/src/workers/discordWorker.ts`
- `server/src/controllers/discordController.ts`
- `server/src/controllers/classroomController.ts`
- `server/src/utils/discordProvisioning.ts`
- `client/src/components/ClassroomDiscordSettingsCard.jsx`

## Subagent Guidance

If using a subagent, keep write scopes disjoint. This repo's `AGENTS.md` requires parallel agents to work in separate Git worktrees. Because the current Discord implementation has many uncommitted/untracked files, a safe first subagent task is read-only investigation/planning for `/mcc assign` or Supabase apply readiness. If the subagent will edit code, create an isolated worktree and seed it with the current Discord diff before editing.

Suggested first subagent task:

> Plan and execute the live Discord test-guild smoke. Do not edit files. Use separate trainer/student accounts, verify `/mcc assign` through autocomplete/modal/submission, confirm `class_problems`, student-thread events, delivery jobs, and audit metadata, and report any Discord permission/provisioning drift.
