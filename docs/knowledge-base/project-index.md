# Project Index

## 2026-09-01 - classroom-contest-upsolves - Implemented Entry Points

Source:
- `client/src/components/ClassroomContestPanel.jsx`
- `server/src/controllers/classroomContestController.ts`
- `server/src/services/classroomContestRankService.ts`
- `server/src/services/vjudgeContestService.ts`
- `server/src/services/codeforcesContestService.ts`
- `docs/sql/classroom-contest-upsolves-20260901.sql`

Fact:
Each classroom Codeforces or VJudge contest item now stores an `include_upsolves` flag. It defaults to false, so snapshots use contest-time submissions only. Trainers can opt in from the contest form; changing the flag invalidates old snapshots and marks the generated report stale. VJudge then retains late rank submissions, while numeric Codeforces contests scan bounded post-contest status pages and apply only submissions belonging to classroom-mapped handles. EDU lesson standings keep their existing practice-course behavior.

Applies when:
Maintaining classroom contest item configuration, snapshot refresh behavior, VJudge duration filtering, Codeforces post-contest submission fetching, or report solve/penalty inputs.

Do not overgeneralize:
This does not change global contest reports, enable upsolves by default, include unrelated Codeforces participants, or alter already generated reports without a new fetch and regeneration.

## 2026-09-01 - classroom-codeforces-edu-lesson-standings - Implemented Entry Points

Source:
- `server/src/services/codeforcesContestService.ts`
- `server/src/utils/codeforcesSession.ts`
- `server/src/controllers/classroomContestController.ts`
- `client/src/components/ClassroomContestPanel.jsx`
- `client/src/app/api/classroom/[id]/contests/codeforces-session/route.js`
- `docs/sql/classroom-codeforces-edu-lesson-standings-20260901.sql`

Fact:
Classroom-private Codeforces reports accept EDU lesson standings URLs in addition to numeric contests. EDU sources use `edu:<course>:<lesson>` identities, crawl authenticated standings HTML with a trainer-provided HTTP-only JSESSIONID, parse solved and rejected-attempt penalty separately, and persist only verified/overridden classroom handles. The crawler has bounded response size, concurrency, and page count; missing/expired sessions fail before snapshot persistence. The Supabase identifier-constraint migration was applied and verified on 2026-09-01. The classroom live shell now caps at 1600px instead of 1060px so dense contest and report surfaces can use wide displays without changing small-screen padding behavior.

Applies when:
Maintaining classroom Codeforces URL parsing, EDU course snapshots, provider sessions, report scoring/breakdowns, Codeforces handle mapping, or the classroom contest identifier constraint.

Do not overgeneralize:
This does not add EDU support to global legacy reports, store Codeforces web sessions in Postgres, create Codeforces lists/friends, accept arbitrary crawl origins, or auto-refresh standings.

## 2026-09-01 - user-full-name-reverification - Implemented Entry Points

Source:
- `client/src/components/ProfileSidebarEditor.jsx`
- `client/src/app/trainer/profile/TrainerProfileClient.jsx`
- `server/src/controllers/userController.ts`
- `server/src/controllers/authController.ts`

Fact:
Members, trainers, and admins can edit their full name from their existing profile editor. A normalized name change atomically sets `users.granted` to `false`, which returns the account to the existing admin pending-user queue; resubmitting the same name preserves the current verification state. Both profile surfaces explain this before save and show pending status afterward. Pending-user listing, acceptance, and rejection now revalidate the caller against the stored admin role.

Applies when:
Maintaining profile identity edits, `POST /user/basic/set`, verification status presentation, or the `/auth/user/pendings`, `/auth/user/accept`, and `/auth/user/reject` admin workflow.

Do not overgeneralize:
Changing phone, batch, profile picture, trainer biography, or social links does not reset account verification. This feature does not add a separate verification table, verification history, or notification email when a name change enters review.

## 2026-08-17 - trainer-student-context-menu-simplification-20260817 - Implemented Entry Points

Source:
- `docs/reviews/trainer-student-context-menu-simplification-20260817-implementation-review.md`
- `docs/decisions/trainer-student-context-menu-simplification-20260817-technical-decisions.md`

Fact:
The role-prioritized classroom navigation, scoped context menus, and compact repeaters are implemented in `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`; the reusable Radix wrapper is `client/src/components/ui/context-menu.jsx`. Trainers keep Updates, Live, Topics, and People visible; students keep Updates, Topics, Challenges, and Live visible; all existing secondary tab values remain reachable through More. Student/group/classmate/resource actions share definitions between visible overflow and context menus, while secondary identity/member facts use a bounded focus-returning details dialog.

Applies when:
Implementing or reviewing this task's live classroom navigation, compact People rows, resource-card actions, tours, or context-menu primitive.

Do not overgeneralize:
This implementation does not change server/API/schema/auth/polling behavior, URL-backed tabs, dependencies, whole-page context-menu behavior, or unrelated classroom content.

## 2026-08-10 - trainer-classroom-codeforces-contests-20260810 - Implemented Entry Points

Source:
- `docs/reviews/trainer-classroom-codeforces-contests-20260810-implementation-review.md`
- `docs/decisions/trainer-classroom-codeforces-contests-20260810-technical-decisions.md`

Fact:
Classroom contest reports now support mixed VJudge and Codeforces contest items inside the classroom-private workflow. Provider adapters live in `server/src/services/classroomContestRankService.ts` and `server/src/services/codeforcesContestService.ts`; encrypted trainer Codeforces credential helpers live in `server/src/utils/codeforcesCredentialCrypto.ts`; classroom persistence, credential endpoints, unmapped Codeforces row review, and report generation stay in `server/src/controllers/classroomContestController.ts`; trainer/student UI stays in `client/src/components/ClassroomContestPanel.jsx`; report display compatibility stays in `client/src/components/ReportTable.js`; rollout SQL is split into `docs/sql/trainer-classroom-codeforces-contests-20260810-expand.sql` and `docs/sql/trainer-classroom-codeforces-contests-20260810-contract.sql`.

Applies when:
Maintaining classroom contest provider selection, Codeforces standings fetches, trainer Codeforces credential setup, classroom contest snapshots, provider-aware handle overrides, map/ignore handling for unmatched Codeforces rows, contest demerits, mixed-provider report generation, report table identity/profile display, or classroom-only Codeforces rollout.

Do not overgeneralize:
This does not change global VJudge contest-rank routes, global contest-report tables/routes, saved standings, public report sharing, BAPS/Toph standings, team collection, or student-managed Codeforces credentials.

## 2026-08-10 - classroom-discord-channel-change-20260810 - Implemented Entry Points

Source:
- `server/src/controllers/discordController.ts`
- `server/src/routes/classroomRoute.ts`
- `client/src/components/ClassroomDiscordSettingsCard.jsx`

Fact:
Bound classroom Discord settings now include a trainer-only Change channels option. The UI opens from `ClassroomDiscordSettingsCard.jsx`, lists eligible Discord servers through the existing guild endpoint, and posts to `POST /classroom/:id/discord/channels/change` via `client/src/app/api/classroom/[id]/discord/channels/change/route.js`. The server revalidates MCC classroom-manager access and current Discord Manage Server permission, archives old active channel mappings, deletes old category mappings, updates the binding's guild installation when needed, clears `staff_channel_id`, marks provisioning, and queues a fresh `provision_classroom` job. The worker reuses student channel rows and clears archive markers when new channel IDs are assigned.

Applies when:
Maintaining Discord channel/server moves, fresh channel reprovisioning, old-classroom Discord repair, classroom Discord settings, provisioning counts, or channel mapping archive behavior.

Do not overgeneralize:
This does not delete old Discord channels from the server, let trainers type arbitrary channel IDs/names, bypass current Discord permission checks, change classroom thread history, or use Discord names as authorization.

## 2026-08-10 - admin-full-user-csv-20260810 - Implemented Entry Points

Source:
- `server/src/controllers/classroomController.ts`
- `server/src/routes/classroomRoute.ts`
- `client/src/app/admin/trainers/TrainersManagementClient.js`

Fact:
Admin full-user creation is implemented on the existing `/admin/trainers` management surface. Single-user creation posts to `POST /classroom/admin/create-user`; CSV bulk creation posts to `POST /classroom/admin/create-users-bulk`; both are Hono admin-only handlers in `classroomController.ts` and reuse the existing `users` table without schema changes. The UI now has one full Create User dialog plus a CSV Import dialog with local header parsing, preview, template download, and server row-result feedback.

Applies when:
Maintaining admin account creation, CSV user imports, trainer/admin role setup, admin password management, `/admin/trainers`, or the `classroom/admin/users` payload.

Do not overgeneralize:
This does not add public invitations, email delivery, account deletion, `.xlsx` support, media upload handling, schema migrations, or classroom roster enrollment. Admin-created accounts remain login-capable `users` rows, not pre-enrolled placeholders.

