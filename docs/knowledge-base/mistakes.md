## 2026-09-04 - Session Retry Guidance Could Not Resolve an EDU Server Challenge

What happened:
The EDU crawler returned `CODEFORCES_WEB_BLOCKED` with guidance to wait and reconnect the Codeforces session. Safe probes showed that the lesson standings route was presenting a Cloudflare browser challenge to the server network, so a fresh JSESSIONID alone could not make that request browser-capable. The official contest API also cannot address an EDU course/lesson source.

Detection:
The failing item was confirmed as `edu:2:6`; the exact standings and lesson routes returned challenge responses while an EDU index route remained reachable.

Prevention:
Distinguish provider authentication failure from network/browser challenge failure. Keep credentials transient, avoid repeated credential replay, and give EDU managers the bounded browser-saved HTML import path when the server receives `CODEFORCES_WEB_BLOCKED`.

## 2026-09-04 - Pre-Snapshot Filtering Blocked Handle Mapping

Source:
- `server/src/services/codeforcesContestService.ts`
- `client/src/components/ClassroomContestPanel.jsx`

What happened:
Numeric Codeforces API standings were filtered to verified/overridden classroom handles before persistence. When the configured handle had not participated, fetch failed with `CODEFORCES_API_NO_CLASSROOM_HANDLES`, so the trainer could not save a snapshot or use the existing unmatched-row mapping UI to connect the actual participant handle.

Detection:
A redacted signed comparison showed valid access and 23 official plus 15 practice rows, while the one active verified classroom handle appeared in neither set. Code review then exposed the circular dependency between pre-snapshot filtering and snapshot-backed handle discovery.

Prevention:
Retain bounded official numeric API rows through snapshot mapping, record match counts as metadata, and enforce classroom membership when generating reports. Keep focused regression coverage for zero-match anonymous and signed API responses.

## 2026-09-04 - Web Fallback Masked the Signed Codeforces Failure

Source:
- `server/src/services/codeforcesContestService.ts`
- `docs/reviews/classroom-codeforces-signed-failure-diagnostics-20260904-implementation-review.md`

What happened:
After a signed private-Gym API request failed, a later 403/503 HTML fallback replaced the provider's API failure comment with `CODEFORCES_WEB_BLOCKED`. Disabling upsolves did not help because the failure occurred while loading standings, not submissions.

Detection:
The second hosted retry used the newly deployed web-error wording while live state showed upsolves disabled, credentials successfully loaded, and no snapshot written. Provider/server clocks differed by only about one second.

Prevention:
When an authenticated preferred transport and a later fallback both fail, preserve the safe preferred-transport error and add only the fallback code. Redact any echoed key/signature and test both credential-present and credential-missing behavior.

## 2026-09-04 - API Standings Downgraded to Blockable HTML for Upsolves

Source:
- `server/src/services/codeforcesContestService.ts`
- `docs/reviews/classroom-codeforces-api-upsolves-20260904-implementation-review.md`

What happened:
Numeric standings could succeed through the official anonymous or signed API, but enabling upsolves always fetched per-handle HTML submission histories. A Codeforces 403/503 on that later crawl discarded the usable API result and returned the misleading `CODEFORCES_WEB_BLOCKED` standings message.

Detection:
Read-only inspection of the failing item showed private Gym `708543` with `include_upsolves = true`; tracing the service showed every API success entering `fetchCodeforcesWebUpsolveSubmissions`.

Prevention:
Keep dependent provider requests on the successful transport when the provider offers the needed API. API standings use bounded `contest.status` for upsolves; only HTML standings use HTML submission histories. Cover transport continuity explicitly for anonymous and signed paths.

## 2026-09-04 - Environment Secret Inspection Recurrence

Source:
- Local diagnostic command during the classroom Codeforces API-upsolve investigation.

What happened:
A broad repository search included `.env` files and printed full Supabase connection/service credential lines into the internal execution log while only variable presence was needed.

Detection:
Immediate review of the tool output showed full values rather than presence booleans.

Prevention:
Never include `.env*` in content searches. Check an allowlisted variable name through a presence-only script that outputs only `set`/`missing`, and treat any non-trusted logged value as requiring rotation.

## 2026-08-09 - Classroom Contest Migration RLS Near Miss

Source:
- `docs/sql/trainer-classroom-contests-20260809.sql`

