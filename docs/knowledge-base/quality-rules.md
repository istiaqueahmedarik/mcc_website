# Quality Rules

## 2026-09-04 - Saved Provider HTML Must Fail Closed

Source:
- `server/src/services/codeforcesContestService.ts`
- `server/src/controllers/classroomContestController.ts`
- `docs/rsd/classroom-codeforces-edu-browser-import-20260904-rsd.md`

Rule:
A saved provider document may enter the classroom snapshot pipeline only after the normal manager authorization and only for the stored source type that explicitly supports it. Enforce a byte limit before parsing, treat markup as non-executable data, require the expected table, validate every provider link against the exact stored source identity, enforce target-handle and pagination completeness, and persist only a normalized snapshot. Never log, echo, or store the raw document.

Applies when:
Changing the Codeforces EDU import, adding upload-assisted provider ingestion, or reviewing contest snapshot privacy.

Do not overgeneralize:
Do not turn this into arbitrary HTML ingestion, a client-authoritative standings format, a Cloudflare-cookie relay, or a substitute for fixed-origin automatic provider adapters.

## 2026-09-04 - Codeforces Access Must Be Ordered, Secret-Safe, and Bounded

Source:
- `server/src/services/codeforcesContestService.ts`
- `client/src/components/ClassroomContestPanel.jsx`

Rule:
Numeric classroom Codeforces fetches must preserve this order: anonymous official API with exactly `contestId`, a lazily loaded signed API retry using the trainer's encrypted credentials, then transient-JSESSIONID fixed-origin friends HTML. EDU has no API path: its automatic path remains the bounded crawl, and browser-saved HTML is accepted only under the fail-closed recovery rule above. Construct regular numeric crawl paths as `/contest/{validatedNumericId}/standings/friends/true` and high-number Gym paths as `/gym/{validatedNumericId}/standings/friends/true`; bound API/crawl timeout, response size, page count, and concurrency. Successful numeric API snapshots retain official contestant rows for trainer mapping, while EDU/HTML snapshots retain only explicit classroom target handles. Never persist or return the browser session. Optional numeric upsolves must follow the successful standings transport: API-origin standings use bounded `contest.status` paging in the same anonymous/signed mode, while HTML-origin standings may use only validated `/submissions/{handle}/contest/{id}` paths for handles already present in that filtered result.

Because Codeforces blocks Bun's native HTTP fingerprint on numeric friends standings, production requests use `curl` without a shell. Supply JSESSIONID through curl's stdin configuration rather than process arguments, keep injected fetch clients for tests, cap response bytes and time, and treat provider 403/503 responses as temporary blocking rather than invalid API credentials.

If saved credentials were available and both signed API and HTML fallback fail, return the signed API failure because it identifies the actionable credential/access problem; attach only the bounded web fallback code. Literally redact the request API key and `apiSig` from provider comments before returning them. When credentials are missing, preserve the HTML fallback result.

Applies when:
Changing numeric Codeforces source routing, standings parsing, Codeforces web-session transport, or classroom snapshot persistence.

Do not overgeneralize:
Do not crawl arbitrary URLs, add signed parameters to the first anonymous request, retain unofficial/practice participants, admit unmapped API rows into classroom reports, create absent participants from submission history, expose saved API secrets, or turn the browser session into a stored provider credential.

## 2026-09-02 - Contest Report View Modes Stay Presentational

Source:
- `docs/reviews/trainer-contest-report-compact-mode-20260902-implementation-review.md`

Rule:
Compact/Extended contest report modes may change only the visible table columns, density, and formatting. They must use the same ranked report rows and must not change search semantics, report generation, authoritative rank, sharing payloads, CSV/PDF exports, or snapshot data. Compact result cells use `solved(penalty)` and preserve excluded/dropped/removed state visually.

Compact Name/ID provider links should use fixed slots so icon presence does not shift the identity or numeric columns. Classroom report generation must filter mapped rank data to `isClassroomParticipant` identities before merging/scoring; raw snapshots retain complete standings rows for trainer mapping and audit. Existing reports may be projected client-side only when explicit membership markers exist, preserving compatibility with legacy unmarked reports.

Compact rank and result columns must apply the same alignment and padding to `TableHead` and `TableCell`. Any nested contest-title wrapper must span the full header cell so max-content width cannot shift the title away from its row values.

Applies when:
Changing `ReportTable`, trainer report density, report mode controls, or compact result formatting.

Do not overgeneralize:
Do not use a presentation mode as a scoring policy, data filter, export option, or public/student default without a separate approved decision.

## 2026-09-02 - EDU Friends Fetches Must Fail Before Persistence

Source:
- `server/src/services/codeforcesContestService.ts`
- `server/src/controllers/classroomContestController.ts`
- `client/src/components/ClassroomContestPanel.jsx`

Rule:
Plain and legacy classroom EDU lesson sources must request `friends=true` on every crawled page. If the filtered result contains no verified or explicitly overridden classroom Codeforces handle, return `CODEFORCES_EDU_NO_CLASSROOM_FRIENDS` before the controller inserts a snapshot, and show the trainer guidance to add the students as Codeforces friends and verify their saved handles.

Applies when:
Changing EDU source parsing, pagination URLs, classroom target filtering, fetch errors, or snapshot persistence.

Do not overgeneralize:
Do not use this error for numeric contests, explicit read-list sources, session failures, or a successful friends fetch containing at least one classroom target.

## 2026-09-01 - Classroom Upsolves Must Be Explicit and Snapshot-Safe