## 2026-08-09 - trainer-classroom-contests-20260809 - Implemented Entry Points

Source:
- `docs/reviews/trainer-classroom-contests-20260809-implementation-review.md`

Fact:
Trainer classroom contest reports are implemented as a classroom-private VJudge workflow. SQL lives in `docs/sql/trainer-classroom-contests-20260809.sql` with lowercase `classroom_contest_*` tables. Server logic lives in `server/src/controllers/classroomContestController.ts`; classroom routes are registered under `/classroom/:id/contests/*` in `server/src/routes/classroomRoute.ts`; shared VJudge rank parsing/fetching lives in `server/src/services/vjudgeContestService.ts` and is reused by global `server/src/routes/vjudgeRoute.ts`. Browser proxy routes live under `client/src/app/api/classroom/[id]/contests/`, and the classroom contest UI is `client/src/components/ClassroomContestPanel.jsx`, mounted as a trainer workbench plus student read-only Contests and Contest Progress tabs in `ClassroomLiveClient.js`.

Applies when:
Maintaining classroom contest rooms, classroom VJudge snapshots, classroom handle overrides, classroom contest demerits, private classroom report sharing, VJudge rank processing, trainer classroom contest management, or student classroom contest standings/progress tabs.

Do not overgeneralize:
This does not change global contest rooms, global demerits, public contest reports, saved standings, team-collection workflows, unauthenticated live report pages, or the BAPS/Toph standings system.

## 2026-08-09 - trainer-existing-classroom-discord-binding-20260809 - Implemented Entry Points

Source:
- `docs/reviews/trainer-existing-classroom-discord-binding-20260809-implementation-review.md`

Fact:
Existing unbound classrooms can now be connected to Discord from the authenticated trainer classroom Settings Discord card. The UI lives in `client/src/components/ClassroomDiscordSettingsCard.jsx`; the authenticated Next.js proxy is `client/src/app/api/classroom/[id]/discord/route.js`; the Hono mutation is `POST /classroom/:id/discord` in `server/src/routes/classroomRoute.ts`; and the server implementation is `bindExistingClassroomDiscord` in `server/src/controllers/discordController.ts`. The endpoint revalidates MCC classroom manager access plus current Discord Manage Server permission, then reuses the existing binding/default-rules/provisioning-job helper.

Applies when:
Maintaining old-classroom Discord connection, classroom Settings Discord unbound state, shared-guild binding, trainer guild authorization, or post-create provisioning.

Do not overgeneralize:
This does not add a public connect page, unauthenticated route, one-classroom-to-many-guild support, schema migration, OAuth scope change, or live Discord smoke coverage.

## 2026-08-09 - trainer-shared-discord-guild-classrooms-20260809 - Implemented Shared-Guild Entry Points

Source:
- `docs/reviews/trainer-shared-discord-guild-classrooms-20260809-implementation-review.md`
- `docs/adr/0013-shared-discord-guild-classroom-bindings.md`

Fact:
One Discord guild installation can now back multiple `mcc_private.classroom_discord_bindings`, while `classroom_id` remains unique. Clean-install SQL is in `docs/sql/trainer-classroom-discord-integration-20260802.sql`; the applied follow-up is `docs/sql/trainer-shared-discord-guild-classrooms-20260809.sql`. Creation authorization and verified guild metadata live in `server/src/controllers/discordController.ts` and `classroomController.ts`; collision-aware staff/category naming plus overwrite reconciliation lives in `server/src/utils/discordProvisioning.ts`; binding-scoped dead-letter state lives in `server/src/utils/discordDeliveryQueue.ts`; shared-server copy lives in `CreateClassroomWizard.jsx` and `ClassroomDiscordSettingsCard.jsx`.

Applies when:
Maintaining classroom creation with Discord, guild installation/binding topology, shared-guild channel provisioning, Discord selection authorization, provisioning failures, or shared-server UI copy.

Do not overgeneralize:
One classroom still binds to at most one guild, channel IDs remain routing authority, Discord roles/guild membership alone do not authorize MCC access, and live shared-guild Discord smoke/capacity testing remains a rollout check.

## 2026-08-09 - trainer-student-roster-apple-redesign-20260809 - Implemented Entry Points

Source:
- `docs/reviews/trainer-student-roster-apple-redesign-20260809-implementation-review.md`

Fact:
Classroom People roster redesign is implemented in `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`. Trainer People now uses a full-width Students/Groups workspace with local search, separate show-more counts, Add Students Single/CSV dialog, pre-enrollment review preservation, link-pending attention lane, overflow removal confirmation, Create Group dialog, and Edit Members dialog. Student Group & Roster now uses a Groups/Classmates switcher, sorts the current student's groups first, and renders classmates through read-only scan rows.

Applies when:
Maintaining trainer People roster management, student Group & Roster presentation, classroom group member dialogs, roster batching/search, or People-tab motion.

Do not overgeneralize:
This implementation does not change server/API routes, auth, database schema, enrollment visibility semantics, global tokens, classroom tabs outside People, or Discord integration behavior.

## 2026-08-02 - trainer-classroom-discord-integration-20260802 - Implemented Foundation Entry Points

Source:
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`

Fact:
Discord classroom integration foundation is implemented behind feature flags. Server entry points live in `server/src/controllers/discordController.ts`, `server/src/routes/authRoute.ts`, `server/src/routes/classroomRoute.ts`, `server/src/middleware/discordLinkMiddleware.ts`, and Discord utilities under `server/src/utils/discord*.ts`. The standalone worker is `server/src/workers/discordWorker.ts` and is launched with `bun run discord:worker`; it can register commands to `DISCORD_DEV_GUILD_ID` / `DISCORD_TEST_GUILD_ID` for local guild testing and uses `server/src/utils/discordCommandHandlers.ts` for mapped-channel `/mcc` read-only/status commands, trainer Repair queueing, student `/mcc checkin` modal submissions, student `/mcc submit` modal submissions into the existing pending-review flow, trainer `/mcc review` modal verdicts/feedback for pending submissions, and trainer `/mcc assign` live-class problem assignment through autocomplete/modal. Classroom-aware middleware forces active real students to connect Discord before entering a Discord-bound classroom, even while broad migration remains staged. The reusable creation UI is `client/src/components/CreateClassroomWizard.jsx`, the HTTP 428 recovery card is `client/src/components/DiscordConnectionRequiredCard.jsx`, both are used by trainer classroom entry points and classroom live recovery, the guild proxy is `client/src/app/api/classroom/discord/guilds/route.js`, the frontend OAuth callback bridge is `client/src/app/api/auth/callback/discord/route.js`, and the classroom Settings integration card is `client/src/components/ClassroomDiscordSettingsCard.jsx` with settings/rules/roster/reconcile/trusted-link proxies under `client/src/app/api/classroom/[id]/discord/`. SQL lives at `docs/sql/trainer-classroom-discord-integration-20260802.sql` and was applied through Supabase MCP as migration `20260802150430 trainer_classroom_discord_integration_20260802`; trusted/manual link follow-up SQL lives at `docs/sql/trainer-classroom-discord-manual-links-20260809.sql` and was applied on 2026-08-09 through direct Postgres because Supabase MCP was unavailable.

Applies when:
Maintaining Discord linking, classroom guild binding, provisioning jobs, private channel mapping, Discord-to-thread sync, Discord check-ins/rules/roster/trusted-link endpoints, the classroom creation wizard, or classroom Settings Discord controls.

Do not overgeneralize:
Topic assignment from Discord is not part of `/mcc assign` v1, Supabase advisors after the manual-link SQL are still pending, and live Discord guild verification with separate trainer/student accounts still requires a dedicated test guild.

## 2026-08-02 - trainer-classroom-discord-integration-20260802 - Approved Technical Design

Source:
- `docs/decisions/trainer-classroom-discord-integration-20260802-technical-decisions.md`
- `docs/adr/0012-classroom-discord-bridge.md`

Fact:
MCC/PostgreSQL remains authoritative for users, classrooms, threads, submissions, reviews, schedules, notification rules, and check-ins. Discord is an authenticated input and notification adapter. V1 uses one dedicated Discord guild per classroom and private student text channels. Discord-origin messages, attachments, edits, and deletions can mirror into website student threads; website-authored human message bodies must not post outward to Discord. Discord network calls run from a separate worker after commit through durable jobs.

Applies when:
Changing classroom Discord topology, source-of-truth boundaries, OAuth token handling, private channel permissions, message sync direction, delivery jobs, worker responsibilities, or command adapters.

Do not overgeneralize:
This decision does not authorize using Discord channel names as identity, storing plaintext OAuth tokens, requesting Administrator permission, logging message bodies, bypassing classroom authorization, or broad public-table RLS remediation outside a separate security RSD.

## 2026-08-02 - trainer-classroom-discord-integration-20260802 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-classroom-discord-integration-20260802-rsd.md`