What happened:
The first classroom contest SQL artifact created six new `public.classroom_contest_*` tables without explicit `enable row level security` statements. The feature still used server-side Hono authorization, but Supabase public-schema tables should have RLS enabled as defense in depth.

Detection:
Post-SQL Supabase checklist review caught the missing RLS block before final handoff. A live DB verification query then confirmed all six tables had `relrowsecurity = true`.

Prevention:
For every new table in the `public` schema, add explicit RLS enable statements in the same SQL artifact before commit, and run a read-only `pg_class.relrowsecurity` verification after applying the migration.

## 2026-08-09 - Discord Guild Picker Was Not Mutation Authorization

Source:
- `docs/reviews/trainer-shared-discord-guild-classrooms-20260809-implementation-review.md`
- `server/src/controllers/discordController.ts`
- `server/src/controllers/classroomController.ts`

What happened:
The classroom wizard fetched only Discord guilds where the trainer had Manage Server permission, but the create endpoint accepted the posted guild snowflake and label without rechecking that permission. The original unique-guild constraint limited reuse, but enabling an already-installed shared guild would make a crafted request materially dangerous.

Detection:
Security review traced the creation request from the client select through `createClassroom` and found no server-side call to the trainer's current Discord guild list before inserting the binding.

Prevention:
Treat external-resource pickers as discovery UI, not authorization. At mutation time, normalize the immutable external ID, refresh/read current external permissions server-side, reject unauthorized IDs, and persist trusted provider metadata rather than client labels.

## 2026-08-09 - Discord OAuth Callback Reason Hidden

Source:
- `client/src/components/DiscordConnectionRequiredCard.jsx`
- `server/src/controllers/discordController.ts`

What happened:
The student classroom gate showed the same "Connect Discord" card after Discord OAuth failed or was rejected, so a valid duplicate-account rejection such as `account_in_use` looked like the connect button had done nothing. Recent OAuth state rows remained unconsumed, but the UI did not surface the callback `reason` query parameter.

Detection:
Database inspection showed multiple recent unconsumed student `discord_oauth_states` rows and no active student `discord_user_connections` row, while an existing trainer account already had a Discord OAuth connection.

Prevention:
OAuth recovery screens must read and display safe callback result parameters, especially `account_in_use`, `state`, `access_denied`, and `callback_failed`. Server callbacks should redirect failures back to the original `return_to` when the state row is valid, and callback catch blocks may log only safe error codes, not tokens or message bodies.

## 2026-08-02 - trainer-classroom-discord-integration-20260802 - Secret Inspection Repeat