Source:
- `server/src/controllers/classroomContestController.ts`
- `server/src/services/codeforcesContestService.ts`
- `server/src/services/vjudgeContestService.ts`
- `docs/sql/classroom-contest-upsolves-20260901.sql`

Rule:
Classroom contest snapshots remain contest-time-only unless the saved contest item explicitly enables `include_upsolves`. VJudge may retain late submissions from its rank payload. Numeric Codeforces sources may crawl only the filtered standings handles, must process submission IDs chronologically, subtract contest-time rejected attempts already represented in the official cell, and fail closed when handle/page limits are exceeded.

Applies when:
Changing classroom contest fetch options, provider adapters, snapshot reuse, or post-contest solve calculations.

Do not overgeneralize:
Do not silently enable upsolves for existing rows, persist unrelated participant submissions, create practice-only identities absent from friends standings, return partial data after a crawl limit, or reuse a snapshot created under the opposite setting.

## 2026-09-01 - EDU Crawls Must Fail Closed And Filter Before Persistence

Source:
- `server/src/services/codeforcesContestService.ts`
- `server/src/controllers/classroomContestController.ts`
- `server/src/utils/codeforcesSession.ts`

Rule:
Codeforces EDU crawling must construct URLs only from validated course/lesson/list identifiers on `codeforces.com`, enforce timeout/response/page/concurrency limits, identify an accessible standings table before accepting data, and retain only classroom target handles. Resolve JSESSIONID from the explicit forwarded header first and root-scoped cookie second. Missing, expired, redirected, or challenged sessions must fail before writing a snapshot.

Applies when:
Changing EDU URL parsing, pagination, HTML selectors, session transport, classroom mapping, or snapshot insertion.

Do not overgeneralize:
Never add arbitrary URL inputs, browser-visible session storage, session logging, unbounded pagination, or full global standings persistence.

## 2026-08-29 - Provider Sessions Must Support Both Production Routes

Source:
- `server/src/utils/vjudgeSession.ts`
- `server/src/controllers/contestRoomController.ts`
- `server/src/controllers/classroomContestController.ts`

Rule:
Protected server endpoints that fetch VJudge data must resolve the session from the explicit `X-VJudge-Session` header first and then the root-scoped `vj_session` cookie. The header supports requests forwarded by Next route handlers; the cookie fallback supports production nginx configurations that route `/api/*` directly to Hono. Never log or return either credential.

Applies when:
Changing global or classroom contest preview, generation, publication, provider fetching, or `/api/*` reverse-proxy behavior.

Do not overgeneralize:
The cookie fallback does not replace JWT authorization or manager/admin checks, and it must not make an otherwise public endpoint credential-bearing by default.

## 2026-08-17 - Context Menus Need A Visible Equivalent

Source:
- `docs/rsd/trainer-student-context-menu-simplification-20260817-rsd.md`
- `docs/reviews/trainer-student-context-menu-simplification-20260817-implementation-review.md`

Rule:
Classroom context-menu commands must also be reachable from a visible keyboard-operable overflow control backed by the same command definitions. Context triggers stay scoped, destructive actions keep confirmation, hidden metadata remains searchable/recoverable through Details, and role filtering remains server-authoritative and client-visible.

Applies when:
Adding or changing contextual navigation or repeated-item commands in the trainer/student live classroom.

Do not overgeneralize:
This rule does not require context menus on read-only prose, inputs, editors, code, ordinary links, or every card in the application.

## 2026-08-10 - Mixed Contest Reports Need Stable Provider Identities

Source:
- `server/src/controllers/classroomContestController.ts`
- `client/src/components/ReportTable.js`

Rule:
Classroom contest reports that combine providers must key contests by provider-prefixed IDs and participants by canonical identities rather than display handles. Report rows should carry `identityKey`, `providers`, and `sourceHandles`; UI rows should use `identityKey || username` for keys/rank maps. Legacy VJudge reports may fall back to bare usernames and contest IDs.

Applies when:
Changing classroom contest report generation, TFC/TSC aggregation, demerits, progress calculations, row highlighting, report-table rendering, or future contest providers.

Do not overgeneralize:
Do not migrate unrelated global reports to this identity model without a separate compatibility plan, and do not break saved legacy classroom reports that lack the new fields.

## 2026-09-04 - Provider Secrets Stay Server-Only

Source:
- `server/src/services/codeforcesContestService.ts`
- `server/src/controllers/classroomContestController.ts`
- `client/src/app/api/classroom/[id]/contests/[...path]/route.js`

Rule:
External contest provider secrets must stay server-only. Codeforces API keys and secrets are accepted only by protected classroom-manager endpoints, encrypted independently with AES-256-GCM under a dedicated server environment key, returned only as connection metadata/key hint, and decrypted lazily for signed API requests. The first API request remains anonymous with exactly `contestId`. Browser/Next proxy code may forward provider-specific browser session cookies only for the existing authorized crawl fallback, and it must never log or return them.

Applies when:
Changing Codeforces fetches, external contest provider sessions, classroom contest proxies, deployment environment setup, or error handling around provider access.

Do not overgeneralize:
Do not add `NEXT_PUBLIC_` provider secrets, persist JSESSIONID, create reveal-secret/session endpoints, reuse the credential-encryption key for unrelated purposes, or add diagnostic logging that prints env values or trainer-provided credentials.

## 2026-08-10 - Unmapped Codeforces Rows Must Not Become Report Identities

Source:
- `server/src/controllers/classroomContestController.ts`
- `client/src/components/ClassroomContestPanel.jsx`