Fact:
The Discord-first classroom integration is approved to require linked unique Discord accounts, create one-classroom/one-guild bindings, provision private student channels, sync Discord-origin messages to existing student threads, add durable notification/reminder/check-in infrastructure, add Discord OAuth/guild/status/rules/check-in APIs, and replace duplicate classroom creation forms with one Discord-aware wizard.

Applies when:
Implementing or reviewing Discord OAuth, trainer guild selection, classroom creation enforcement, provisioning, delivery queue, check-ins, reminders, Discord-origin thread events, and classroom creation UI.

Do not overgeneralize:
Bulk imports, destructive classroom deletion, arbitrary website navigation from Discord, live IDE/board control, full production rollout, and critical public classroom-table RLS remediation are outside this v1 scope.

## 2026-08-02 - trainer-student-thread-instant-realtime-20260802 - Approved Implementation Plan

Source:
- `docs/tasks/trainer-student-thread-instant-realtime-20260802-task-plan.md`

Fact:
Instant student-thread work proceeds serially through additive SQL, removal of runtime DDL, private shadow-identity Realtime authorization/registry/publishing, transactional read/write/catch-up APIs, client private subscription/renewal/state isolation, local/live verification, and implementation review. SQL must be applied before server/client code depends on revisions, idempotency, registry uniqueness, and private policies.

Applies when:
Coordinating or reviewing the instant student-thread implementation and deployment order.

Do not overgeneralize:
The plan does not approve destructive down migrations, public fallback, service-key exposure, broad project-wide RLS cleanup, or claiming two-browser latency without measured sessions.

## 2026-08-02 - trainer-student-thread-instant-realtime-20260802 - Approved Technical Design

Source:
- `docs/decisions/trainer-student-thread-instant-realtime-20260802-technical-decisions.md`
- `docs/adr/0011-private-gap-free-classroom-thread-realtime.md`

Fact:
The approved instant-thread design uses an MCC-authorized, server-managed Supabase Auth shadow identity with the MCC UUID and `anon` role; private receive-only Realtime RLS bound to the active channel registry; canonical safe message payloads after commit; per-thread revision catch-up; transactional/idempotent sends; membership-lifecycle thread provisioning; expiring renewed topics; and browser generation guards. ADR-0011 supersedes ADR-0010's scoped-public-topic transport and ADR-0008's opaque-refetch transport choice while preserving the student-scoped product model.

Applies when:
Implementing or reviewing the instant student-thread migration, server auth bridge, Realtime hook, thread controller, registry lifecycle, or catch-up UI.

Do not overgeneralize:
The shadow token does not authorize direct application-table access and must remain `anon`; a future signing-key bridge or role change requires a new security decision.

## 2026-08-02 - trainer-student-thread-instant-realtime-20260802 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-student-thread-instant-realtime-20260802-rsd.md`

Fact:
Trainer/student thread realtime is approved for an instant, private, gap-free delivery redesign. The healthy receive path must render canonical committed messages without per-message HTTP refetches; reconnects and initial subscription must catch up with a stable `(created_at, id)` cursor; writes must be transactional and idempotent; thread switching must reject stale responses; request-time DDL and read-path provisioning writes must be removed; and two-session commit-to-render latency targets are p50 at or below 250 ms and p95 at or below 750 ms.

Applies when:
Changing student-thread Realtime credentials/channels, thread/manager payloads, message transactions, attachment persistence, cursor pagination, idempotency, browser thread state, channel renewal, classroom schema guards, or realtime latency telemetry.

Do not overgeneralize:
This does not approve direct browser application-table writes, service-key exposure, public message payloads, hidden polling, legacy problem-thread revival, broad UI redesign, or unrelated project-wide RLS remediation. The solution must not widen the existing public-schema exposure.

## 2026-08-02 - trainer-student-thread-realtime-hardening-performance-20260802 - Implemented Entry Points

Source:
- `docs/reviews/trainer-student-thread-realtime-hardening-performance-20260802-implementation-review.md`

Fact:
Trainer/student thread realtime hardening passed implementation-review approval on 2026-08-02. It is implemented through scoped SQL in `docs/sql/trainer-student-thread-realtime-hardening-20260802.sql`, server-issued opaque channel helpers in `server/src/utils/classroomStudentThreadsSchema.ts`, student-thread summary/message routes in `server/src/controllers/classroomController.ts` and `server/src/routes/classroomRoute.ts`, uncached authorized fetch support in `client/src/lib/action.js`, broadcast-envelope handling in `client/src/hooks/useClassroomThreadRealtime.js`, and incremental list/thread updates in `client/src/components/ClassroomThreadsTab.js`.

Applies when:
Maintaining trainer/student classroom threads, Realtime channel issuance, thread-message fetches, trainer thread-list invalidation, attachment broadcasts, or student-thread SQL/RLS/index setup.

Do not overgeneralize:
This implementation does not add a global Supabase private-channel JWT bridge, browser table access, full message payloads in Realtime, hidden polling, or broad unrelated Supabase advisor cleanup.

## 2026-08-02 - trainer-student-thread-realtime-hardening-performance-20260802 - Approved Implementation Plan

Source:
- `docs/tasks/trainer-student-thread-realtime-hardening-performance-20260802-task-plan.md`

Fact:
Trainer/student thread realtime hardening should proceed serially through baseline safety checks, scoped SQL/RLS/index deployment, removal of request-time thread DDL, server-issued scoped realtime channels, lightweight message and summary APIs, attachment broadcast ordering cleanup, client incremental realtime fetches, verification, and implementation review.

Applies when:
Coordinating or reviewing changes to student-thread RLS/grants/indexes, `classroomStudentThreadsSchema.ts`, student-thread controller/routes, `ClassroomThreadsTab.js`, or the thread realtime hook.

Do not overgeneralize:
This plan does not approve unrelated Supabase advisor remediation, private-channel auth integration, hidden polling, UI redesign, or legacy problem-thread migration.

## 2026-08-02 - trainer-student-thread-realtime-hardening-performance-20260802 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-student-thread-realtime-hardening-performance-20260802-rsd.md`

Fact:
Trainer/student classroom thread hardening is approved to fix Supabase Realtime security exposure, public-schema RLS exposure, request-time DDL slowness, heavy realtime refetches, missing trainer list realtime, attachment broadcast ordering, and student-thread indexes while preserving the existing student-scoped thread product model.

Applies when:
Changing `ClassroomThreadsTab.js`, `useClassroomThreadRealtime.js`, student-thread APIs, student-thread schema/indexes, Supabase Realtime broadcast channels, private attachment flow, or request-time schema guards used by classroom thread paths.

Do not overgeneralize:
This does not approve UI redesign, legacy problem-thread migration/deletion, direct browser writes to private classroom tables, full private payloads in Realtime, hidden polling, or changes to student submission final-verdict ownership.

## 2026-08-02 - trainer-compact-ui-cleanup-20260802 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-compact-ui-cleanup-20260802-rsd.md`

Fact:
Trainer compact UI cleanup is approved as a UI-only redesign for `/trainer/dashboard`, `/trainer/forms`, and `/trainer/forms/[id]`, focused on reducing visual clutter and improving mini-laptop readability while preserving existing routes, API endpoints, state transitions, authorization behavior, and trainer workflows.

Applies when:
Changing trainer dashboard classroom presentation, trainer form-builder layout, trainer form-detail analytics/explore/JSON presentation, permanent tour launcher treatment, or compact trainer operational UI.

Do not overgeneralize:
This does not approve server/API changes, database changes, auth changes, classroom live internals, new dependencies, route changes, or a global design-system rewrite.

## 2026-08-02 - trainer-compact-ui-cleanup-20260802 - Implemented Entry Points

Source:
- `docs/reviews/trainer-compact-ui-cleanup-20260802-implementation-review.md`

Fact:
Trainer compact UI cleanup is implemented in `TrainerDashboardClient.js`, `TrainerFormsClient.js`, and `TrainerFormDetailClient.js`. Dashboard uses a compact command header, metric strip, static live-session strip, slim classroom operation items, and icon-only tour launcher. Form builder uses tighter setup/type/identity/target panels, compact cell presets, denser field queue rows, and bounded supporting panels. Form detail uses compact title/status/actions, share/metric strip, lighter tabs, and tighter analytics/explore/JSON panels.

Applies when:
Maintaining trainer route presentation, compact trainer dashboard, trainer form-builder layout, trainer form response review, or mini-laptop trainer UI.

Do not overgeneralize:
This implementation did not change server/API routes, auth, database schema, trainer workflows, or classroom live internals.

## 2026-08-01 - trainer-submission-thread-bubbles-20260801 - Implemented Entry Points

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Fact:
Submission-context thread bubbles are implemented through `client/src/components/StudentThreadBubbleDock.js`, bubble-mode props on `client/src/components/ClassroomThreadsTab.js`, pending-submission entry points in `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`, and server-side reference validation in `server/src/controllers/classroomController.ts`. Text and attachment sends may include optional `submissionReference`; the server resolves live/topic pending rows and persists canonical `metadata.submission_reference`.