Source:
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`

What happened:
During Discord integration setup verification, an environment-file search printed local secret values into tool output even though the useful check was only whether Discord/Supabase variables existed.

Detection:
Manual review of command output showed that broad env-value searches remain unsafe for this workspace.

Prevention:
For env checks, print only variable names and presence booleans, never full lines or values. Use a small allowlisted presence-only command or inspect config code instead of searching `.env` contents. If env values are copied outside the local tool context, committed, or pasted into external logs/chat, rotate the affected keys.

## 2026-08-02 - trainer-student-thread-realtime-hardening-performance-20260802 - Secret Handling Near Miss

Source:
- `docs/reviews/trainer-student-thread-realtime-hardening-performance-20260802-implementation-review.md`

What happened:
During environment inspection, a broad env search can expose Supabase service or database credentials in command output even when the intent is only to confirm variable presence.

Detection:
Realtime/Supabase setup work required checking env wiring, and the review identified that future checks must avoid printing env values.

Prevention:
When checking secrets, use presence-only commands that print variable names or booleans, never values. If env values are shared outside the local machine, committed, uploaded, or pasted into chat/logs, rotate affected Supabase service and database keys.

## 2026-08-02 - trainer-student-thread-realtime-hardening-performance-20260802 - Server Import Near Miss

Source:
- `docs/reviews/trainer-student-thread-realtime-hardening-performance-20260802-implementation-review.md`

What happened:
The attachment refactor wrote `CLASSROOM_STUDENT_THREAD_ATTACHMENT_BUCKET` into attachment metadata but initially missed the controller import.

Detection:
A temporary server TypeScript check was noisy because of existing repo tooling issues, but it still caught the missing symbol before handoff.

Prevention:
After moving constants into shared Supabase/schema utilities, run at least one server static check or focused symbol search around the changed imports, even when the full type suite is blocked by unrelated issues.

## 2026-08-01 - trainer-submission-thread-bubbles-20260801 - Design Review Fix

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

What happened:
The initial student-thread panel rendered latest event cards inline in a horizontal strip and relied on flexible panel height, which made the chat feel crowded and risked whole-page growth on high-volume threads.

Detection:
User screenshot review showed the event strip taking over the top of the chat panel and called out future high-message-volume risk.

Prevention:
Keep thread event history behind a compact modal trigger and give thread panels, bubble panels, message histories, and composers explicit bounded dimensions.

## 2026-08-01 - trainer-submission-thread-bubbles-20260801 - Follow-up Design and Scale Fix

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

What happened:
The first review fix bounded the visible chat surface, but the UI still showed pulsing pending badges, item counts, a visible realtime tag, and eager full-history loading paths for messages/events/updates.

Detection:
User screenshot review called out the flashing pending notification, count clutter, realtime tag, and future high-volume history risk.

Prevention:
For trainer communication surfaces, combine calm static controls with bounded API pages and explicit older/load-more actions before calling the design pass complete.

## 2026-08-01 - trainer-submission-thread-bubbles-20260801 - Near Miss

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

What happened:
The first implementation pass reset the thread composer when the selected student changed, but not when a trainer switched between two pending submission-context bubbles for the same student.

Detection:
Manual source review after lint/build caught that a draft could carry into a different referenced submission context.

Prevention:
When a composer is scoped by optional context metadata, include a stable context key in reset dependencies so drafts do not silently move between contexts.

## 2026-07-26 - trainer-logout-option - Hydration Error: Nested HTML Forms

Source:
- `docs/reviews/trainer-logout-option-20260726-review.md`

What happened:
Placing a `<form action={logoutAction}>` inside a client component page wrapped by an outer `<form onSubmit={handleSave}>` caused HTML nesting invalidation (`<form>` inside `<form>`) and a Next.js hydration error.

Detection:
Console runtime error: `In HTML, <form> cannot be a descendant of <form>. This will cause a hydration error.`

Prevention:
When adding secondary actions (e.g. Logout) inside a component already wrapped by an outer form, use `<Button type="button" onClick={handleLogout}>` with `useTransition` to trigger server actions without creating nested `<form>` elements.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Near Miss

Source:
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

What happened:
Full client lint failed because of unrelated existing errors outside this task's write scope.

Detection:
`npm run lint` reported `react/no-unescaped-entities` errors in `client/src/app/admin/contests/combined/aliases/AliasesManagerClient.tsx`.

Prevention:
For narrow UI changes, run full lint when possible, then run targeted lint on changed files and clearly record unrelated blockers.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Near Miss

Source:
- `docs/reviews/trainer-dashboard-ai-resource-writing-assistant-implementation-review.md`

What happened:
The first draft of `TrainerWritingAssistant` checked WebGPU support during render with `useMemo`, which could produce different server and browser markup in Next.js.

Detection:
Implementation review caught the hydration mismatch risk before final handoff.

Prevention:
Browser capability status now initializes after mount with `useEffect`, and event handlers re-check support before generation.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Near Miss

Source:
- `docs/reviews/trainer-mode-ui-refresh-20260725-implementation-review.md`

What happened:
The current user requested full autonomous mode while repository `AGENTS.md` normally requires human approval gates, creating a process-policy conflict.

Detection:
RSD setup compared the current user mode request with `AGENTS.md` and the orchestrator delivery-mode rules.

Prevention:
Record the selected Auto mode, skipped gates, and narrow waiver in every artifact; keep the waiver limited to reversible UI-only work and avoid destructive, external, route, API, schema, or authorization changes.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Tooling Near Miss

Source:
- `docs/reviews/trainer-mode-ui-refresh-20260725-implementation-review.md`

What happened:
A broad `rg` command hit existing `server/NUL` and returned `Incorrect function`.

Detection:
The search output included `rg: ./server\NUL: Incorrect function. (os error 1)`.

Prevention:
Use scoped file paths for searches in this workspace when possible, or exclude `server/NUL` during broad scans.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Near Miss

Source:
- `docs/reviews/swiss-minimal-learning-ui-refresh-20260725-implementation-review.md`

What happened:
The full client lint suite still failed on an unrelated `react/no-unescaped-entities` error in `client/src/app/admin/contests/combined/aliases/AliasesManagerClient.tsx`, while the changed files only had a nonblocking existing hook warning in `ClassroomLiveClient.js`.

Detection:
`npm run lint` reported the unrelated errors; targeted ESLint on the changed UI files exited successfully with one warning.

Prevention:
For broad UI-only tasks in this repo, always run targeted lint for changed files, record full-suite blockers separately, and avoid "fixing" behavior warnings in live polling code without an approved behavior task.

## 2026-07-25 - past-class-detail-visualization-20260725 - Near Miss

Source:
- `docs/reviews/past-class-detail-visualization-20260725-implementation-review.md`

What happened:
Completed class resources already existed in the data model through `classroom_resources.class_id`, but `getClassroomDetails` filtered them out with `class_id IS NULL`, making past class materials invisible in the main classroom page.

Detection:
RSD source inspection compared `addResource` sending `classId: activeClass?.id || null` with the classroom detail resource query.

Prevention:
When adding class-scoped resource features, verify both the write path and the read path include the same scope, then explicitly filter display sections by `class_id`.

## 2026-07-25 - trainer-class-tags-chat-shadcn-refresh-20260725 - Near Miss

Source:
- `docs/reviews/trainer-class-tags-chat-shadcn-refresh-20260725-implementation-review.md`

What happened:
`bun --check` was not a reliable server verification command in this workspace: `tsc` was blocked by `moduleResolution=node10`, and one `bun --check` route attempt tried to start a server on port 5000.

Detection:
Verification reported `TS5108` for `moduleResolution=node10` and `EADDRINUSE` for port 5000.

Prevention:
Use `bun build src/index.ts --target=bun --outdir .codex-build` as the server parse/bundle smoke check until the server TypeScript config is modernized.
## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Mistake or Near Miss

Source:
- `docs/reviews/classroom-resource-reader-problem-preview-20260725-implementation-review.md`

What happened:
The prior AI writing assistant artifacts and knowledge-base entries became stale after the user said the AI feature was no longer needed.

Detection:
Searches for `TrainerWritingAssistant`, `trainer-writing-ai`, and `@huggingface` showed old docs and KB still referenced the removed AI path.

Prevention:
When a task reverses a recent feature decision, mark old ADR/KB entries superseded instead of only adding new docs.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Layout and Metadata Regression

Source:
- `docs/reviews/classroom-resource-reader-problem-preview-20260725-implementation-review.md`

What happened:
Class-history detail tables could overflow into the sticky chat column, and Codeforces preview fallback title cleanup produced `odeforces Problem`.

Detection:
User screenshots showed the chat sidebar over class-history content and a bad Codeforces preview title.

Prevention:
Use `minmax(0,1fr)`, `min-w-0`, and local scroll containers for dashboard grids with sticky sidebars; never use broad leading-capital regex cleanup on problem titles.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Assign Form Overflow

Source:
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`

