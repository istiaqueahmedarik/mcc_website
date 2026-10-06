# Trainer Existing Classroom Discord Binding Implementation Review

Date: 2026-08-09
Task ID: trainer-existing-classroom-discord-binding-20260809
Status: Implemented and internally approved under direct user implementation request

## Outcome

Existing unbound classrooms can now be connected to Discord from the authenticated classroom Settings Discord card by a trainer/admin who can manage that classroom. No new public page or unauthenticated route was added.

## Review Flow

### 1. Requirement trail

- Added `docs/rsd/trainer-existing-classroom-discord-binding-20260809-rsd.md`.
- Added `docs/decisions/trainer-existing-classroom-discord-binding-20260809-technical-decisions.md`.
- Added `docs/tasks/trainer-existing-classroom-discord-binding-20260809-task-plan.md`.

Why: this is a follow-up to the approved Discord classroom integration, but it still changes a private mutation workflow and needs a reviewer-readable path.

### 2. Server mutation

- Added `bindExistingClassroomDiscord` in `server/src/controllers/discordController.ts`.
- Added `POST /classroom/:id/discord` in `server/src/routes/classroomRoute.ts`.
- The handler checks the authenticated MCC user, verifies they can manage the target classroom, revalidates current Discord Manage Server permission for the posted guild snowflake, then opens a short transaction.
- The transaction rejects already-bound classrooms, reuses `createClassroomDiscordBindingForNewClassroom`, seeds default notification rules, and queues `provision_classroom`.

Why: existing and newly created Discord classrooms should share the same binding shape and asynchronous provisioning path.

### 3. Client proxy

- Added `POST` support to `client/src/app/api/classroom/[id]/discord/route.js`.
- The route continues using `forwardJsonToBackend`, so it requires the existing auth cookie and forwards the backend JWT Authorization header.

Why: the browser calls the existing private API proxy shape; this is not a public connect page.

### 4. Trainer Settings UI

- Updated `client/src/components/ClassroomDiscordSettingsCard.jsx`.
- When a classroom is unbound, trainers now see a compact connect panel with Discord account status, eligible server select, timezone, reminder preset, bot install link, inline errors, and a `Connect classroom` action.
- Students/non-managers see only a read-only unbound message.
- Existing bound-classroom status, Repair, rules, roster health, and trusted-link flows remain unchanged.

Why: the action belongs beside Discord status and repair, and the flow should be sequential without creating a separate route.

## Requirement Satisfaction

- Trainer-only old-classroom binding: implemented in Settings and enforced server-side by `canUserManageClassroom`.
- No public route: no page/nav was added; the BFF route requires a session cookie and the Hono route is behind JWT plus Discord-link middleware.
- Shared guild support: the mutation uses the same shared-guild binding helper already verified by the previous migration.
- Current Discord authorization: the handler calls `getManageableDiscordGuildForUser` before DB writes.
- Asynchronous provisioning: the helper queues `provision_classroom` and does not call Discord from the HTTP transaction.
- Already-bound classroom: the handler returns a 409 instead of creating a second classroom binding.

## Security and Privacy Review

- Authorization: MCC classroom manager authorization and Discord Manage Server permission are both checked before mutation.
- Input validation: guild IDs are normalized snowflakes through the existing helper; stored guild name comes from Discord, not from the browser.
- Data exposure: the new response includes only the bound classroom's guild id, timezone, and provisioning state.
- Secret handling: no OAuth tokens, database URLs, or message bodies were printed. Env checks printed only presence booleans.
- Database safety: no schema change was needed; writes use existing indexed `classroom_id` uniqueness and a short transaction.
- External calls: Discord OAuth refresh/guild list lookup happens before the transaction.

## Verification

Passed:

- Server HTTP bundle: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir /tmp/mcc_old_classroom_http_build_20260809`.
- Discord worker bundle: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir /tmp/mcc_old_classroom_worker_build_20260809`.
- Targeted client ESLint: `./node_modules/.bin/eslint src/components/ClassroomDiscordSettingsCard.jsx src/app/api/classroom/[id]/discord/route.js`.
- Full client production build: `npm run build`.
- `git diff --check`.
- Runtime wording search found no remaining obsolete unbound-runtime copy; remaining matches are historical docs.
- Rolled-back database probe created a temporary classroom, inserted binding/rules/provisioning job through the shared helper, forced rollback, and confirmed zero probe classroom residue.

Not run:

- Live Discord smoke was not run because it would create real Discord channels and requires a suitable trainer account, bot installation, and test guild. The endpoint reuses the provider permission check and provisioning job path already used by classroom creation.

## Rollout Notes

- Deploy the HTTP server and client together so the settings card can call the new POST.
- The Discord worker should already be deployed with the shared-guild provisioning changes; it will process the queued `provision_classroom` jobs.
- No database migration is required for this follow-up beyond the already-applied shared-guild migration.