Applies when:
Maintaining trainer live pending submissions, topic pending submission cards, normal `Threads` open-as-bubble behavior, student-thread message rendering, or student-thread message/attachment APIs.

Do not overgeneralize:
This does not make chat messages update verdicts, trust client-provided reference labels, expose solution code in chat metadata, enable student-to-student chat, or revive legacy `ProblemThread` as the active bubble UI.

## 2026-08-01 - trainer-submission-thread-bubbles-20260801 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-submission-thread-bubbles-20260801-rsd.md`

Fact:
Trainer pending-submission workflows are approved to open the submitted student's existing student-scoped classroom thread as a floating bubble for both live class and topic submissions. Messages and attachments sent from a submission-context bubble must store server-validated submission-reference metadata visible to both trainer and student, while normal `Threads` conversations can also open as bubbles without requiring a submission reference.

Applies when:
Changing classroom pending-submission review actions, student-thread message metadata, floating thread bubbles, `ClassroomThreadsTab.js`, `FloatingThreadDock.js`, or student-thread message/attachment endpoints.

Do not overgeneralize:
This does not revive legacy problem threads, change final verdict ownership, expose cross-student submissions, add hidden polling, loosen attachment validation, or move `Updates` away from first/default notification behavior.

## 2026-07-31 - trainer-student-classroom-threads-realtime-20260731 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-student-classroom-threads-realtime-20260731-rsd.md`

Fact:
Classroom communication is approved to add a dedicated `Threads` tab with one classroom-level trainer-student chat per active student, Supabase Realtime delivery, safe file sharing, and system event bubbles for affected classroom actions. `Updates` remains the first/default tab as a notification/read-state surface, and `Settings` owns update priority ordering and classroom email preferences.

Applies when:
Changing classroom live tabs, Updates notification behavior, student/trainer thread UI, classroom event surfacing, attachment upload/access, Supabase Realtime subscriptions, or priority settings placement.

Do not overgeneralize:
This does not approve hidden polling, student-to-student chat, public file buckets, arbitrary file uploads, automatic judge execution, student-owned final verdicts, route/auth weakening, or destructive deletion of old problem-thread/chat data.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-feature-futureproof-crud-schedule-submission-20260727-rsd.md`

Fact:
Trainer classroom work is approved to futureproof People/Groups member displays, add end-time based duration calculation in session edit while keeping start+duration scheduling and existing DB fields, complete Topics CRUD where safe, and let student live challenge submissions use either a public link or pasted private code with trainer syntax-highlighted review.

Applies when:
Changing `ClassroomLiveClient.js` group cards, session edit dialog, Topics tab operations, live challenge submission dialog, `classroomController.ts` topic endpoints, or `class_problems` proof handling.

Do not overgeneralize:
This does not approve database migrations, code execution, external judge verification, public/private URL checking, dependency additions, route renames, or broad unrelated trainer UI redesign.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Implemented Entry Points

Source:
- `docs/reviews/trainer-feature-futureproof-crud-schedule-submission-20260727-implementation-review.md`

Fact:
`ClassroomLiveClient.js` now bounds group member previews in People/Groups surfaces, derives session edit duration from a displayed end time, provides topic edit/archive/resource edit/delete/problem edit/delete/unassign controls, and lets live Challenge submissions use link or code with language selection. `classroomController.ts`/`classroomRoute.ts` now expose focused topic resource/problem update/delete and topic assignment unassign endpoints, and `updateProblemStatus` accepts code-only proof while preserving pending-approval behavior.

Applies when:
Maintaining trainer group cards, session edit, Topics CRUD, topic assignment management, live challenge proof submission, or trainer proof review.

Do not overgeneralize:
No database schema, dependency, route rename, code execution, external judge verification, or public/private URL checking was added.

## 2026-07-27 - trainer-student-tabs-schedule-time-20260727 - Implemented Entry Points

Source:
- `docs/reviews/trainer-student-tabs-schedule-time-20260727-implementation-review.md`

Fact:
Student classroom navigation in `ClassroomLiveClient.js` now renders `Topics`, `Challenges`, `Live Sessions & IDE`, `Group & Roster`, and `Attendance` in that order, with matching student tour order. Classroom schedule create/edit converts browser `datetime-local` values to ISO before POST, and `classroomController.ts` validates/normalizes scheduled time before writing `classes.scheduled_time`.

Applies when:
Maintaining student classroom tabs, student onboarding tour, class schedule create/edit, attendance session dates, or class history time display.

Do not overgeneralize:
This does not add global timezone preferences, migrate old schedule rows, change trainer tabs, or change attendance/class start/complete behavior.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-pre-enrolled-students-20260727-rsd.md`

Fact:
Trainer People workflows should allow Student ID/email/CSV enrollment to create pre-enrolled roster identities when matching accounts do not exist. Pre-enrolled students must be visible/selectable in trainer-side classroom workflows such as groups, attendance, and problem assignment, while student classroom access must remain blocked until a trusted account link is activated.

Applies when:
Changing classroom People tab enrollment, CSV student import, roster reads, group membership, attendance, problem targets, signup/profile MIST ID linking, or classroom student-access checks.

Do not overgeneralize:
This does not approve public invitation links, email/SMS invites, `.xlsx` import, destructive roster cleanup, or granting student dashboard access from unverified self-entered IDs.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Approved Implementation Plan

Source:
- `docs/tasks/trainer-pre-enrolled-students-20260727-task-plan.md`

Fact:
Implementation should add a shared `classroomPreEnrollment` utility, update classroom enrollment/roster/access/claim APIs, integrate signup/profile/form/IDE access checks, add People tab missing-student modal/status UI, then verify and create implementation review.

Applies when:
Coordinating the pre-enrolled student implementation or reviewing its intended write scope.

Do not overgeneralize:
This plan is not an approval for broader auth redesign, formal migration infrastructure, notification reintroduction, or unrelated classroom UI refreshes.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Implemented Entry Points

Source:
- `docs/reviews/trainer-pre-enrolled-students-20260727-implementation-review.md`

Fact:
Trainer pre-enrollment is implemented through `server/src/utils/classroomPreEnrollment.ts`, classroom enrollment/claim routes in `classroomController.ts`/`classroomRoute.ts`, signup/profile claim detection in `authController.ts` and `userController.ts`, placeholder filtering in `trainerFormController.ts`, active-only IDE membership in `classroomIdeStream.ts`, and People tab modal/status UI in `ClassroomLiveClient.js`. People tab roster shows pre-enrolled/link-pending rows above active students with an info panel explaining trainer-side use and account-link approval.

Applies when:
Maintaining classroom roster setup, pre-enrolled students, link-pending approvals, student access checks, or trainer selection flows.

Do not overgeneralize:
Runtime schema guard is not a general migration framework, and this implementation does not add public invites, email/SMS sending, `.xlsx` support, or auto-access from unverified IDs.

## 2026-07-27 - trainer-live-progress-design-refresh-20260727 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-live-progress-design-refresh-20260727-rsd.md`

Fact:
Trainer Live progress section in `ClassroomLiveClient.js` should be refreshed as a UI-only change: full-width operational table, compact summary metrics, clearer pending submission review CTA, and preserved status/notes/class-completion behavior.

Applies when:
Changing trainer live-class progress table presentation, pending submission display, or classroom live operational UI.

Do not overgeneralize:
This does not approve API/server changes, new polling, route changes, or student Challenge behavior changes.

## 2026-07-27 - trainer-live-progress-design-refresh-20260727 - Implemented Live Progress UI

Source:
- `docs/reviews/trainer-live-progress-design-refresh-20260727-implementation-review.md`

Fact:
Trainer Live progress in `ClassroomLiveClient.js` now renders local summary metrics, a full-width fixed-layout operational table, row-level pending highlighting, and a dedicated `Review` action chip for submitted proof links. Existing status, notes/hints, and class completion handlers remain unchanged.

Applies when:
Maintaining trainer live progress table presentation, pending submission review affordances, or classroom live UI density.

Do not overgeneralize:
This is presentation-only and does not modify student Challenge submission policy or server authorization.

## 2026-07-26 - student-challenge-submission-duration-20260726 - Approved Requirement Scope

Source:
- `docs/rsd/student-challenge-submission-duration-20260726-rsd.md`

Fact:
Student Challenge tab live-class problems should use a submission-link modal that sends student attempts to `pending_approval`; only trainers can finalize live problem statuses as `solved`, `tried`, or `not_solved`. Class/session duration scheduling should accept custom positive minute values rather than preset max-3-hour choices or unrelated product caps.

Applies when:
Changing `ClassroomLiveClient.js` Challenge tab, `class_problems` status APIs, trainer live problem review, or class session duration validation.