What happened:
The problem assignment form still overflowed into the chat column because grid children and paired action buttons kept min-content width.

Detection:
User screenshot showed `Preview` and `Assign problem` crossing into the chat sidebar.

Prevention:
For classroom dashboard forms beside sticky sidebars, use `min-w-0` on grid children, `minmax(0,...)` grid tracks, and short/truncated action labels inside narrow tracks.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Monitoring Evidence Near Miss

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

What happened:
The requirement asked to log copied code, but browsers can reliably log paste events and large inserts, not prove where code originated or whether misconduct occurred.

Detection:
RSD Grill Mode and security/HCI review identified the privacy and evidence wording risk before final response.

Prevention:
Future IDE monitor changes must label paste and large-insert events as activity signals, keep monitoring visible to students, and avoid automatic cheating verdict copy unless a future approved RSD defines evidence policy.
## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Near Miss

Source:
- `docs/reviews/trainer-ide-tracking-team-edit-20260725-implementation-review.md`

What happened:
The first IDE monitor shape mixed all-student IDE activity into Teams and used short-interval whole-class polling.

Detection:
User reported the logic was broken and too server-heavy.

Prevention:
For live trainer telemetry, require explicit target selection before short-interval polling and keep unrelated dashboard tabs decoupled.

## 2026-07-26 - trainer-qa-fixes-20260726 - Role Pollution Near Miss