Rule:
Classroom Codeforces snapshots may contain every official standings row, including participants that are not in the classroom. Generated classroom reports must count only rows resolved to `student:<uuid>` or `group:<uuid>` identities. Unmapped Codeforces rows stay reviewable for trainers, and `ignore` overrides must keep `identityKey` null so ignored participants cannot affect totals, TFC/TSC references, demerits, highlighting, or report aggregation.

Applies when:
Changing Codeforces snapshot persistence, mapping resolution, report generation, TFC/TSC aggregation, demerits, row highlighting, or trainer handle-management UI.

Do not overgeneralize:
Do not filter full Codeforces snapshots back down to classroom rows, do not assign provider-prefixed unmatched identities to Codeforces rows, and do not treat ignore mappings as roster membership.

## 2026-08-10 - Discord Channel Changes Must Preserve Exact-ID Authority

Source:
- `server/src/controllers/discordController.ts`
- `server/src/utils/discordProvisioning.ts`

Rule:
Classroom Discord channel changes must reauthorize the actor against both MCC classroom management and the selected Discord guild, then mutate binding/mapping rows in a short transaction and queue worker provisioning. Keep old Discord names/IDs non-authoritative, archive stale mappings before new provisioning, clear archive markers when reusing student mapping rows, and count only active student channels in status payloads.

Applies when:
Changing Discord binding moves, channel recreation, provisioning upserts, roster/status payloads, or Discord repair logic.

Do not overgeneralize:
This rule does not require destructive Discord API cleanup; add that only as an explicit worker-backed feature with its own safety review.

## 2026-08-10 - Admin User Imports Stay Server-Owned

Source:
- `server/src/controllers/classroomController.ts`
- `client/src/app/admin/trainers/TrainersManagementClient.js`

Rule:
Admin user creation and imports must revalidate every client-provided field on the server before inserting `users` rows. Bulk imports should avoid per-row network loops, cap request size, hash passwords outside the insert transaction, check existing emails with the indexed lowercase email path, return row-numbered errors, and never create pre-enrolled placeholder accounts through the full-user endpoint.

Applies when:
Changing admin full-user creation, CSV imports, role flags, verified handle fields, or user import result handling.

Do not overgeneralize:
This does not replace classroom-specific roster validation, public signup validation, or future large-import background job design.

## 2026-08-09 - Public-Schema Feature Tables Need RLS

Source:
- `docs/sql/trainer-classroom-contests-20260809.sql`
- `docs/reviews/trainer-classroom-contests-20260809-implementation-review.md`

Rule:
Any new Supabase `public` schema table must explicitly enable row level security in the SQL artifact, even when all current app access goes through server-owned Hono routes. If direct Data API access is not part of the feature, do not add broad anon/authenticated policies; keep authorization in the server route and leave direct table access closed.

Applies when:
Adding public-schema classroom tables, report tables, integration tables, queues, snapshots, or future feature-owned persistence.

Do not overgeneralize:
This does not replace route-level authorization checks, database foreign keys, scoped indexes, or feature-specific share gates.

## 2026-08-09 - Scoped Reports Must Not Reuse Public Share Sinks

Source:
- `docs/reviews/trainer-classroom-contests-20260809-implementation-review.md`

Rule:
Classroom-scoped reports must keep persistence and sharing in classroom-scoped tables/routes. Shared display components may accept injected controls, but classroom sharing must not call `public-contest-report` or write `Public_contest_report`. User-entered report annotations such as demerit reasons must render as text, never through `innerHTML`.

Applies when:
Changing `ReportTable`, classroom report sharing, contest demerits, live-share controls, or future private report surfaces.

Do not overgeneralize:
Global contest reports may keep their existing public live-share path until a separate migration changes that workflow.

## 2026-08-09 - Post-Create Bind Paths Must Match Create Paths

Source:
- `docs/reviews/trainer-existing-classroom-discord-binding-20260809-implementation-review.md`

Rule:
When adding a way to attach an external integration to an existing classroom, reuse the same server helper and defaults used during classroom creation. The mutation must check both MCC object authorization and current external-resource permission, then write binding/rules/jobs in one short transaction. UI should call a protected object settings route and reload authoritative status instead of hand-assembling integration state.

Applies when:
Adding or changing existing-classroom Discord binding, future post-create integrations, repair/setup flows, or external-account attach workflows.

Do not overgeneralize:
Do not create public attach routes for private objects, do not duplicate provisioning defaults in the browser, and do not hold database locks while calling external APIs.

## 2026-08-09 - Reauthorize Posted External Resource IDs

Source:
- `docs/reviews/trainer-shared-discord-guild-classrooms-20260809-implementation-review.md`
- `docs/decisions/trainer-shared-discord-guild-classrooms-20260809-technical-decisions.md`

Rule:
When a client posts an external platform resource selected from an authorized list, the mutation endpoint must independently revalidate the actor's current permission for the exact immutable external ID. Store provider-returned identity metadata, not client labels. Shared external installations must keep tenant/classroom bindings and failure state scoped rather than treating installation membership as domain authorization.

Applies when:
Binding Discord guilds, repositories, drives, calendars, payment accounts, or other reusable external containers to MCC domain records.

Do not overgeneralize:
Do not make external network calls inside a database transaction or infer MCC access from external membership alone. Use a separate approved design for cached permission proofs if live provider validation becomes too slow or unavailable.

## 2026-08-09 - Classroom People Redesign Must Preserve Roster Semantics

Source:
- `docs/reviews/trainer-student-roster-apple-redesign-20260809-implementation-review.md`
- `docs/rsd/trainer-student-roster-apple-redesign-20260809-rsd.md`