Do not overgeneralize:
This does not add external judge verification, new database tables, topic workflow redesign, or hidden polling.

## 2026-07-26 - student-challenge-submission-duration-20260726 - Implemented Entry Points

Source:
- `docs/reviews/student-challenge-submission-duration-20260726-implementation-review.md`

Fact:
Student Challenge tab live-class problems in `ClassroomLiveClient.js` now submit proof links through a modal to `pending_approval`. `updateProblemStatus` in `classroomController.ts` uses `canManageClassroom` for trainer final verdicts and prevents student API payloads from directly setting `solved`, `tried`, or `not_solved`. New-session scheduling uses custom duration minutes; server duration normalization accepts positive integer minutes with only PostgreSQL integer safety.

Applies when:
Maintaining student live Challenge cards, trainer live problem review, `class_problems` proof/status updates, or class session duration scheduling.

Do not overgeneralize:
Topic assignment progress still has its own workflow. This change does not add automatic judge verification or polling.

## 2026-07-26 - classroom-live-stop-polling-20260726 - Classroom Live Polling Removed

Source:
- `docs/reviews/classroom-live-stop-polling-20260726-implementation-review.md`

Fact:
`ClassroomLiveClient.js` no longer polls chat/classroom details or refetches chat, classroom details, topics, and board on browser tab visibility return. IDE activity polling and IDE focus/blur/visibility/heartbeat activity posts were removed from `ClassroomIdePanel.jsx`; WebSocket live IDE monitor remains.

Applies when:
Investigating tab-return request bursts, classroom live rerenders, chat refresh behavior, classroom detail refresh behavior, or IDE activity tracking.

Do not overgeneralize:
Explicit refresh buttons and mutation-triggered fetches remain valid. Non-network timers elsewhere are not covered by this task.

## 2026-07-26 - trainer-bulk-import-feedback-notifications-20260726 - Trainer Bulk Import and Notification Removal Scope

Source:
- `docs/rsd/trainer-bulk-import-feedback-notifications-20260726-rsd.md`

Fact:
Trainer classroom workflows should support local CSV mapping for bulk student enrollment and problem assignment, manual student enrollment by email or `mist_id`, visible processing feedback, and removal of classroom in-app notification fetch/write/broadcast/email side effects while keeping email fields and display.

Applies when:
Changing `ClassroomLiveClient.js`, classroom student/problem assignment APIs, navbar notification UI, or classroom notification server routes/helpers.

Do not overgeneralize:
This does not remove account email fields, auth/password emails, unrelated team collection emails, or non-classroom real-time/polling behavior.

## 2026-07-26 - trainer-bulk-import-feedback-notifications-20260726 - Implemented Entry Points

Source:
- `docs/reviews/trainer-bulk-import-feedback-notifications-20260726-implementation-review.md`

Fact:
Trainer bulk import is implemented in `client/src/app/classroom/live/[id]/ClassroomLiveClient.js` with local CSV parsing/mapping dialogs. Batch APIs are `POST /classroom/:id/add-students` and `POST /classroom/assign-problems/bulk`. Classroom notification bell, client notification route proxies, server notification routes/helpers, and `server/src/utils/realtime.ts` were removed.

Applies when:
Maintaining trainer classroom student enrollment, problem assignment, navbar notification behavior, or classroom notification performance.

Do not overgeneralize:
This implementation does not add `.xlsx` support, does not remove non-classroom emails, and does not add a uniqueness guarantee for existing problem assignments.

## 2026-07-26 - trainer-qa-fixes-20260726 - Trainer QA Fix Scope

Source:
- `docs/rsd/trainer-qa-fixes-20260726-rsd.md`

Fact:
Trainer QA fixes cover classroom roster role pollution, topic resource reader links, trainer form detail analytics/JSON visibility, Group/Groups terminology, validation feedback, board duplicate controls/license CTA, and honest problem preview fallback.

Applies when:
Maintaining trainer classroom People/Groups/Topics/Board/Live tabs, topic resources, trainer form detail analytics, and problem preview display.

Do not overgeneralize:
This does not approve destructive cleanup of existing `classroom_students` rows, schema migrations, public route renames, or tldraw architecture changes.

## 2026-07-25 - student-perceived-difficulty-dashboard-tabs-20260725 - Student Perceived Difficulty & Tabbed Student Dashboard

Source:
- `docs/rsd/student-perceived-difficulty-dashboard-tabs-20260725-rsd.md`

Fact:
Student perceived difficulty flow is supported in `classroom_topic_problem_progress` and `class_problems`. Students can select/rate perceived difficulty when updating problem progress on the Student Dashboard. Team Matrix view (`TeamMatrixClient.js`) displays each student's perceived difficulty under their member column and computes row average difficulty dynamically from student ratings. Student Dashboard (`ClassroomLiveClient.js`) is organized into clean `<Tabs>` navigation (Topics, Live Session & IDE, Challenges, Class History, Team & Roster).

Applies when:
Inspecting or modifying student classroom UI, topic problem progress APIs, or Team Matrix difficulty aggregations.

Do not overgeneralize:
Trainer difficulty assignment defaults remain intact as fallbacks when a student has not rated a problem yet.

## 2026-07-25 - trainer-team-list-matrix-view-20260725 - Trainer Team Matrix View

Source:
- `docs/rsd/trainer-team-list-matrix-view-20260725-rsd.md`

Fact:
In trainer mode, classroom team overview is simplified to a clean list of team cards with high-level stats and a "View Team Matrix" button that navigates to a dedicated page (`/classroom/live/[id]/teams/[teamId]`). The dedicated page renders a Google Sheets spreadsheet matrix view (Judge, Problem ID, Topic, Average Difficulty, and per-member Difficulty & Verdict sub-columns).

Applies when:
Inspecting or editing classroom team displays, trainer analytics, or team problem matrix routing.

Do not overgeneralize:
This changes the classroom live team analytics presentation and adds a team matrix page; core classroom problem data structures remain unchanged.

## 2026-07-25 - Initial RSD Bootstrap

Source:
- `AGENTS.md`

Fact:
The repository has a Next.js client in `client/` and a Bun/Hono server in `server/`.

Applies when:
Planning UI, route-handler, API, trainer, classroom, and verification changes.

Do not overgeneralize:
This index is seeded from package files and initial source inspection. Update it as deeper module ownership becomes known.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Trainer Classroom Navigation

Source:
- `docs/rsd/hide-classrooms-tab-for-trainers-rsd.md`

Fact:
Trainer and admin users should use `Trainer Dashboard` as their classroom management entry point instead of seeing a duplicate top-level `Classrooms` nav item.

Applies when:
Changing role-aware classroom navigation.

Do not overgeneralize:
This is a navigation cleanup only; classroom routes and authorization remain unchanged.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Changed Entry Point

Source:
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

Fact:
`client/src/components/Navbar.js` now hides the `Classrooms` nav item for users who can use `Trainer Dashboard`, while keeping `Classrooms` visible for logged-in student users.

Applies when:
Checking trainer/admin/student top-level navigation behavior.

Do not overgeneralize:
Direct classroom routes remain valid; this only changes navbar and mobile menu visibility.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Trainer AI Writing Scope

Source:
- `docs/rsd/trainer-dashboard-ai-resource-writing-assistant-rsd.md`

Fact:
Trainer/admin classroom creation and classroom resource authoring should support optional browser-side AI draft assistance for names, titles, descriptions, and resource markdown content.

Applies when:
Changing trainer dashboard classroom creation, classroom live resource sharing, AI writing helpers, or resource authoring flows.

Do not overgeneralize:
AI assistance is draft-only and must not replace manual authoring or change trainer/admin authorization.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Markdown Classroom Resources

Source:
- `docs/rsd/trainer-dashboard-ai-resource-writing-assistant-rsd.md`

Fact:
Classroom resources should support markdown body content while keeping existing URL-only resources readable and linked.

Applies when:
Changing `classroom_resources`, resource APIs, or classroom resource rendering.

Do not overgeneralize:
This requirement is scoped to classroom resources, not courses, achievements, trainer forms, or all markdown content across the site.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Planned Write Scope

Source:
- `docs/tasks/trainer-dashboard-ai-resource-writing-assistant-task-plan.md`

Fact:
The approved implementation scope includes client package dependency files, trainer dashboard classroom creation UI, classroom live resource UI, markdown editor/renderer components, classroom resource controller/schema, and implementation review/knowledge-base artifacts.

Applies when:
Reviewing implementation diffs for this task.

Do not overgeneralize:
Unrelated trainer forms, course editors, achievements, and navbar code are outside this task scope.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Implemented Entry Points

Source:
- `docs/reviews/trainer-dashboard-ai-resource-writing-assistant-implementation-review.md`

Fact:
Superseded for AI by `classroom-resource-reader-problem-preview-20260725`: trainer dashboard classroom creation no longer uses `TrainerWritingAssistant`. Classroom live resources still support URL-only, markdown-only, or URL-plus-markdown resources.