Source:
- `docs/reviews/trainer-qa-fixes-20260726-implementation-review.md`

What happened:
Trainer/admin accounts could be inserted into `classroom_students`, which made them appear in student-only People, Groups, Attendance, Assign Problem, and IDE-monitor workflows.

Detection:
Trainer QA with `temp@mcc.trainer.com` showed the trainer account appearing as an enrolled student and valid assignment target.

Prevention:
Treat classroom student membership as a role-clean domain relation: reject trainer/admin users on writes and filter existing polluted rows from every student-only read path.

## 2026-07-28 - trainer-updates-problem-threads-20260728 - Destructive DDL in Unrelated Schema Guard Near Miss

Source:
- `docs/rsd/trainer-updates-problem-threads-20260728-rsd.md`
- `server/src/utils/classroomPreEnrollment.ts`

What happened:
Preview-generated work placed `DROP TABLE IF EXISTS public.classroom_message_reactions CASCADE` and `DROP TABLE IF EXISTS public.classroom_messages CASCADE` inside `ensurePreEnrollmentSchema()`, an unrelated runtime schema helper.

## 2026-07-29 - trainer-updates-problem-threads-20260728 - Eager Thread Mount Near Miss

Source:
- `docs/reviews/trainer-updates-problem-threads-20260728-implementation-review.md`

What happened:
Preview UI mounted `ProblemThread` directly inside repeated topic and challenge problem cards, which would fetch thread data for many cards during normal classroom load.

Prevention:
Mount thread UI lazily in dialogs from explicit Thread buttons on problem cards/lists, and keep Updates notification/read-state only.

Detection:
The RSD approval pass checked dirty workspace diffs before technical decisions and found destructive classroom chat cleanup tied to pre-enrollment schema setup.

Prevention:
Never place destructive table drops inside unrelated runtime schema guards. Removing UI/routes is not the same as deleting stored data. Physical cleanup needs an approved migration or rollback decision and must be scoped to the feature that owns the data.

## 2026-07-31 - trainer-student-classroom-threads-realtime-20260731 - Bucket/QA Near Miss

Source:
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`

What happened:
The implementation can use `SUPABASE_SERVICE_KEY` for private storage/realtime, but no explicit classroom attachment bucket env name was present locally. The code falls back to `classroom-thread-attachments`, which must exist as a private Supabase bucket before live file-sharing QA.

Detection:
Implementation review checked env key names without printing secret values and found Supabase URL/anon/service keys but no `SUPABASE_CLASSROOM_ATTACHMENTS_BUCKET` or `CLASSROOM_THREAD_ATTACHMENTS_BUCKET`.

Prevention:
For future Supabase Storage features, decide the bucket name during technical decisions, add deployment/env documentation, and run a live upload/download check with authenticated users before final release approval.

## 2026-08-02 - Realtime Was Fast but the Application Path Was Not

Source:
- `docs/reviews/trainer-student-thread-instant-realtime-20260802-implementation-review.md`

What happened:
An invalidation-only Broadcast still forced receiver HTTP/API/database refetches, while post-commit canonical/summary/registry rereads delayed publication. Initial live commit-to-receive was about 0.85 seconds even after private Broadcast was correct. The Auth bridge also initially used reserved `app_metadata.provider` as an ownership marker; Supabase normalized that value to the real `email` provider after magic-link verification.

Detection:
Two independent Realtime clients measured send-start and commit-to-receive separately. Restarting the server exposed the reserved-metadata collision because the in-memory token cache no longer hid the persisted Auth user shape.

Prevention:
Measure the complete click/commit/render path, eliminate redundant hot-path round trips, return canonical projections from the atomic persistence statement, and never use provider-managed/reserved Auth metadata as an application ownership marker. Use a protected custom `app_metadata` key and test after a process restart.

## 2026-09-02 - Provider Labels Must Not Become Regex Source

Incident:
Codeforces EDU standings parsing interpolated a provider-controlled problem label directly into a regular expression. Labels containing quantifiers such as `*` caused `Invalid regular expression: nothing to repeat` and aborted classroom contest fetches.

Prevention:
Use literal string prefix handling for provider-controlled labels. If a dynamic regular expression is genuinely required, escape every interpolated value and cover metacharacter input in a regression test.