Rule:
People tab UI redesigns must not change roster authority. Pre-enrolled and link-pending students can stay selectable for trainer workflows, student classroom access must remain active-only, endpoint strings and tour tab values must stay stable, and list batching/search should be local UI state unless a separate server-pagination decision exists.

Applies when:
Changing People roster rows, group membership dialogs, add/import/pre-enrollment UI, student Group & Roster, or classroom People motion.

Do not overgeneralize:
This is not approval for server/API/schema/auth edits, bulk enrollment semantic changes, new dependencies, or hidden polling.

## 2026-08-02 - Discord Bridge Privacy and Delivery Rules

Source:
- `docs/adr/0012-classroom-discord-bridge.md`
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`

Rule:
Discord bridge code must keep OAuth tokens encrypted, avoid logging message bodies/tokens, disable automatic mentions on bot sends, resolve all Discord events by exact IDs, copy accepted attachments into the existing private storage flow, and enqueue Discord delivery work in the same transaction as the domain mutation while doing network calls after commit from the worker.

Applies when:
Changing Discord OAuth storage, inbound message handling, outbound notifications, delivery queue jobs, provisioning, check-ins, reminders, or command handlers.

Do not overgeneralize:
This does not remove the need for explicit classroom authorization checks, live guild smoke tests, or the separate public-table RLS remediation before production rollout.

## 2026-08-09 - Manual Discord Links Must Not Trust Usernames

Source:
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`
- `docs/sql/trainer-classroom-discord-manual-links-20260809.sql`

Rule:
Any admin/trainer manual Discord link must require a Discord user snowflake ID or @mention, record who verified it, and keep usernames/display names as non-authoritative labels. Manual links may satisfy classroom access and channel overwrite provisioning, but OAuth-backed tokens remain required for automatic guild joins and trainer guild listing.

Applies when:
Changing Discord roster overrides, imports, account-linking migrations, classroom gate checks, or Discord provisioning code.

Do not overgeneralize:
Do not fabricate encrypted OAuth tokens for manual records, do not use mutable display names as IDs, and do not relax the unique active Discord-account constraint.

## 2026-08-09 - Discord Commands Need Stable Refs and Body-Free Audit

Source:
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`
- `server/src/utils/discordCommandHandlers.ts`

Rule:
Discord command mutations must use stable server-resolved IDs or refs for classroom entities, validate all free-form modal inputs before mutation, and keep `discord_command_audit.metadata` limited to IDs, counts, booleans, status/reason codes, and safe workflow metadata. Use advisory/idempotency protection for mutation submits and queue Discord notifications in the same database transaction as the authoritative state change.

Applies when:
Changing `/mcc assign`, `/mcc submit`, `/mcc review`, future Discord trainer/student mutations, or command audit metadata.

Do not overgeneralize:
Do not store Discord message bodies, solution code, trainer notes, OAuth tokens, raw usernames, or mutable labels in audit metadata; do not trust autocomplete display labels as authority.

## 2026-08-02 - Use Design Skill Stack For New Interfaces

Source:
- User instruction on 2026-08-02
- `AGENTS.md`
- `/home/arik/.agents/skills/interface-design/SKILL.md`
- `/home/arik/mcc_website/.agents/skills/apple-design/SKILL.md`
- `/home/arik/mcc_website/.agents/skills/emil-design-eng/SKILL.md`

Rule:
Before designing any new interface, load and apply `interface-design`, `apple-design`, and `emil-design-eng`. Record or keep a compact working intent/hierarchy/palette/depth/type/spacing rationale, use existing shadcn/Radix/Tailwind/lucide patterns first, make motion purposeful and accessible, and verify visible states/responsiveness before handoff.

Applies when:
Creating new pages, new product surfaces, major interface additions, dashboard/tool/admin/classroom/trainer UI, or reusable UI components that need designed layout, interaction, or motion.

Do not overgeneralize:
This is a design discipline, not permission for retroactive cleanup, new dependencies, behavior changes, server/API/schema/auth edits, or bypassing approved project-specific UI decisions.

## 2026-08-02 - Keep DDL Out Of Student Thread Request Paths

Source:
- `docs/reviews/trainer-student-thread-realtime-hardening-performance-20260802-implementation-review.md`
- `docs/sql/trainer-student-thread-realtime-hardening-20260802.sql`

Rule:
Student-thread controllers and schema utilities must not run `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, `DROP INDEX`, or extension setup during normal request handling. Put schema, RLS, grant, and index changes in SQL artifacts or the repository's migration workflow, then verify them with Supabase-focused checks.

Applies when:
Changing `classroomStudentThreadsSchema.ts`, student-thread routes/controllers, attachment tables, realtime-channel tables, or topic-assignment schema touched by student-thread workflows.

Do not overgeneralize:
This does not ban narrow existence checks for runtime data; it bans request-time DDL and schema mutation on user-facing thread paths.

## 2026-08-02 - Vercel Web Interface Guidelines Baseline

Source:
- `https://vercel.com/design/guidelines`
- `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/AGENTS.md`
- `docs/rsd/vercel-web-interface-guidelines-20260802-rsd.md`
- `docs/decisions/vercel-web-interface-guidelines-20260802-technical-decisions.md`
- `docs/tasks/vercel-web-interface-guidelines-20260802-task-plan.md`
- `docs/reviews/vercel-web-interface-guidelines-20260802-implementation-review.md`

Rule:
New pages and major page redesigns must use Vercel's Web Interface Guidelines as a quality baseline. Before handoff, review generated UI for keyboard operation, focus visibility/management, hit targets, semantic navigation, URL-backed state when relevant, loading/empty/error states, responsive coverage, resilient content, form behavior, reduced motion, compositor-friendly animation, contrast, and performance basics.