Applies when:
Inspecting trainer dashboard classroom creation or classroom live resource authoring/display.

Do not overgeneralize:
Do not reintroduce trainer/classroom AI helper without a future approved RSD. The resource markdown storage fact remains valid.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Trainer Mode UI Scope

Source:
- `docs/rsd/trainer-mode-ui-refresh-20260725-rsd.md`

Fact:
Trainer mode UI refresh work is scoped to `/trainer/dashboard`, `/trainer/forms`, and `/trainer/forms/[id]` client presentation while preserving existing routes, API calls, state transitions, and authorization guards.

Applies when:
Changing trainer dashboard, trainer form builder, or trainer form management presentation.

Do not overgeneralize:
This does not include classroom live pages, public form pages, server APIs, database schema, or navigation policy unless a future RSD explicitly expands scope.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Implemented Trainer UI Surfaces

Source:
- `docs/reviews/trainer-mode-ui-refresh-20260725-implementation-review.md`

Fact:
`TrainerDashboardClient`, `TrainerFormsClient`, and `TrainerFormDetailClient` now use a shared operational visual direction with command headers, metric tiles, semantic status accents, responsive panels, and stable icon controls.

Applies when:
Reviewing or extending trainer dashboard, trainer form builder, or trainer form management UI.

Do not overgeneralize:
Classroom live pages, public form pages, and admin pages were not redesigned by this task.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Approved UI Scope

Source:
- `docs/rsd/swiss-minimal-learning-ui-refresh-20260725-rsd.md`

Fact:
Swiss minimal learning UI refresh work is approved for `/trainer/dashboard`, `/classroom/list`, `/classroom/live/[id]` trainer and student views, and `/my_dashboard`, while preserving existing route paths, endpoint strings, handlers, state transitions, polling, and authorization-bearing guards.

Applies when:
Changing trainer dashboard, classroom entry/live classroom, or student dashboard presentation.

Do not overgeneralize:
This approval does not include server APIs, database schema, route/path changes, trainer form pages, package dependencies, or behavior refactors.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Approved Task Plan

Source:
- `docs/tasks/swiss-minimal-learning-ui-refresh-20260725-task-plan.md`

Fact:
The approved implementation runs serially in the main workspace with tasks for baseline guard, Swiss local UI rules, trainer dashboard/classroom list, live classroom trainer view, live classroom student/resources/chat view, student dashboard, and verification/review.

Applies when:
Coordinating or reviewing this Swiss minimal UI refresh.

Do not overgeneralize:
No parallel worktree, server/API, dependency, route-path, or behavior refactor work is approved by this task plan.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Implemented UI Surfaces

Source:
- `docs/reviews/swiss-minimal-learning-ui-refresh-20260725-implementation-review.md`

Fact:
`TrainerDashboardClient`, `ClassroomListClient`, `ClassroomLiveClient`, and `MyDashboardClient` now use a quieter Swiss-inspired presentation with compact headers, grid alignment, restrained cards, semantic status accents, and reduced placeholder/decorative content.

Applies when:
Reviewing or extending trainer dashboard, classroom list/live classroom, or student dashboard UI.

Do not overgeneralize:
This implementation did not change route files, server APIs, database schema, package dependencies, auth guards, polling behavior, or trainer form pages.

## 2026-07-25 - past-class-detail-visualization-20260725 - Requirement Scope

Source:
- `docs/rsd/past-class-detail-visualization-20260725-rsd.md`

Fact:
Completed classroom sessions should be visible from `/classroom/live/[id]` with in-page past-class detail, using existing class/problem/resource data before adding routes or schema.

Applies when:
Changing classroom live history, completed class display, class-specific resources, or past problem summaries.

Do not overgeneralize:
This does not approve chat archival, report export, route changes, schema migrations, or broader classroom authorization refactors.

## 2026-07-25 - past-class-detail-visualization-20260725 - Implemented History Surface

Source:
- `docs/reviews/past-class-detail-visualization-20260725-implementation-review.md`

Fact:
`ClassroomLiveClient.js` now includes an in-page `Class history` surface that selects completed classes, fetches past problem rows through the existing class problems API, shows solve distribution, and displays class-specific resources.

Applies when:
Reviewing or extending `/classroom/live/[id]` completed-session history and class resource display.

Do not overgeneralize:
No new route, export/report system, class duration model, chat archival, schema migration, or authorization refactor shipped with this task.

## 2026-07-25 - trainer-class-tags-chat-shadcn-refresh-20260725 - Class Tags and Chat Scope

Source:
- `docs/reviews/trainer-class-tags-chat-shadcn-refresh-20260725-implementation-review.md`

Fact:
Trainer problem assignment now uses a global `problem_tag_dictionary` for searchable/createable tags while preserving `class_problems.tags text[]`; classroom chat messages are scoped to `classes.id` through `classroom_messages.class_id`.

Applies when:
Changing trainer problem assignment tags, classroom chat, class history chat, or chat reaction behavior.

Do not overgeneralize:
Existing common chat rows with null `class_id` are preserved but not displayed in class-specific threads unless a future migration/archive requirement approves a mapping.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Auto Requirement Scope

Source:
- `docs/rsd/classroom-resource-reader-problem-preview-20260725-rsd.md`

Fact:
Classroom resource/problem UX work now removes trainer writing AI, adds dedicated classroom resource reader pages, improves long-list handling, and adds problem metadata preview before assignment.

Applies when:
Changing `/classroom/live/[id]` resource authoring/display, resource reader routes, or trainer problem assignment preview behavior.

Do not overgeneralize:
This does not remove unrelated app-wide AI routes or introduce global pagination.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Implemented Resource Reader and Preview

Source:
- `docs/reviews/classroom-resource-reader-problem-preview-20260725-implementation-review.md`

Fact:
`ClassroomLiveClient.js` now links resources to `/classroom/live/[classroomId]/resources/[resourceId]`, and `server/src/controllers/classroomController.ts` now provides resource detail and problem metadata preview endpoints.

Applies when:
Changing classroom resource cards, resource notifications, resource reading, or trainer problem assignment preview.

Do not overgeneralize:
Resource reader pages are classroom-scoped; this does not create a general CMS.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Approved Requirement Scope

Source:
- `docs/rsd/classroom-team-topic-board-chat-20260725-rsd.md`

Fact:
Approved classroom work adds reusable topic units, team-topic/problem assignment, team and member solve-count analytics, ephemeral tldraw board broadcast, and a bottom-right pet chat bubble to `/classroom/live/[id]`.

Applies when:
Changing classroom topics, team assignment, class problem analytics, board broadcast, or classroom chat presentation.

Do not overgeneralize:
This approval does not include permanent board storage, external judge solve scraping, global public topic marketplace, AI generation, or unrelated route replacement.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Approved Implementation Plan

Source:
- `docs/tasks/classroom-team-topic-board-chat-20260725-task-plan.md`

Fact:
Implementation is approved as serial main-workspace work with tasks for dependencies/schema, topic-assignment analytics API, board backend, trainer topic UI, board UI, floating pet chat bubble, and verification/review.

Applies when:
Coordinating or reviewing this classroom topic/team/board/chat implementation.

Do not overgeneralize:
No parallel worktrees are planned because approved write scopes overlap.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Implemented Topic Assignment Board Chat

Source:
- `docs/reviews/classroom-team-topic-board-chat-20260725-implementation-review.md`

Fact:
The implementation adds `classroom_topics`, topic resources/problems, team-topic assignment/progress, derived team solve analytics, ephemeral tldraw board broadcast endpoints, and a floating pet chat bubble in `ClassroomLiveClient.js`.

Applies when:
Maintaining classroom topic APIs, trainer topic tabs, student assigned topic cards, board broadcasts, or chat presentation.

Do not overgeneralize:
Board content remains in memory only, topic problems are separate from live-class `class_problems`, and `/pet.lottie` is expected under `client/public/`.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Implemented Team Dashboard and IDE Monitor

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
Classroom live now includes topic-resource markdown editor reuse, topic assignment display without team names, a trainer Teams dashboard with member focus cards and a spreadsheet-like problem/member matrix, student CodeMirror IDE access, disabled "Run coming soon", and trainer-readable IDE activity/session monitoring.

Applies when:
Maintaining `/classroom/live/[id]` topic resources, team dashboards, IDE activity monitor, or classroom telemetry.

Do not overgeneralize:
The IDE does not execute code, does not prove plagiarism, and uses near-real-time polling rather than WebSockets.

## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Requirement Scope

Source:
- `docs/rsd/trainer-ide-tracking-team-edit-20260725-rsd.md`

Fact:
Trainer IDE monitoring should live in its own `/classroom/live/[id]` trainer tab and should poll only after the trainer selects one enrolled student to track.

Applies when:
Changing classroom live trainer tabs, IDE activity monitor reads, or team analytics.

Do not overgeneralize:
This does not introduce IDE WebSockets, code execution, plagiarism scoring, or broader telemetry retention changes.

## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Implemented IDE Tab and Team Editing

Source:
- `docs/reviews/trainer-ide-tracking-team-edit-20260725-implementation-review.md`

Fact:
`ClassroomLiveClient.js` now has a dedicated trainer `IDE` tab that tracks one selected student through filtered IDE activity reads; Teams and People surfaces can update team members through `/:id/teams/:teamId/members`.

Applies when:
Maintaining trainer live tabs, IDE monitoring, classroom teams, or team membership APIs.

Do not overgeneralize:
The selected IDE monitor still uses bounded HTTP polling, not WebSocket streaming.

## 2026-07-25 - trainer-topics-tab-reorganization-20260725 - Reorganized Trainer Topics Tab

Source:
- `docs/reviews/trainer-topics-tab-reorganization-20260725-implementation-review.md`

Fact:
`ClassroomLiveClient.js` topics tab for trainers has been reorganized into a topic-centric workspace. Inline top form cards were replaced with a Workspace Header (metrics summary, `+ Build Topic`) and contextual Dialog modals (`Create Topic`, `Add Resource`, `Add Problem`, `Assign Team`) accessible directly from Topic Cards.

Applies when:
Maintaining trainer classroom topics presentation, topic resources/problems authoring, or team topic assignment workflows.

Do not overgeneralize:
Underlying database schemas and API controllers for topics remain unchanged; this is a pure presentation and workflow optimization.

## 2026-07-25 - trainer-ide-realtime-solution-verification-20260725 - Realtime IDE Board, Solution Links & Verification

Source:
- `docs/rsd/trainer-ide-realtime-solution-verification-20260725-rsd.md`

Fact:
Classroom IDE now streams student code edits, language changes, and focus states live over WebSockets (`/classroom/:id/ide/ws`). C++ (`@codemirror/lang-cpp`) and Python syntax highlighting are integrated with high-visibility cursor styling and full-screen toggle options. Problem progress schemas support `solution_link`, `solution_code`, and `submission_notes`, with student solve attempts requiring trainer approval (`pending_approval` status) before marking as `solved`.

Applies when:
Inspecting or updating classroom IDE components, live student tracking, problem progress submissions, solution link attachments, or trainer verification APIs.

Do not overgeneralize:
Direct solve override remains accessible to trainers, but student-initiated solve updates now route through pending approval.

## 2026-07-25 - form-toggle-session-attendance-group-rename-20260725 - Form Toggle, Attendance, Session Type/Duration & Group Rename

Source:
- `docs/rsd/form-toggle-session-attendance-group-rename-20260725-rsd.md`

Fact:
- **Form Toggle**: `trainer_forms.accepting_responses` (boolean DEFAULT true) controls public form submissions. Server enforces 403 when closed; trainer UI has a live toggle; public form shows a "Submissions Closed" banner.
- **Session Attendance**: `class_attendance` table (status: present/absent/late/very_late/excused, UNIQUE per class+student). Trainer opens a per-session Attendance Dialog from the session card; attendance is recorded under trainer identity automatically.
- **Session Type & Duration**: `classes.session_type` (DEFAULT 'onsite'), `classes.duration_minutes` (DEFAULT 90), `classes.overflow_minutes`. Schedule form has Session Type and Duration selects. Session cards show type badge, duration badge, and animated live overflow badge (`+Xm Overflow`) when time runs over; `overflow_minutes` is persisted on session complete.
- **Group Terminology**: All user-facing labels use "Group"/"Groups". DB tables (`classroom_teams`) and API routes remain unchanged. Modified: ClassroomLiveClient.js, TeamMatrixClient.js.
- **IDE Beta Mode**: Classroom IDE tab is hidden behind `/* TODO: Classroom IDE Feature (Beta Mode) */` comments.

Applies when:
Inspecting or changing form response control, session scheduling, session type/duration/overflow display, per-session attendance recording, or team/group labeling in ClassroomLiveClient.js.

Do not overgeneralize:
DB table `classroom_teams` and routes `/create-team`, `/teams/:teamId/members` are intentionally not renamed — only UI labels changed.

## 2026-07-25 - driverjs-adhd-onboarding-tours-20260725 - Driver.js ADHD Onboarding Tours

Source:
- `docs/rsd/driverjs-adhd-onboarding-tours-20260725-rsd.md`

Fact:
- **Driver.js Tours**: Interactive, ADHD-friendly onboarding tours added to `TrainerDashboardClient.js` (7 steps) and `ClassroomLiveClient.js` (8 trainer steps, 6 student steps).
- **Auto & Manual Invocation**: Automatically launches on first visit using `localStorage` keys (`mcc_trainer_dashboard_toured`, `mcc_trainer_classroom_toured`, `mcc_student_classroom_toured`). A persistent, floating "Take Tour" button on each page allows users to re-launch the tour manually anytime.
- **ADHD Design Principles**: Bite-sized steps, explicit progress indicator (`Step X of Y`), high contrast title emoji anchors, smooth scrolling, and backdrop-click dismissability (`skipMissingElement: true`).
- **Reusable Hook**: Custom `useTour` hook (`client/src/hooks/useTour.js`) handles initialization, localStorage persistence, and teardown.

Applies when:
Modifying trainer dashboard UI, classroom live layout, onboarding tours, or product walk-throughs.

Do not overgeneralize:
Tours use client-side `localStorage` and DOM target IDs; core classroom APIs, route handlers, and database schemas remain untouched.

## 2026-07-25 - trainer-feature-scalability-futureproofing-20260725 - Trainer Scalability Audit & Future-Proofing

Source:
- `docs/rsd/trainer-feature-scalability-futureproofing-20260725-rsd.md`

Fact:
Comprehensive review of Trainer & Classroom features identifies key scale bottlenecks under high data volume: unindexed text queries in user matching, unbounded form responses / classroom problem JSON payloads, lack of list virtualization in Team Matrix / Form detail, aggressive multi-interval client polling, and synchronous competitive programming scraping. Proposed solutions include B-Tree / expression indexing, paginated endpoints, windowed rendering, visibility-aware polling, and size limits.

Applies when:
Refactoring trainer dashboard, form responses/analytics, classroom live room performance, team matrix rendering, or database indexing.

Do not overgeneralize:
This audit highlights scalability risks across trainer and live classroom modules; implementation requires user review and task plan approval before applying code changes.

## 2026-07-28 - trainer-updates-problem-threads-20260728 - Approved Requirement Scope

Source:
- `docs/rsd/trainer-updates-problem-threads-20260728-rsd.md`

Fact:
Trainer and student classroom UI should replace the generic classroom messaging option with per-problem threads for both live class problems and topic problems. Threads support questions, visualized existing-system solution submissions, trainer feedback/status events, and reactions. `Updates` is the first/default tab for both roles and uses a fixed, priority-sorted update list. Trainer update types include `time_exceeded`, `student_solution_submitted`, `student_needs_review`, `problem_progress_changed`, and `thread_reply`. Student update types include `new_problem`, `teacher_feedback`, `thread_reply`, `solution_status_changed`, and `topic_or_resource_updated`. Classroom update email is toggleable from settings and must stay separate from auth or non-classroom emails. The 2026-07-29 amendment adds per-user `Mark as read`, `Mark all as read`, and explicit thread access through problem cards/lists and authenticated problem-surface deep links. The 2026-07-31 correction keeps Updates notification/read-state only, with no thread launch action.

Applies when:
Changing classroom problem details, classroom chat surfaces, Updates tab, email triggers, or problem thread routes.

Do not overgeneralize:
This does not approve polling, global notification bells, visibility refetches, destructive chat table drops, or time-exceeded email without a deduplicated event decision. The "time exceeded" update is derived on load or explicit refresh.

## 2026-07-29 - trainer-updates-problem-threads-20260728 - Implementation Entry Points

Source:
- `docs/reviews/trainer-updates-problem-threads-20260728-implementation-review.md`

Fact:
Implemented classroom Updates and problem threads across `server/src/controllers/classroomController.ts`, `server/src/routes/classroomRoute.ts`, `server/src/controllers/userController.ts`, `server/src/routes/userRoute.ts`, `server/src/utils/classroomUpdatesSchema.ts`, `client/src/components/UpdatesTab.js`, `client/src/components/ProblemThread.js`, `client/src/components/PrioritySettings.js`, and `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`.

Applies when:
Changing classroom Updates, problem-card thread access, topic problem assignment threads, read receipts, or classroom update email settings.

Do not overgeneralize:
Thread APIs are authenticated classroom APIs, not public links. Updates still load only on first tab mount, refresh, or read actions, and Updates must not open thread dialogs.

## 2026-07-31 - trainer-student-classroom-threads-realtime-20260731 - Student Threads Entry Points