Applies when:
Creating new web pages, doing major page redesigns, reviewing generated interfaces, or adding page-level trainer/classroom UI.

Do not overgeneralize:
This does not authorize retroactive cleanup of existing pages, new dependencies, external guideline command installation, or overriding approved MCC trainer/classroom design decisions and local shadcn/Radix/Tailwind/lucide patterns.

## 2026-08-02 - Trainer Mini-Laptop Density

Source:
- `docs/reviews/trainer-compact-ui-cleanup-20260802-implementation-review.md`

Rule:
Trainer route UI should optimize for mini-laptop scan speed: avoid tall repeated cards for classroom/form operations, keep secondary panels bounded, use `min-w-0` and explicit responsive grid tracks, prefer static semantic status accents over pulsing/count-heavy controls, and keep permanent helper/tour controls visually quiet.

Applies when:
Changing `/trainer/dashboard`, `/trainer/forms`, `/trainer/forms/[id]`, trainer operation cards/lists, form-builder side panels, or trainer route tour launchers.

Do not overgeneralize:
Do not hide decision-critical trainer controls just to reduce density; compacting should demote repeated metadata and explanatory copy, not remove required actions.

## 2026-08-01 - Bound Student Thread Surfaces

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Rule:
Trainer and student chat surfaces must have bounded panel heights, internal scroll regions for message history, and composer max-height constraints so high-volume threads do not expand the whole classroom page.

Applies when:
Changing `ClassroomThreadsTab.js`, floating thread bubbles, thread lists, message history rendering, or chat composers.

Do not overgeneralize:
Bounded surfaces do not replace server-side pagination or virtualization if future measured volume exceeds the current message limit.

## 2026-08-01 - Page Thread and Update History

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Rule:
Student-thread messages, student-thread events, and classroom Updates should load an initial bounded page and then expose explicit older/load-more actions. Do not fetch full history on initial chat, modal, or tab open.

Applies when:
Changing `ClassroomThreadsTab.js`, `UpdatesTab.js`, student-thread message/event APIs, or classroom update list APIs.

Do not overgeneralize:
Small current pages can still render all items already returned by the bounded API page; virtualization can be added later if measured DOM volume requires it.

## 2026-08-01 - Server Resolves Submission References

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Rule:
Student-thread messages and attachments may carry submission context only after the server resolves the requested reference from authoritative live/topic pending submission rows. Never persist client-provided problem titles, student ids, class labels, or status values as authority.

Applies when:
Changing `ClassroomThreadsTab.js`, student-thread send endpoints, pending-submission chat buttons, or classroom message metadata.

Do not overgeneralize:
This rule is for submission-reference metadata; it does not make chat metadata a replacement for formal relational records when a future workflow needs querying or reporting.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Bound Dense Member Lists

Source:
- `docs/reviews/trainer-feature-futureproof-crud-schedule-submission-20260727-implementation-review.md`

Rule:
Classroom group cards must not render unbounded member names inline beside action controls. Show member count, a small preview, and an explicit overflow affordance so edit/save/matrix actions remain reachable with large groups.

Applies when:
Changing People tab Groups lists, trainer Groups dashboard cards, student group/roster cards, or future group assignment summaries.

Do not overgeneralize:
Dense comparison matrices may still need scroll containers or virtualization; this rule is for card/list member previews.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Code Proof Still Requires Trainer Verdict

Source:
- `docs/reviews/trainer-feature-futureproof-crud-schedule-submission-20260727-implementation-review.md`

Rule:
Allowing pasted code as proof must not give students final live problem verdict control. Server status handlers must keep student submissions as `pending_approval` and reserve `solved`, `tried`, and `not_solved` finalization for trainers/managers.

Applies when:
Changing `class_problems` proof fields, live Challenge submission dialogs, or trainer proof review surfaces.

Do not overgeneralize:
This rule does not add code execution or external judge verification.

## 2026-07-27 - trainer-student-tabs-schedule-time-20260727 - Normalize Schedule Times At Boundaries

Source:
- `docs/reviews/trainer-student-tabs-schedule-time-20260727-implementation-review.md`

Rule:
Class schedule writes must not send raw `datetime-local` strings across the API boundary. Convert browser local selections to ISO on submit and validate/normalize on the server before storing `classes.scheduled_time`.

Applies when:
Changing classroom session schedule create/edit handlers or adding new schedule-like fields.

Do not overgeneralize:
This rule does not migrate historical rows or define product-wide timezone preferences.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Separate Trainer Selectability From Student Access

Source:
- `docs/reviews/trainer-pre-enrolled-students-20260727-implementation-review.md`

Rule:
Pre-enrolled or link-pending classroom students may be selectable in trainer-side workflows, but student-facing classroom access must require active real membership (`classroom_students.enrollment_status = 'active'`) and must reject placeholder users.

Applies when:
Changing classroom roster queries, groups, attendance, problem assignment, topic access, chat/IDE/board access, signup/profile linking, or claim approval.

Do not overgeneralize:
This does not block trainers from managing placeholder roster identities; it blocks unapproved student-session access only.

## 2026-07-27 - trainer-live-progress-design-refresh-20260727 - Avoid Dead Table Space

Source:
- `docs/reviews/trainer-live-progress-design-refresh-20260727-implementation-review.md`

Rule:
Trainer classroom tables should use available width deliberately. Avoid narrow auto-width tables that leave dead space while important review controls and problem text become cramped.

Applies when:
Editing trainer Live progress, classroom review queues, or dense operational table layouts.

Do not overgeneralize:
Small content tables can stay compact when full-width layout would reduce readability.