Source:
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`
- `docs/adr/0008-classroom-student-thread-realtime-model.md`

Fact:
Classroom visible conversation is now student-scoped in the `Threads` tab. Server entry points are `GET /classroom/:id/student-threads`, `GET /classroom/:id/student-threads/:studentId`, `POST /classroom/:id/student-threads/:studentId/messages`, `POST /classroom/:id/student-threads/:studentId/attachments`, and `GET /classroom/:id/student-threads/:studentId/attachments/:attachmentId`. Runtime schema/storage/realtime helpers live in `server/src/utils/classroomStudentThreadsSchema.ts`. Client entry points are `client/src/components/ClassroomThreadsTab.js`, `client/src/hooks/useClassroomThreadRealtime.js`, `client/src/lib/action.js#post_form_with_token`, and tab wiring in `ClassroomLiveClient.js`.

Applies when:
Changing classroom communication, student-thread chat, system event bubbles, safe classroom attachments, or Supabase Realtime invalidation.

Do not overgeneralize:
Legacy problem-thread routes and tables still exist for compatibility, but active classroom UI should guide users to `Threads`.

## 2026-08-02 - trainer-student-thread-instant-realtime-20260802 - Private Gap-Free Realtime Entry Points

Source:
- `docs/reviews/trainer-student-thread-instant-realtime-20260802-implementation-review.md`
- `docs/adr/0011-private-gap-free-classroom-thread-realtime.md`

Fact:
Student Threads now use private identity-bound Supabase Broadcast with canonical committed payloads and durable revision catch-up. New server entry points are `POST /classroom/:id/student-threads/realtime` for credential renewal and `GET /classroom/:id/student-threads/:studentId/messages?afterRevision=` for gap recovery. Realtime Auth bridging is in `server/src/utils/classroomStudentThreadRealtimeAuth.ts`; subscription/renewal is in `client/src/hooks/useClassroomThreadRealtime.js`. Migration `trainer_student_thread_instant_realtime_20260802` (version `20260802081644`) is applied.

Applies when:
Changing student-thread delivery, Realtime authorization, message ordering, reconnect behavior, optimistic reconciliation, or thread membership provisioning.

Do not overgeneralize:
The canonical Broadcast is a fast delivery path, not the durable source of truth. PostgreSQL messages/revisions and authorized catch-up remain authoritative.

## 2026-08-29 - contest-report-scoring-merge-v1 - Contest Scoring Entry Points

Source:
- `docs/sql/contest-report-scoring-v1-20260828.sql`
- `server/src/services/contestFormula.ts`
- `server/src/services/contestScoringService.ts`

Fact:
Global/admin contest rooms and classroom/trainer contest rooms now share a server-owned scoring engine. Formula parsing/evaluation lives in `server/src/services/contestFormula.ts`; result-unit merge, formula variables, drop-worst, sort ladder, competition ranking, and `ResultSnapshotV2` generation live in `server/src/services/contestScoringService.ts`. Classroom routes are `GET/POST preview/PUT /classroom/:id/contests/rooms/:roomId/scoring` plus report generation under `classroomContestController.ts`. Global/admin routes are `GET/POST preview/PUT /contest-room/:roomId/scoring`, `POST /contest-room/:roomId/report`, and `POST /contest-room/:roomId/publish`.

Applies when:
Changing contest report generation, public report publication, classroom contest reports, composite result units, formula keys, report rendering, or team-collection score consumption.

Do not overgeneralize:
The scoring engine owns contest ranking snapshots only. It does not replace contest fetch credentials, classroom roster mapping, demerit entry, manual solve overrides, or team-collection approval workflows.

## 2026-08-29 - contest-report-composite-formulas-v1 - Composite Formula Entry Points

Source:
- `docs/sql/contest-report-composite-formulas-v1-20260829.sql`
- `server/src/services/contestScoringService.ts`
- `client/src/components/ContestMergeOverview.jsx`

Fact:
Composite contest merge groups store solved-score and penalty-score formulas in `contest_report_merge_groups` and `classroom_contest_merge_groups`, with `formula` retained as the solved-score compatibility alias. Defaults of `sum(raw_score)` and `sum(penalty)` preserve summed composite behavior. The scoring engine evaluates both against member contest rows before the room-level formulas evaluate final result-unit rows. The saved merge layout is shown outside the editor through `ContestMergeOverview` on the global/admin room details page and the classroom trainer contest workbench.

Applies when:
Changing composite merge-group storage, formula variables, scoring previews, generated contest reports, global room details, or classroom contest workbench merge visibility.

Do not overgeneralize:
The overview component is read-only display. It must not evaluate formulas, mutate scoring configs, or replace the scoring dialog's manager-controlled preview/save flow.

## 2026-08-29 - contest-report-sheet-formulas-v1 - Sheet Formula Entry Points

Source:
- `server/src/services/contestFormula.ts`
- `server/src/services/contestScoringService.ts`
- `client/src/components/ContestScoringDialog.jsx`
- `client/src/components/ContestFormulaExplainer.jsx`
- `docs/sql/contest-report-sheet-formulas-v1-20260829.sql`

Fact:
Contest scoring formulas now use row metrics and filters. Examples are `sum(raw_score)`, `sum(solved)`, `demerits(0)`, `sum(demerits where index == 0)`, and `sum(raw_score where title contains "TFC")`. The same syntax is used for composite formulas and final room formulas, with the active row set scoped to member contests for composites and final result units for room scoring. Formula editor snippets, metric chips, filter-field chips, and the demerits flow explainer live in `ContestScoringDialog.jsx` and `ContestFormulaExplainer.jsx`.

Applies when:
Maintaining formula parsing, scoring defaults, formula editor UX, composite formulas, report generation, scoring preview traces, or SQL defaults for scoring configs.

Do not overgeneralize:
TSC scalar variables remain valid for cross-room score composition. Do not expose generated per-contest variables as the primary formula model.

## 2026-08-29 - contest-report-score-pair-v2 - Score Pair Entry Points

Source:
- `docs/sql/contest-report-score-pair-v2-20260829.sql`
- `server/src/services/contestScoringService.ts`
- `server/src/controllers/contestRoomController.ts`
- `server/src/controllers/classroomContestController.ts`
- `client/src/components/ContestScoringDialog.jsx`
- `client/src/components/ReportTable.js`
- `client/src/components/LiveReportTable.js`

Fact:
Contest scoring configs and merge groups now persist `solved_score_formula` and `penalty_score_formula`. The shared scoring service emits `solvedScore`, `penaltyScore`, display variants, trace formulas, and compatibility aliases. Manager configuration and preview live in `ContestScoringDialog`; private/global and live/public report renderers show and export the pair explicitly.

Applies when:
Maintaining contest scoring APIs, database migrations, rank sorting, report snapshots, manager previews, public rule explanations, or exports.

Do not overgeneralize:
Supabase migration `20260829171842` (`contest_report_score_pair_v2_20260829`) was applied and verified on 2026-08-29. Keep the migration in deployment history before deploying controllers that write the new columns to any other environment.
# 2026-09-01 - admin-student-profile-readiness-20260901 - Approved Scope and Plan

Source:
- `docs/rsd/admin-student-profile-readiness-20260901-rsd.md`
- `docs/decisions/admin-student-profile-readiness-20260901-technical-decisions.md`
- `docs/tasks/admin-student-profile-readiness-20260901-task-plan.md`

Fact:
The approved admin tool adds protected student profile readiness analytics and filtered CSV export, defaulting to CSE batches 22–26. It uses a server-authoritative users query, a server-side bearer-token proxy, URL-backed range/status filters, accessible batch and missing-field graphs, and installed Motion with reduced-motion behavior. No schema change is approved.

Applies when:
Implementing or reviewing the admin student-profile readiness page, query, navigation, graph, filters, or CSV export.

Do not overgeneralize:
The plan does not approve profile mutation, public access, broad admin redesign, email/phone export, or Supabase schema/policy changes.
# 2026-09-01 - admin-student-profile-readiness-20260901 - Implemented Entry Points

Source:
- `docs/reviews/admin-student-profile-readiness-20260901-implementation-review.md`
- `docs/decisions/admin-student-profile-readiness-20260901-technical-decisions.md`

Fact:
Admin student profile readiness is implemented at `client/src/app/admin/student-profiles/` with an authenticated proxy at `client/src/app/api/classroom/admin/student-profile-readiness/route.js`. Server authority is `getStudentProfileReadiness` in `server/src/controllers/classroomController.ts`, registered as `GET /classroom/admin/student-profile-readiness`. The page defaults to batches 22–26, visualizes ready versus incomplete profiles and missing fields, previews status/search matches, and safely exports the current view.

Applies when:
Maintaining student-profile completeness analytics, the admin CSV export, its batch rules, or its Motion-based readiness visualization.

Do not overgeneralize:
This implementation does not edit profiles, verify handles, export contact details, expose a public endpoint, persist files, or change the database schema.