## 2026-07-26 - student-challenge-submission-duration-20260726 - Server Owns Problem Verdicts

Source:
- `docs/reviews/student-challenge-submission-duration-20260726-implementation-review.md`

Rule:
Student-facing problem status UI must not be the only control preventing solve self-approval. Live-class problem APIs must enforce trainer-owned final verdicts server-side and treat student solve attempts as proof submissions for trainer review.

Applies when:
Changing `class_problems.status`, student Challenge cards, trainer problem review, or related status endpoints.

Do not overgeneralize:
Students can still update allowed self-reported fields such as perceived difficulty when the server preserves final verdict ownership.

## 2026-07-26 - classroom-live-stop-polling-20260726 - No Hidden Classroom Live Polling

Source:
- `docs/reviews/classroom-live-stop-polling-20260726-implementation-review.md`

Rule:
Do not add interval polling or browser focus/visibility refetches to classroom live pages. Use explicit refresh/action-driven fetches or event-driven sockets instead.

Applies when:
Working on classroom live chat, classroom details, topic data, board state, or IDE tracking.

Do not overgeneralize:
Short-lived UI timers and countdowns are allowed when they do not fetch or post data.

## 2026-07-26 - trainer-bulk-import-feedback-notifications-20260726 - Bulk Actions Need Single Request Feedback

Source:
- `docs/reviews/trainer-bulk-import-feedback-notifications-20260726-implementation-review.md`

Rule:
Trainer bulk actions should avoid per-row network loops, show disabled/loading state while the batch request is running, and replace loading feedback with one clear success/error result.

Applies when:
Implementing trainer bulk imports, batch mutations, or high-latency trainer classroom actions.

Do not overgeneralize:
Single small actions can remain simple handler calls if they still provide visible processing feedback.

## 2026-07-25 - Keep Role-Based Navigation Local

Source:
- `client/src/components/Navbar.js`

Rule:
For small role-based navigation changes, prefer editing the existing link rendering conditions in `Navbar.js` over introducing a new navigation registry or policy layer.

Applies when:
The change only affects which already-existing links appear for a role.

Do not overgeneralize:
Extract shared navigation policy only if multiple components begin duplicating the same role logic.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Verify Narrow First

Source:
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

Rule:
For a scoped component-only change in a repository with unrelated lint failures, record the full-suite blocker and run a targeted lint command against the changed component.

Applies when:
Full lint fails outside the approved write scope.

Do not overgeneralize:
Do not use targeted lint as a substitute when failures are in changed files or shared dependencies touched by the task.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Render Resource Markdown Safely

Source:
- `docs/decisions/trainer-dashboard-ai-resource-writing-assistant-technical-decisions.md`

Rule:
Classroom resource markdown should render with raw HTML disabled unless a future approved requirement explicitly needs trusted embeds and records the security tradeoff.

Applies when:
Rendering trainer-authored classroom resource markdown for students or trainers.

Do not overgeneralize:
Existing pages that intentionally rely on raw HTML in `MarkdownRenderer` are not changed by this rule unless they render classroom resources.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Avoid Render-Time Browser Capability Checks

Source:
- `docs/reviews/trainer-dashboard-ai-resource-writing-assistant-implementation-review.md`

Rule:
Client components that display browser capability state such as WebGPU support should compute it after mount with `useEffect`, then update state, to avoid server/client hydration mismatch risk.

Applies when:
Adding browser-only capability checks in Next.js client components.

Do not overgeneralize:
Pure event-handler checks can still call browser APIs directly when they do not affect initial rendered markup.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Trainer Pages Are Operational Surfaces

Source:
- `docs/decisions/trainer-mode-ui-refresh-20260725-technical-decisions.md`

Rule:
Trainer dashboard and form management pages should prefer dense operational layouts, semantic status accents, stable icon buttons, clear tables/lists, and responsive panels over decorative hero/orb treatments.

Applies when:
Designing or reviewing trainer admin/workflow pages used repeatedly by trainers.

Do not overgeneralize:
Public landing pages, portfolios, or game-like pages may need a different visual treatment under their own RSD.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - UI-Only Diffs Preserve Behavior Shape

Source:
- `docs/reviews/trainer-mode-ui-refresh-20260725-implementation-review.md`

Rule:
For a trainer UI-only redesign, keep endpoint strings, route targets, state keys, submit handlers, validation branches, and authorization-bearing page guards unchanged unless the RSD explicitly approves behavior change.

Applies when:
Reviewing design refreshes where the user says not to change process or routes.

Do not overgeneralize:
Behavior refactors can still be valid under a separate RSD with explicit acceptance criteria and stronger tests.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Swiss Minimal Operational Rule

Source:
- `docs/rsd/swiss-minimal-learning-ui-refresh-20260725-rsd.md`

Rule:
For the approved trainer/classroom/student dashboard refresh, use Swiss design constraints: grid-first alignment, restrained typography, purposeful whitespace, high contrast, semantic accents, compact actions, and no decorative glows or duplicate low-value information.

Applies when:
Reviewing UI changes in `/trainer/dashboard`, `/classroom/list`, `/classroom/live/[id]`, or `/my_dashboard` for this task.

Do not overgeneralize:
Do not remove statuses, errors, form labels, required counts, or action-critical data merely because the page should be minimal.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Preserve Polling During UI Refresh

Source:
- `docs/reviews/swiss-minimal-learning-ui-refresh-20260725-implementation-review.md`

Rule:
For classroom live UI-only refreshes, leave polling intervals, visibility handlers, endpoint strings, and chat/resource/problem handlers unchanged unless a behavior RSD explicitly approves the change.

Applies when:
Editing `ClassroomLiveClient.js` presentation around live classroom data.

Do not overgeneralize:
The existing hook dependency warning is not a blanket waiver for future behavior work; fix it under a behavior-safe task with targeted tests.

## 2026-07-25 - past-class-detail-visualization-20260725 - Filter Resource Scope Explicitly

Source:
- `docs/reviews/past-class-detail-visualization-20260725-implementation-review.md`

Rule:
When classroom detail responses include both classroom-level and class-specific resources, client display code must explicitly filter by `class_id` so general resources and class materials do not appear in the wrong section.

Applies when:
Changing `/classroom/live/[id]` resources, completed class history, or classroom detail response shape.

Do not overgeneralize:
This rule does not replace server-side authorization or justify returning unrelated classroom data.

## 2026-07-25 - trainer-class-tags-chat-shadcn-refresh-20260725 - Validate Class Chat On Server

Source:
- `docs/reviews/trainer-class-tags-chat-shadcn-refresh-20260725-implementation-review.md`

Rule:
Class-specific chat endpoints must validate the requested `class_id` belongs to the route `classroom_id` and that the current user can access that class before reading messages, sending messages, or toggling reactions.

Applies when:
Changing `classroom_messages`, message reactions, direct-message filtering, or class chat APIs.

Do not overgeneralize:
This does not fix older classroom management authorization helpers; review those separately before broad reuse.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Access Check Resource Detail

Source:
- `docs/decisions/classroom-resource-reader-problem-preview-20260725-technical-decisions.md`

Rule:
Dedicated classroom resource detail endpoints must verify the resource belongs to the route classroom and the requester can access that classroom before returning markdown content.

Applies when:
Adding resource reader routes, resource notifications, or standalone resource APIs.

Do not overgeneralize:
This does not replace existing classroom management authorization checks.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Do Not Weaken Class Problem Scope

Source:
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`

Rule:
Class-independent team-topic work must use separate assignment/progress storage instead of making `class_problems.class_id` nullable.

Applies when:
Adding topic assignment, team progress, or analytics features around classroom problems.

Do not overgeneralize:
Future migrations can still change `class_problems` if a new RSD explicitly changes live-class history semantics and includes stronger tests.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Board WebSocket Tokens

Source:
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`

Rule:
Classroom board WebSocket URLs must use short-lived board join tokens generated through authenticated HTTP, not long-lived app JWTs exposed directly in the socket URL.

Applies when:
Implementing or reviewing tldraw board sync, WebSocket auth, or classroom realtime sessions.

Do not overgeneralize:
This rule is for board sync; other authenticated HTTP endpoints still use existing bearer token flow.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Bound IDE Telemetry

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
Classroom IDE monitor endpoints should bound event types, languages, event detail JSON, and code snapshot length, and must keep student write access separate from trainer monitor reads.

Applies when:
Adding IDE events, monitor APIs, activity dashboards, or retention logic.

Do not overgeneralize:
This does not authorize execution, filesystem access, hidden surveillance, or cross-classroom monitor reads.
## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Server Owns Team Membership Validity

Source:
- `docs/reviews/trainer-ide-tracking-team-edit-20260725-implementation-review.md`

Fact:
Team membership update endpoints must validate team ownership and classroom enrollment on the server; client checkboxes are only UI state.

Applies when:
Changing classroom team create/edit flows or assignment logic that trusts team members.

Do not overgeneralize:
This does not replace route-level authorization; keep both permission checks and domain validation.

## 2026-07-26 - trainer-qa-fixes-20260726 - Student Workflow Lists Must Be Role Clean

Source:
- `docs/reviews/trainer-qa-fixes-20260726-implementation-review.md`

Rule:
Classroom student-only workflows must filter or reject trainer/admin users on the server before returning rosters, group candidates, attendance rows, assignment targets, IDE monitor sources, or student notifications.

Applies when:
Changing classroom enrollment, People/Groups, attendance, assignments, IDE monitor reads, or student-targeted notifications.

Do not overgeneralize:
Do not delete existing enrollment rows without an explicit cleanup RSD and rollback plan.

## 2026-07-26 - trainer-qa-fixes-20260726 - Honest External Problem Metadata

Source:
- `docs/reviews/trainer-qa-fixes-20260726-implementation-review.md`

Rule:
Problem previews and saved assignment metadata must omit unavailable external judge limits or state that they are unavailable, rather than inventing placeholder limits such as `Standard sec | Standard MB`.

Applies when:
Changing `fetchProblemMetadata`, `problem-preview`, or classroom problem assignment displays.

Do not overgeneralize:
It is still valid to show real parsed time/memory limits when the source provides them.

## 2026-07-29 - Lazy Problem Thread Loading

Source:
- `docs/reviews/trainer-updates-problem-threads-20260728-implementation-review.md`

Rule:
Problem-thread components should mount only when the user opens a thread dialog or directly navigates to a thread surface. Do not render a thread component for every problem card on initial classroom load.

Applies when:
Changing live problem cards, topic problem cards, problem lists, or any classroom thread preview.

Do not overgeneralize:
It is still acceptable to load the Updates list on the first Updates tab mount because that is the tab's primary content.

## 2026-07-31 - Keep Student Thread Policy Server-Owned

Source:
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`

Rule:
Classroom student-thread modules must keep access policy, active-real-student filtering, event fan-out, safe attachment validation, storage paths, and signed URL creation on the server. Client components may show hints and states, but they must not decide authorization or file safety.

Applies when:
Changing student-thread APIs, classroom attachment uploads, realtime channels, or thread list UI.

Do not overgeneralize:
This rule does not forbid focused client components; it forbids moving policy decisions into them.

## 2026-08-02 - Realtime Delivery Must Be Direct, Ordered, and Recoverable

Source:
- `docs/reviews/trainer-student-thread-instant-realtime-20260802-implementation-review.md`

Rule:
Student-thread sends must keep persistence authoritative, return/publish the canonical safe projection without post-commit rereads, carry a monotonic thread revision, and provide bounded authorized catch-up. Private Broadcast authorization must bind the verified user subject to the exact current topic, and browsers must remain receive-only.

Applies when:
Changing student-thread message writes, Broadcast envelopes, subscription lifecycle, optimistic reconciliation, or performance-sensitive server queries.

Do not overgeneralize:
Direct canonical Broadcast is appropriate only for fields already authorized for every topic recipient; sensitive or separately authorized data must stay behind the API.

## 2026-08-29 - Contest Report Renderers Must Not Change Scores

Source:
- `client/src/components/ReportTable.js`
- `client/src/components/LiveReportTable.js`
- `server/src/services/contestFormula.ts`

Rule:
Contest report renderers may search, export, enrich profile display, and show breakdown dialogs, but must not apply score-changing filters or rerank V2 scored snapshots. Formula execution must stay in the safe parser/interpreter; do not use `eval`, `Function`, property access, dynamic imports, or browser-side formula execution for authoritative contest scores.

Applies when:
Changing `ReportTable`, `LiveReportTable`, scoring config UI, formula variables, public contest publication, or classroom contest report displays.

Do not overgeneralize:
Legacy snapshots can keep legacy display fallbacks until they are regenerated. New score-changing behavior belongs in persisted scoring configs and server previews.

## 2026-08-29 - Composite Formula Variables Need Clear Scope

Source:
- `server/src/services/contestScoringService.ts`
- `client/src/components/ContestScoringDialog.jsx`
- `client/src/components/ContestMergeOverview.jsx`

Rule:
Composite formulas must be evaluated only inside the server scoring service and only against that composite's member contest rows. Formula UI should use row metrics and filters, not generated per-contest variables. The composite key is a result key for display, exclusion, sorting metadata, and report column identity.

Applies when:
Changing composite scoring, formula variable lists, merge-group UI, preview traces, or generated scored snapshots.

Do not overgeneralize:
Do not expose hidden member contest variables as final result units after they are merged, and do not let client displays recalculate composite scores.

## 2026-08-29 - Sheet Formula Evaluation Must Stay Restricted

Source:
- `server/src/services/contestFormula.ts`
- `server/src/services/contestScoringService.ts`

Rule:
Sheet-style scoring formulas may support string filters and aggregate functions, but must still use the restricted parser/interpreter. Bare metric names like `demerits` are invalid; indexed metrics such as `demerits(0)` and aggregate selectors such as `sum(demerits where index == 0)` are valid. Do not allow property access, arbitrary functions, regex execution, dynamic imports, `eval`, or `Function`.

Applies when:
Changing the formula grammar, metric filter fields, scoring previews, saved formulas, or formula editor snippets.

Do not overgeneralize:
Formula filters are row selectors for contest/result-unit metrics, not a general scripting language.
# 2026-09-01 - Admin Export Privacy and Visualization Rule

Rule:
Admin analytics endpoints must revalidate admin authorization, select the minimum fields required by the UI/export, avoid logging row data, and return generic database errors. CSV downloads must reflect the visible filter policy and neutralize spreadsheet formula-leading values. Charts must provide text/count equivalents, use tabular numerals, keep mobile overflow scoped, and honor reduced motion.

Applies when:
Building or reviewing administrative analytics, roster/profile exports, readiness dashboards, or student-data visualizations.

## 2026-09-02 - Provider Session Setup Must Match Both API Routes

Source:
- `client/src/app/api/classroom/[id]/contests/vjudge-session/route.js`
- `server/src/controllers/classroomContestController.ts`
- `server/src/routes/classroomRoute.ts`
- `server/src/utils/vjudgeSession.ts`

Rule:
Any provider-session setup endpoint under `/api/classroom/*` must have behaviorally equivalent Next and Hono handlers when production may route `/api/*` directly to Hono. VJudge classroom setup accepts only JSESSIONID input, keeps the value in an HTTP-only root cookie, clears legacy username/password cookies, and retains JWT plus classroom-manager authorization on Hono.

Applies when:
Changing classroom provider-session connect/status/clear flows, nginx `/api/*` routing, or provider-cookie transport.

Do not overgeneralize:
Do not persist provider web sessions in the database, log or return their values, accept account passwords in the classroom VJudge flow, or weaken application authorization because the provider credential is present.
## 2026-09-02 - Score Adjustment Safety

Source:
- `docs/rsd/contest-score-adjustment-rules-20260902-rsd.md`
- `server/src/services/contestScoringService.ts`

Rule:
Score adjustments must use a closed field/operation/scope contract, remain bounded to 32 rules and finite values, and be normalized before database writes. Validate referenced result-unit keys against the current room. Apply rules top-to-bottom before drop-worst and final formulas, trace every applied before/after value, and floor solved/penalty/demerits at zero. Global/admin keeps no rules as an exact no-op; classroom/trainer defaults to `penalty × 0` unless a manager saves another rule list.

Applies when:
Changing scoring configuration, correction rules, result-unit construction, preview traces, or scoring migrations.

Do not overgeneralize:
Do not add arbitrary code, participant targeting, client-side authoritative scoring, or provider-snapshot mutation without a separate approved decision.
