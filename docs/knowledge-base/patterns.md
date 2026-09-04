# Patterns

## 2026-09-04 - Lazy Signed Codeforces API Retry

Source:
- `server/src/services/codeforcesContestService.ts`
- `server/src/controllers/classroomContestController.ts`
- `server/src/utils/codeforcesCredentialCrypto.ts`

Pattern:
Keep the first public standings request anonymous and minimal. Only after it is unusable, lazily load the classroom manager's encrypted credentials, generate a Codeforces SHA-512 `apiSig` from sorted parameters, and retry the same normalized/filtering path. If signed access is unavailable or fails, use the fixed-origin bounded web crawler. Credential management endpoints must be manager-authorized and return metadata only; decrypt only server-side at the point of use.

Applies when:
Maintaining classroom Codeforces signed requests, provider fallback order, credential lifecycle, or failure metadata.

Do not overgeneralize:
Do not put secrets into logs, client state, snapshots, or report payloads; do not load credentials for successful anonymous requests; and do not use this persistence model for JSESSIONID.

## 2026-09-02 - Numeric Codeforces API-First Fallback

Source:
- `server/src/services/codeforcesContestService.ts`
- `server/src/services/codeforcesContestService.test.ts`

Pattern:
For a numeric classroom Codeforces source, try anonymous `contest.standings` with only `contestId`, enforce the provider rate and response limits, normalize the official rows, and discard non-classroom handles before persistence. The 2026-09-04 pattern above inserts a lazy signed API retry before the fixed-origin authenticated friends HTML view. Keep fallback metadata to a non-sensitive error code. EDU remains crawl-only, and web-session values never enter logs, snapshots, or API URLs.

Applies when:
Maintaining classroom numeric Codeforces fetching, API failure behavior, Gym fallback, or provider snapshot filtering.

Do not overgeneralize:
Do not send handles or other optional parameters on the anonymous public standings request, silently persist the full API ranklist, or add OAuth persistence.

## 2026-09-01 - Authenticated Provider HTML As A Bounded Adapter

Source:
- `server/src/services/codeforcesContestService.ts`
- `server/src/utils/codeforcesSession.ts`
- `docs/reviews/classroom-codeforces-edu-lesson-standings-20260901-implementation-review.md`

Pattern:
Keep classroom Codeforces crawling inside the provider adapter: validate a fixed-origin source identity, require an ephemeral HTTP-only session, choose the narrowest authenticated provider view available, bound timeout/response bytes/concurrency/page count, reject login/challenge HTML, parse provider markup into the existing normalized contract, and discard rows outside explicit classroom target handles before persistence. Numeric public contests use `/contest/{id}/standings/friends/true`, high-number Gyms use `/gym/{id}/standings/friends/true`, ordinary EDU lessons use `friends=true`, and explicit EDU read-list sources remain supported. Preserve header-first and root-cookie-second session transport for Next-proxy and direct-Hono production routes.

Applies when:
Maintaining Codeforces EDU crawling or adding a similarly constrained authenticated provider source to classroom snapshots.

Do not overgeneralize:
Do not accept arbitrary URLs, persist full third-party standings, log session values, silently convert access failures to empty snapshots, or use saved API credentials in crawl requests.

## 2026-08-17 - Shared Visible And Contextual Commands

Source:
- `docs/decisions/trainer-student-context-menu-simplification-20260817-technical-decisions.md`
- `docs/reviews/trainer-student-context-menu-simplification-20260817-implementation-review.md`

Pattern:
For dense operational repeaters, keep one visible overflow trigger and optionally add right-click/long-press acceleration over the same bounded surface. Render both menus from one command definition so labels, permissions, disabled/loading states, destructive treatment, and handlers cannot drift. Put static facts behind a Details command instead of writing facts into menu rows.

Applies when:
Implementing the approved classroom navigation, People rows, group rows, classmate rows, or resource cards.

Do not overgeneralize:
Do not wrap text editors, code, links, forms, or an entire page in a custom context-menu trigger; native browser commands remain important there.

## 2026-08-10 - Classroom Contest Provider Adapter

Source:
- `server/src/services/classroomContestRankService.ts`
- `server/src/services/codeforcesContestService.ts`
- `server/src/controllers/classroomContestController.ts`

Pattern:
When adding contest providers to classroom reports, isolate provider-specific fetch/sign/parse/rate-limit behavior in a service adapter, then normalize rows before controller persistence. Keep global provider routes unchanged unless the feature explicitly scopes them in. Use provider-prefixed contest keys in reports, canonical classroom identities for row merging, and provider-aware manual overrides for aliases.

Applies when:
Adding or changing classroom contest providers, report aggregation, snapshot contracts, provider-specific aliases, or ranking-source fetch services.

Do not overgeneralize:
This pattern is for classroom-private reports. It does not authorize reworking global contest rooms, public live reports, saved standings, or public standings providers without a separate decision.

## 2026-08-10 - Codeforces Classroom Fetching

Source:
- `server/src/services/codeforcesContestService.ts`
- `docs/reviews/trainer-classroom-codeforces-contests-20260810-implementation-review.md`

Pattern:
Resolve a validated numeric classroom Codeforces source to one fixed friends-standings path: regular IDs use `/contest/{id}/standings/friends/true` and high-number Gym IDs use `/gym/{id}/standings/friends/true`. Require the transient Codeforces web session for both, enforce timeout/response/page/concurrency limits, detect score/hacks versus solved/penalty layouts from headers and problem links, and discard rows outside explicit classroom target handles during parsing. When upsolves are explicitly enabled, crawl `/submissions/{handle}/contest/{id}` only for handles already present in the filtered standings; order rows by submission ID, subtract official rejected attempts, and upgrade only officially unsolved problems. Bound handles, pages, and concurrency and fail with `CODEFORCES_UPSOLVE_LIMIT` rather than returning a partial result.

Applies when:
Maintaining Codeforces standings fetches, public/Gym source routing, web-session handling, layout parsing, or classroom snapshot filtering.

Do not overgeneralize:
This historical crawler-specific pattern does not define the current API ordering. Do not crawl group/mashup or arbitrary paths, count unrelated friends, invent absent participants, or silently enable Codeforces upsolves.

## 2026-08-10 - Codeforces Unmapped Row Review

Source:
- `server/src/controllers/classroomContestController.ts`
- `client/src/components/ClassroomContestPanel.jsx`

Pattern:
Codeforces web fetches filter to verified or explicitly overridden classroom target handles before persistence. Existing handle overrides still resolve a returned handle to a classroom student/group or explicitly ignore it; `ignore` overrides have no student/group target and no `identityKey`.

Applies when:
Changing classroom Codeforces snapshot persistence, handle override targets, report generation, trainer mapping UI, or unmapped standings review.

Do not overgeneralize:
Do not add `ignore` as a student/group status, do not delete rows from snapshots to ignore them, and do not apply Codeforces unmapped-row behavior to global reports without a separate compatibility plan.

## 2026-08-10 - Discord Channel Moves Reprovision Mappings

Source:
- `server/src/controllers/discordController.ts`
- `server/src/utils/discordProvisioning.ts`
- `client/src/components/ClassroomDiscordSettingsCard.jsx`

Pattern:
When trainers need to change a classroom's Discord channel destination, revalidate current Discord Manage Server permission for the chosen guild, then update only MCC's binding/mapping rows in a short transaction and queue provisioning. Archive old active channel mappings, remove stale category mappings, clear `staff_channel_id`, and let the Discord worker create fresh exact-ID mappings. Do not accept typed channel names or IDs as routing authority.

Applies when:
Changing classroom Discord server/channel destination, recreating mapped channels, repair flows, or provisioning status counts.

Do not overgeneralize:
This pattern does not automatically delete Discord-side channels. Add deletion only through a separate explicit worker action with safe permission/capacity/error handling.

## 2026-08-10 - Admin Full User Import

Source:
- `server/src/controllers/classroomController.ts`
- `client/src/app/admin/trainers/TrainersManagementClient.js`

Pattern:
For admin-created platform users, keep CSV parsing and preview local, but treat the server as the authority for required fields, role flags, password length, URL shape, MIST ID shape, duplicate emails, and verified-handle consistency. Hash passwords before the insert statement, perform duplicate email checks in one indexed query, insert valid bulk rows with one batch insert, and return row-numbered errors for skipped rows.

Applies when:
Extending `/admin/trainers` account creation, adding user import columns, or building future admin batch mutations over `users`.

Do not overgeneralize:
Do not use this for classroom roster placeholder imports, large background migrations, invitation workflows, or imports that need file uploads. Do not trust client CSV preview as validation.

## 2026-08-09 - Classroom-Scoped Contest Clone

Source:
- `docs/reviews/trainer-classroom-contests-20260809-implementation-review.md`

Pattern:
When cloning a global workflow into classroom scope, give it its own lowercase tables, classroom-prefixed routes, classroom manager checks for mutations, and classroom-private share state. Reuse pure processing helpers where the payload contract must stay compatible, but keep persistence, authorization, and share destinations separate from the global workflow.

Applies when:
Adding classroom-specific variants of global contest/report tools, VJudge snapshots, report generation, or private classroom sharing.

Do not overgeneralize:
Do not point classroom operations at global report, demerit, saved-standings, public-share, or team-collection tables merely because the display payload is compatible.

Student-facing read paths:
Students may list only classroom contest rooms with `visible_to_students = true` reports, and may read only those shared classroom-private reports. Keep student views read-only, pass classroom highlight metadata into the report table, and keep global live-share controls disabled for classroom reports.

## 2026-08-09 - Post-Create External Binding Reuses Creation Invariants

Source:
- `docs/reviews/trainer-existing-classroom-discord-binding-20260809-implementation-review.md`

Pattern:
When an existing domain object gains an external integration after creation, expose the action from that object's authenticated settings surface, then call the same server-side binding/provisioning helper used by the creation flow. Reauthorize the actor for both the domain object and the exact external resource before the transaction; keep external provider calls outside the transaction; and queue asynchronous provisioning after the binding row is inserted.

Applies when:
Connecting existing classrooms to Discord or adding future post-create external integrations.

Do not overgeneralize:
Do not add public connect pages for private classroom mutations, do not duplicate creation defaults in the UI, and do not treat picker output as authorization.

## 2026-08-09 - Shared External Installation, Scoped Classroom Bindings

Source:
- `docs/adr/0013-shared-discord-guild-classroom-bindings.md`
- `docs/reviews/trainer-shared-discord-guild-classrooms-20260809-implementation-review.md`

Pattern:
Model an external platform installation once per external container and attach many domain-scoped bindings to it. Keep mutable rules, channel mappings, jobs, and failure state on the binding; route inbound work through exact external IDs; use stable domain-ID suffixes only when readable names would collide; and revalidate the actor's current external permission before accepting a posted installation/container ID.

Applies when:
Sharing a Discord guild across classrooms or designing another reusable external installation with tenant/classroom-scoped resources.

Do not overgeneralize:
Do not infer authorization from shared installation membership, labels, roles, or names. Do not merge domain data merely because bindings share an external container, and do not hold database locks across external network calls.

## 2026-08-09 - Focused Classroom People Workspace

Source:
- `docs/reviews/trainer-student-roster-apple-redesign-20260809-implementation-review.md`
- `docs/decisions/trainer-student-roster-apple-redesign-20260809-technical-decisions.md`

Pattern:
For classroom People surfaces, use a focused local switcher plus one quiet toolbar per view instead of parallel card columns. Put search, low-emphasis count, and one primary action in the toolbar; move dense add/import/create/edit forms into dialogs; render roster/group data as soft list rows with subtle separators; split show-more state by list; and keep destructive row actions behind overflow plus confirmation.

Applies when:
Refreshing trainer roster, student roster, group list, group member management, or similar classroom people-management surfaces.

Do not overgeneralize:
This does not replace comparison-heavy analytics matrices, thread panels, schedule cards, or global route navigation. Use this pattern for scan-and-manage people lists, not every classroom surface.

## 2026-08-02 - Discord Adapter Over Authoritative Classroom Services

Source:
- `docs/decisions/trainer-classroom-discord-integration-20260802-technical-decisions.md`
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`

Pattern:
Treat Discord as an adapter over MCC classroom state, not a parallel classroom system. Resolve Discord events through durable ID mappings and linked user records, call the same authorization and domain paths that web handlers use, write delivery jobs inside the database transaction, and let the worker perform Discord network calls after commit.

Applies when:
Adding Discord command handlers, reminder producers, provisioning repairs, submission/review actions from Discord, or new Discord notification events.

Do not overgeneralize:
Do not trust Discord channel names, role names, or message contents as authority; do not send website human message bodies outward; do not perform Discord REST calls inside classroom domain transactions.

## 2026-08-09 - Trusted Manual Discord Identity Uses Snowflakes

Source:
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`
- `docs/sql/trainer-classroom-discord-manual-links-20260809.sql`
- `server/src/controllers/discordController.ts`

Pattern:
When a classroom manager/admin manually verifies a student's Discord account, store the Discord user snowflake from an ID or @mention as the authority. Usernames, global display names, and notes are labels only. Manual/trusted rows use `connection_source = 'trusted_manual'`, `verified_at`, and `verified_by_user_id`; they do not store fake OAuth tokens and cannot power trainer guild selection or Discord Add Guild Member.

Applies when:
Changing Discord roster trusted-link UI, `discord_user_connections`, classroom access gating, provisioning, or future admin/import tooling that accepts Discord identities.

Do not overgeneralize:
Do not accept mutable Discord usernames as authorization identity. Do not treat a trusted/manual row as proof that MCC can auto-join the user to a guild; OAuth with `guilds.join` is still required for that.

## 2026-08-02 - Discord Submit/Review Modal References

Source:
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`
- `server/src/utils/discordCommandHandlers.ts`

Pattern:
Discord student submissions and trainer reviews should use short server-generated references shown by `/mcc problems` or `/mcc pending` instead of trusting titles or channel names. `/mcc submit` resolves `live:<uuid-prefix>` or `topic:<assignment-prefix>:<problem-prefix>` against the mapped classroom, linked Discord user, active private channel, and active assignment/enrollment state before writing the existing `pending_approval` submission rows and a student-thread system event. `/mcc review` resolves `live:<uuid-prefix>` or `topic:<progress-prefix>` against pending rows and trainer permissions before writing final verdict state plus a student-thread feedback event.

Applies when:
Changing Discord `/mcc submit`, Discord `/mcc review`, future Discord autocomplete, pending-review references, or website thread event mirroring for Discord-origin submissions/reviews.

Do not overgeneralize:
Do not store submitted code, notes, OAuth tokens, or message bodies in command audit metadata; audit only IDs, booleans, status/reason codes, and safe workflow metadata.

## 2026-08-09 - Discord Assign Autocomplete Plus Modal

Source:
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`
- `server/src/utils/discordCommandHandlers.ts`
- `server/src/workers/discordWorker.ts`

Pattern:
Discord trainer mutations that need both target selection and structured details should split stable identity selection into slash-command autocomplete options and put free-form details into a modal. `/mcc assign` uses `class:<uuid-prefix>` and `student:<uuid-prefix>` / `team:<uuid-prefix>` values for identity, re-resolves those refs against the mapped classroom before mutation, and writes assignment rows, thread system events, delivery jobs, and command audit inside the database transaction.

Applies when:
Adding Discord assignment variants, trainer-side Discord mutations, or autocomplete-backed command flows.

Do not overgeneralize:
Do not use autocomplete labels as authority, do not parse arbitrary usernames/channel names for identity, do not put network calls inside the database transaction, and do not store problem bodies or private notes in audit metadata.

## 2026-08-09 - Discord Classroom Channel Naming

Source:
- `server/src/utils/discordProvisioning.ts`
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`

Pattern:
Discord provisioning uses stable, human-recognizable but Discord-safe names. Student private channels follow the human convention `Student Name [Student ID]`, rendered as a lowercase slug such as `john-doe-2022001`; `users.mist_id` is the Student ID, and the first eight characters of the MCC user UUID are the fallback when `mist_id` is missing. Staff channels and student category shards use the classroom slug by default, for example `mcc-advanced-cp-staff` and `advanced-cp-students-01`; if another bound classroom in the same guild normalizes to the same classroom slug, append the first eight characters of the MCC classroom UUID before `staff`/`students-01`. Student categories hold up to 45 active student channels before creating `02`, `03`, etc.

Applies when:
Changing Discord provisioning, Repair/reconcile behavior, student channel creation, category sharding, or roster naming.

Do not overgeneralize:
Channel names remain display/recovery aids only. Authorization must continue to use exact Discord snowflakes, channel IDs, classroom bindings, and MCC user IDs rather than names.

## 2026-08-02 - Single Classroom Creation Wizard

Source:
- `docs/reviews/trainer-classroom-discord-integration-20260802-implementation-review.md`
- `client/src/components/CreateClassroomWizard.jsx`

Pattern:
When classroom creation needs feature-gated integration steps, centralize it in one reusable wizard and embed that wizard from every create entry point. Keep Details first, integration-specific setup second, automation/defaults last, and let feature-disabled mode collapse back to the simple details form.

Applies when:
Changing trainer dashboard classroom creation, classroom list creation, future onboarding banners, or additional classroom setup steps.

Do not overgeneralize:
Do not add separate top-level creation forms that bypass Discord enforcement or duplicate async validation logic.

## 2026-08-02 - Opaque Realtime Invalidation With Incremental Fetch

Source:
- `docs/reviews/trainer-student-thread-realtime-hardening-performance-20260802-implementation-review.md`
- `docs/decisions/trainer-student-thread-realtime-hardening-performance-20260802-technical-decisions.md`

Pattern:
For classroom student-thread Realtime, issue short-lived opaque channel names from authorized server routes, broadcast compact invalidation payloads containing only IDs and timestamps, then use JWT-authorized API routes to fetch the changed message or thread summary. Keep a full refresh fallback for malformed signals or fetch failures.

Applies when:
Changing student-thread Realtime delivery, trainer thread-list updates, message fan-out, attachment delivery, or thread fetch helpers.

Do not overgeneralize:
This is a student-thread pattern, not a mandate for unrelated realtime features or a substitute for Supabase private channels if a future approved JWT bridge is implemented.

## 2026-08-02 - Scoped Student-Thread Realtime Work

Source:
- `docs/tasks/trainer-student-thread-realtime-hardening-performance-20260802-task-plan.md`

Fact:
Student-thread realtime hardening should be implemented serially because database grants/indexes, server channel issuance, broadcast fan-out, attachment ordering, and client incremental fetches all share the same conversation contract and overlapping files.

Applies when:
Changing trainer/student classroom thread realtime, scoped channel names, message/list invalidation payloads, thread attachment delivery, or thread read APIs.

Do not overgeneralize:
This is not a global realtime architecture mandate and does not authorize hidden polling or broad Supabase RLS remediation outside the approved student-thread scope.

## 2026-08-02 - Compact Trainer Operations UI

Source:
- `docs/reviews/trainer-compact-ui-cleanup-20260802-implementation-review.md`

Pattern:
For trainer route dashboards and form workspaces, prefer compact command headers, metric strips, static semantic attention strips, dense operation items, bounded supporting panels, and icon-only secondary controls over tall repeated cards, pulsing badges, and always-visible explanatory text.

Applies when:
Refreshing trainer dashboard, trainer form builder, trainer form detail, or other repeated-use trainer operational surfaces.

Do not overgeneralize:
This pattern is for authenticated trainer operations. Student learning dashboards, public landing pages, and reading-focused resource pages may need different hierarchy and density.

## 2026-08-01 - Submission-Context Bubble Reuse

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Pattern:
Render floating student-thread bubbles by reusing the same thread panel, composer, attachment flow, realtime state, and message renderer used by the normal `Threads` tab. Pass an optional submission reference into the shared send path rather than duplicating a bubble-only chat implementation.

Applies when:
Adding floating conversation surfaces, contextual chat launchers, or trainer review discussion flows.

Do not overgeneralize:
Do not turn this into a global messaging framework unless multiple non-classroom domains need the same behavior.

## 2026-08-01 - Server-Validated Submission Reference Metadata

Source:
- `docs/decisions/trainer-submission-thread-bubbles-20260801-technical-decisions.md`
- `docs/adr/0009-student-thread-submission-reference-metadata.md`

Fact:
When a student-thread message is tied to a pending submission, accept only a compact client reference request and resolve the persisted `submission_reference` metadata server-side from authoritative live or topic submission rows. Validate classroom, selected student, source type, and `pending_approval` status before inserting the message or attachment.

Applies when:
Adding submission-context chat, floating bubbles, message metadata, or trainer review discussion features.

Do not overgeneralize:
Submission references are display context, not grading authority; do not store solution code, hidden notes, storage paths, or cross-student data in message metadata.

## 2026-08-01 - trainer-submission-thread-bubbles-20260801 - Serial Bubble Work

Source:
- `docs/tasks/trainer-submission-thread-bubbles-20260801-task-plan.md`

Fact:
Submission-referenced thread bubbles should be implemented serially because server validation, `ClassroomThreadsTab.js`, floating dock behavior, and `ClassroomLiveClient.js` pending-submission entry points share the same student-thread conversation model.

Applies when:
Coordinating changes to pending-submission discussion, student-thread bubbles, message metadata, or classroom thread panels.

Do not overgeneralize:
This does not require serial work for unrelated trainer UI-only tasks with disjoint write scopes.

## 2026-07-31 - trainer-student-classroom-threads-realtime-20260731 - Serial Student Thread Work

Source:
- `docs/tasks/trainer-student-classroom-threads-realtime-20260731-task-plan.md`

Fact:
Student-thread realtime work should be implemented serially because schema utilities, `classroomController.ts`, `classroomRoute.ts`, `ClassroomLiveClient.js`, Updates/Settings placement, legacy problem-thread cleanup, attachment validation, and event fan-out all share classroom communication semantics and overlapping files.

Applies when:
Coordinating classroom student-thread implementation, realtime thread APIs, attachment handling, event bubbles, Updates/Settings placement, or old problem-thread UI cleanup.

Do not overgeneralize:
This serial plan does not approve broad unrelated classroom refactors, destructive legacy thread migration, or bypassing approved RSD/decision gates.

## 2026-07-27 - Explicit SQL Parameter Type Casting & Null Handling Pattern

Source:
- `docs/rsd/trainer-feature-schedule-topics-verification-studentui-20260727-rsd.md`

Fact:
When executing SQL updates in Hono / Bun PostgreSQL controllers where parameters can evaluate to `null` or `undefined` (such as `solved_at` on submission rejection or optional trainer review notes), parameters MUST be explicitly cast in SQL statements (e.g. `${nextStatus}::text`, `${solvedAt}::timestamptz`, `${feedbackText}::text`) or branched into clean query paths to prevent PostgreSQL parameter type inference errors (`could not determine data type of parameter $N`).

Applies when:
Updating submission progress, approval/rejection endpoints, or optional metadata fields in PostgreSQL controllers.

Do not overgeneralize:
Does not alter contest problem evaluation or third-party online judge auto-grading.

## 2026-07-27 - trainer-feature-futureproof-crud-schedule-submission-20260727 - Approved Work Plan

Source:
- `docs/tasks/trainer-feature-futureproof-crud-schedule-submission-20260727-task-plan.md`

Fact:
Implementation should proceed serially through server topic CRUD gap endpoints, client topic CRUD UI, bounded People/Groups member display, session edit end-time duration calculation, code-or-link submissions with highlighted trainer review, then verification/review docs.

Applies when:
Coordinating or reviewing this trainer classroom change set.

Do not overgeneralize:
This plan does not approve migrations, dependencies, code execution, external judge verification, or unrelated trainer UI redesign.

## 2026-07-27 - trainer-student-tabs-schedule-time-20260727 - Datetime-Local Submit Pattern

Source:
- `docs/reviews/trainer-student-tabs-schedule-time-20260727-implementation-review.md`

Fact:
For classroom schedule forms using `<input type="datetime-local">`, convert the input value to `Date#toISOString()` in the browser before POST, and validate/normalize again server-side before persisting.

Applies when:
Adding or modifying class/session schedule create/edit forms, especially when stored timestamps are later displayed with `Date` and `toLocale*` helpers.

Do not overgeneralize:
Date-only fields or intentionally timezone-free labels should not use this pattern without a separate requirement.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Serial Roster Identity Work

Source:
- `docs/tasks/trainer-pre-enrolled-students-20260727-task-plan.md`

Fact:
Pre-enrolled classroom student work should be implemented serially because schema/status helpers, `classroomController.ts`, `ClassroomLiveClient.js`, auth/profile matching, trainer forms, and IDE/classroom access checks share the same roster identity and membership-status semantics.

Applies when:
Changing pre-enrolled students, roster membership states, classroom student access, signup/profile claim detection, or trainer-side student selection workflows.

Do not overgeneralize:
Other trainer/classroom UI-only tasks can still run in parallel when write scopes are disjoint and do not share access semantics.

## 2026-07-27 - trainer-pre-enrolled-students-20260727 - Missing Account Review Modal Pattern

Source:
- `docs/reviews/trainer-pre-enrolled-students-20260727-implementation-review.md`

Fact:
When trainer batch/manual enrollment detects existing accounts and missing accounts together, commit active existing accounts first, then open a review modal for missing rows with editable required names, optional emails, a security note, and one batch pre-enrollment confirmation request.

Applies when:
Extending classroom People import, adding future roster imports, or handling mixed success/missing results in trainer bulk workflows.

Do not overgeneralize:
This pattern is for roster identity creation; problem assignment and other imports should not create placeholder domain records unless approved separately.

## 2026-07-27 - trainer-live-progress-design-refresh-20260727 - Operational Table Refresh Pattern

Source:
- `docs/reviews/trainer-live-progress-design-refresh-20260727-implementation-review.md`

Fact:
For trainer operational tables inside `ClassroomLiveClient.js`, prefer full-width table-fixed layouts with explicit columns, compact summary metrics above rows, row-level state tinting, and action chips for review workflows instead of inline links that compete with primary item titles.

Applies when:
Refreshing trainer live progress, review queues, or dense classroom workflow tables.

Do not overgeneralize:
Do not introduce global table abstractions unless multiple pages share the same structure and behavior.

## 2026-07-26 - student-challenge-submission-duration-20260726 - Student Proof, Trainer Verdict Pattern

Source:
- `docs/reviews/student-challenge-submission-duration-20260726-implementation-review.md`

Fact:
For live-class problem attempts, student UI should collect proof and request `pending_approval`; server code must preserve trainer-owned final verdicts unless `canManageClassroom` passes. Student difficulty/proof updates can be allowed without giving students control of `solved`, `tried`, or `not_solved`.

Applies when:
Adding or modifying live-class problem status flows, proof submission UI, or trainer review controls.

Do not overgeneralize:
This pattern is for `class_problems` live-class assignments; topic progress has separate assignment/progress tables and handlers.

## 2026-07-26 - trainer-bulk-import-feedback-notifications-20260726 - Local CSV Mapping Pattern

Source:
- `docs/reviews/trainer-bulk-import-feedback-notifications-20260726-implementation-review.md`

Fact:
Trainer bulk imports use browser-side CSV parsing, explicit column mapping, local preview/error counts, then one structured batch API call. Required mappings are blocked before mutation, and server endpoints still revalidate authorization and classroom targets.

Applies when:
Adding future trainer CSV imports or extending current student/problem import flows.

Do not overgeneralize:
This pattern is for small-to-medium CSV imports in trainer UI, not large background data migrations or `.xlsx` files.

## 2026-07-26 - trainer-qa-fixes-20260726 - QA Fix Work Slicing

Source:
- `docs/tasks/trainer-qa-fixes-20260726-task-plan.md`

Fact:
When trainer QA findings span server policy, form analytics, and classroom client UI, split work by disjoint write scopes: classroom server/resource policy, trainer form detail analytics, and classroom UI copy/validation/board.

Applies when:
Coordinating parallel agents for broad trainer/classroom defect repair.

Do not overgeneralize:
If `ClassroomLiveClient.js` changes overlap heavily with server behavior, integrate serially instead of giving overlapping write scopes.

## 2026-07-25 - Navigation Uses Profile-Derived Role Flags

Source:
- `client/src/components/Navbar.js`

Fact:
Navbar reads `auth/user/profile`, derives `isLoggedIn`, `isAdmin`, and `isTrainer`, then renders top-level and role-specific links from small link arrays.

Applies when:
Changing visibility of navigation entries by user role.

Do not overgeneralize:
Route authorization still belongs in route/page guards and server controllers; hiding a nav item is not an authorization control.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Shared Role Predicate Inside Navbar

Source:
- `docs/tasks/hide-classrooms-tab-for-trainers-task-plan.md`

Fact:
When desktop and mobile navbar sections need the same simple role condition, define a local boolean in `Navbar.js` and reuse it in both render branches.

Applies when:
A small role visibility rule must stay consistent between desktop navbar and mobile sheet menu.

Do not overgeneralize:
Keep the predicate local unless more components need the same rule.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Trainer Dashboard Predicate

Source:
- `client/src/components/Navbar.js`
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

Fact:
`canUseTrainerDashboard` is the local navbar predicate for users with trainer or admin access.

Applies when:
Adding or hiding navbar items tied to Trainer Dashboard access.

Do not overgeneralize:
This is not a route authorization helper.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Hide Browser AI Volatility

Source:
- `docs/decisions/trainer-dashboard-ai-resource-writing-assistant-technical-decisions.md`

Fact:
Superseded for classroom/resource authoring by `classroom-resource-reader-problem-preview-20260725`: browser-side WebGPU/model lifecycle is no longer part of trainer classroom/resource authoring.

Applies when:
Adding or adjusting trainer AI writing assistance.

Do not overgeneralize:
Do not apply this to current classroom/resource authoring unless AI is re-approved later.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Serial Resource AI Work

Source:
- `docs/tasks/trainer-dashboard-ai-resource-writing-assistant-task-plan.md`

Fact:
Trainer AI writing, markdown resource editing, resource schema, and resource rendering share package/component/API files, so this task should run serially in the main workspace rather than split across parallel worktrees.

Applies when:
Implementing the approved trainer dashboard AI resource writing assistant plan.

Do not overgeneralize:
Future trainer/classroom work can still use parallel worktrees when write scopes are disjoint.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Trainer Writing Assistant Boundary

Source:
- `docs/reviews/trainer-dashboard-ai-resource-writing-assistant-implementation-review.md`

Fact:
Superseded for classroom/resource authoring by `classroom-resource-reader-problem-preview-20260725`: `client/src/lib/trainer-writing-ai.js` and `TrainerWritingAssistant` were removed.

Applies when:
Changing trainer AI draft behavior for classroom/resource authoring.

Do not overgeneralize:
Do not import or reference removed trainer AI helpers in classroom/resource code.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - UI-Only Trainer Refresh Boundary

Source:
- `docs/tasks/trainer-mode-ui-refresh-20260725-task-plan.md`

Fact:
For trainer-mode design refreshes, preserve existing handler/state/API shapes and change JSX structure, Tailwind classes, local display constants, and small presentational helpers only.

Applies when:
Redesigning `/trainer/dashboard`, `/trainer/forms`, or `/trainer/forms/[id]` without workflow changes.

Do not overgeneralize:
If a task changes business process, route paths, data shape, or authorization, create new technical decisions and broader verification.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Local Presentation Helpers

Source:
- `docs/reviews/trainer-mode-ui-refresh-20260725-implementation-review.md`

Fact:
For large trainer UI files, small local helpers such as section titles, metric tiles, icon buttons, tabs, draft rows, and empty states can reduce repeated JSX without creating a global design-system abstraction.

Applies when:
Cleaning up repeated presentation markup inside a single trainer page component.

Do not overgeneralize:
Promote helpers to shared components only when multiple files need the same behavior and the interface stays meaningful.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Swiss UI Local Helpers

Source:
- `docs/decisions/swiss-minimal-learning-ui-refresh-20260725-technical-decisions.md`

Fact:
For this Swiss minimal refresh, add only small local presentational helpers/constants when they reduce repeated JSX or clarify repeated status, section, metric, tab, or empty-state UI without hiding behavior logic.

Applies when:
Editing `TrainerDashboardClient.js`, `ClassroomListClient.js`, `ClassroomLiveClient.js`, or `MyDashboardClient.js`.

Do not overgeneralize:
Do not split behavior into new modules or create global design-system abstractions in this task.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Demote Empty Future Sections

Source:
- `docs/reviews/swiss-minimal-learning-ui-refresh-20260725-implementation-review.md`

Fact:
When a student dashboard section has no live data yet, keep it as a small low-emphasis status strip instead of a primary tab/panel.

Applies when:
Reducing noise in `/my_dashboard` or similar student operational pages.

Do not overgeneralize:
Do not demote sections that contain current required actions, errors, verification status, or assigned work.

## 2026-07-25 - past-class-detail-visualization-20260725 - Separate Live And Past Problem State

Source:
- `docs/tasks/past-class-detail-visualization-20260725-task-plan.md`

Fact:
Classroom live pages should keep active live problem state separate from selected past-class problem state so polling and review views do not overwrite each other.

Applies when:
Adding completed-class summaries, history panels, or review views inside `ClassroomLiveClient.js`.

Do not overgeneralize:
This is a local classroom-live pattern, not a global state-management rule.

## 2026-07-25 - trainer-class-tags-chat-shadcn-refresh-20260725 - Dictionary Plus Array Tags

Source:
- `docs/decisions/trainer-class-tags-chat-shadcn-refresh-20260725-technical-decisions.md`

Fact:
For classroom problem topics, use a dictionary table for suggestions/create-new UX while keeping assignment rows as normalized `text[]` tags until a broader relational tag model is approved.

Applies when:
Adding tag selectors, tag filters, or tag normalization around `class_problems`.

Do not overgeneralize:
Do not apply this to achievement tags, course content, or other domains without checking their existing storage model.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Preview Before Assign

Source:
- `docs/tasks/classroom-resource-reader-problem-preview-20260725-task-plan.md`

Fact:
Problem assignment should use an explicit preview action that calls the server metadata scraper, then shows the trainer what students will see before assignment.

Applies when:
Changing trainer problem assignment, metadata scraping, or student challenge-card previews.

Do not overgeneralize:
Do not scrape on every keystroke; keep fetch timing user-controlled unless telemetry later justifies automatic preview.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Client-Side List First

Source:
- `docs/tasks/classroom-resource-reader-problem-preview-20260725-task-plan.md`

Fact:
For classroom live lists, start with bounded scroll areas and incremental display counts before changing API contracts to server pagination.

Applies when:
Handling resources, live problems, history, students, or teams in `ClassroomLiveClient.js`.

Do not overgeneralize:
Very large classrooms may still need server pagination later.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Topic Unit Before Team Assignment

Source:
- `docs/rsd/classroom-team-topic-board-chat-20260725-rsd.md`

Fact:
Trainer topic workflow should present "build topic unit" before "assign to team", so resources and problems feel prebuilt rather than tied to a single live class form.

Applies when:
Designing classroom topic libraries, team assignment tabs, or trainer problem/resource setup flows.

Do not overgeneralize:
This does not require importing an external topic taxonomy or making topics public outside their approved classroom/trainer scope.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Isolate Browser IDE Logic

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
Keep CodeMirror/editor telemetry logic in `client/src/app/classroom/live/[id]/ClassroomIdePanel.jsx` and integrate it into `ClassroomLiveClient.js` through dynamic client-only components.

Applies when:
Extending student IDE access, trainer monitor views, autocomplete, or coming-soon runner controls.

Do not overgeneralize:
General classroom UI can stay in `ClassroomLiveClient.js`; this pattern is for browser-editor internals that would bloat the live page.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Derive Member Work Locally

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
The trainer Teams dashboard can derive per-member work and a problem/member matrix from existing active `problems`, `topicAssignments`, and topic `progressRows` without a new endpoint when the classroom live page already has those datasets.

Applies when:
Showing who is solving which live/topic problem inside `/classroom/live/[id]`.

Do not overgeneralize:
Large classrooms may need server-side pagination or a dedicated dashboard endpoint later.

## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Poll After Explicit Selection

Source:
- `docs/tasks/trainer-ide-tracking-team-edit-20260725-task-plan.md`

Fact:
Live trainer monitors that can be expensive should require an explicit selected target before starting short-interval polling.

Applies when:
Building trainer views for IDE activity, per-student telemetry, or similar live monitoring.

Do not overgeneralize:
Low-cost classroom summary polling can remain periodic when it supports the main live-class surface.

## 2026-07-26 - trainer-logout-option - Shared Logout Action Across Profiles & Navbar

Source:
- `client/src/app/trainer/profile/page.js`
- `client/src/app/trainer/profile/TrainerProfileClient.jsx`
- `client/src/components/Navbar.js`

Fact:
All profile pages (`/profile`, `/trainer/profile`) and global mobile sheet navigation must provide a clear Logout button bound to the shared `logout` server action in `client/src/lib/action.js`.

Applies when:
Adding or modifying role-specific profile pages or navigation components.

Do not overgeneralize:
Do not duplicate token deletion logic in individual page handlers; always reuse `@/lib/action.js#logout`.
## 2026-07-29 - Classroom Updates Read Receipts

Source:
- `docs/reviews/trainer-updates-problem-threads-20260728-implementation-review.md`

Pattern:
Generate stable `update_key` values on the server for the current authorized classroom feed, then validate mark-read requests against that visible key set before writing receipts. Mark-all-read should derive keys server-side from the same feed builder.

Applies when:
Adding new classroom update types or read/unread controls.

Do not overgeneralize:
Do not trust arbitrary client-provided update keys, and do not create page-load side effects such as email sends while deriving the feed.

## 2026-07-31 - Student Thread Event Bubbles

Source:
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`

Pattern:
Mirror successful classroom mutations into student-thread system bubbles through shared helpers. Fan out only to active real affected students, exclude trainer/admin/pre-enrolled identities, keep event bodies concise, and place sensitive details such as solution code in the original authorized workflow rather than the event metadata.

Applies when:
Adding new classroom actions that should appear in trainer-student conversation history.

Do not overgeneralize:
System bubbles are conversation history, not a second grading/status authority.

## 2026-07-31 - Private Classroom Attachment Access

Source:
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`

Pattern:
Upload classroom thread attachments through authenticated server endpoints, validate extension/MIME/size server-side, store only private bucket/path metadata, and generate short-lived signed URLs only after rechecking thread authorization.

Applies when:
Adding classroom file sharing, download/open controls, or private learning artifacts.

Do not overgeneralize:
Public image upload helpers such as profile/achievement uploads are not suitable for private classroom thread files.

## 2026-08-02 - Private Realtime Fast Path With Durable Catch-Up

Source:
- `docs/reviews/trainer-student-thread-instant-realtime-20260802-implementation-review.md`

Pattern:
For private low-latency application streams, authorize a receive-only private topic, publish the safe canonical committed projection directly, attach a monotonic aggregate revision, and run bounded database catch-up after every actual subscribe/re-subscribe. Deduplicate by persisted ID and reconcile optimistic writes by a server-enforced client ID.

Applies when:
Building private chat/activity delivery where the UI must feel instant but Broadcast cannot be the durable source of truth.

Do not overgeneralize:
Do not put secrets, private Storage paths, or fields outside the recipient's normal API projection into the Broadcast payload; use an authorized API for those values.

## 2026-08-29 - Contest Report Scoring Pipeline

Source:
- `server/src/services/contestFormula.ts`
- `server/src/services/contestScoringService.ts`
- `client/src/components/ContestScoringDialog.jsx`

Pattern:
Keep contest report scoring server-owned. Store complete scoring configs with formula, precision, sort ladder, exclusions, drop-worst, and merge groups; preview and saved reports must run through the same `buildScoredContestReport` path. Persist `scoring_config_version` on generated snapshots and mark existing snapshots stale when a config changes. UI may edit configs and preview traces, but it must not recalculate authoritative ranks independently.

Applies when:
Adding formula variables, merge/composite result units, rank tie-breakers, public report publication, or classroom contest report generation.

Do not overgeneralize:
Renderer-only formatting, search, export, highlighting, and profile enrichment can stay in the client. Score-changing filters belong in the persisted scoring config, not in report display components.

## 2026-08-29 - Composite Formula Display Outside Editor

Source:
- `client/src/components/ContestMergeOverview.jsx`
- `client/src/components/ContestScoringDialog.jsx`
- `server/src/services/contestScoringService.ts`

Pattern:
Keep merge configuration editing in `ContestScoringDialog`, but show saved composite group membership plus solved-score and penalty-score formulas on the surrounding manager page with a read-only overview. Use the composite's result key for identity/display, while formulas use sheet-style row metrics such as `sum(raw_score)`, `sum(penalty)`, `raw_score(0)`, and `sum(demerits where title contains "TFC")`.
Make the overview collapsible and let the group cards auto-fit available width, so a room with many composites stays scannable and a room with one composite does not leave a large empty column.

Applies when:
Adding merge-group scan views, formula editors, scoring previews, or classroom/global contest management UI.

Do not overgeneralize:
Do not duplicate the scoring engine in the overview or report renderers. The overview should explain saved state only; score previews and rank changes must come from the server scoring endpoint.

## 2026-08-29 - Sheet Formula Snippets and Explainers

Source:
- `client/src/components/ContestScoringDialog.jsx`
- `client/src/components/ContestFormulaExplainer.jsx`
- `server/src/services/contestFormula.ts`

Pattern:
Formula editors should provide pasteable sheet-style snippets, metric chips, filter-field chips, and a compact visual explainer for aggregate behavior. Use Framer Motion only for explanatory client-side motion and keep authoritative scoring in the server evaluator.

Applies when:
Changing scoring formula UX, formula examples, formula preview affordances, or manager-facing scoring dialogs.

Do not overgeneralize:
Do not make the explainer calculate live ranks, and do not make browser-side formula preview authoritative.

## 2026-08-29 - Paired Ranking Outputs With Compatibility Aliases

Source:
- `server/src/services/contestScoringService.ts`
- `docs/sql/contest-report-score-pair-v2-20260829.sql`

Pattern:
When evolving one persisted ranking value into a primary value plus tie-breaker, store and evaluate both explicitly, rank on unrounded outputs, and keep old field names as read/write aliases during migration. Backfill the primary formula from the legacy formula and give the new tie-breaker a behavior-preserving default.

Applies when:
Splitting an existing score contract, adding formula-driven tie-breakers, or evolving generated snapshots without breaking older readers.

Do not overgeneralize:
Compatibility aliases are transitional API support, not permission to maintain two independent sources of truth.
# 2026-09-01 - Admin Readiness Analytics and Safe CSV Export

Pattern:
For admin exports over user data, keep classification and completeness rules in one admin-authorized server query, return only the row fields required by the tool, and derive all aggregates from the same snapshot. Generate a filtered browser CSV by quoting every field, adding a UTF-8 BOM, and neutralizing values that begin with spreadsheet formula characters. Pair visual charts with visible counts and descriptive accessible labels.

For MCC student profile readiness specifically, classify batch from the student ID rather than `batch_name`: use characters 3–4 for exactly 9 digits, or the first 2 characters for 2–8 digits. Treat other lengths as unclassified.

Applies when:
Adding another protected profile/readiness export or small-to-medium admin CSV download.

Do not use when:
The export needs background processing, durable file storage, audit history, very large datasets, or public access.
## 2026-09-02 - Structured Score Adjustments

Source:
- `server/src/services/contestScoringService.ts`
- `client/src/components/ContestScoringDialog.jsx`
- `docs/sql/contest-score-adjustment-rules-20260902.sql`

Pattern:
Represent common score corrections as bounded, ordered data rather than rewriting formulas or executing user code. Apply rules to result-unit metrics in the authoritative server pipeline before drop-worst and final formulas, normalize them before persistence, and include before/after entries in preview traces. Keep global/admin defaults empty. Classroom/trainer may use a scoped policy default such as `penalty × 0`; backfills must increment the config version and mark affected generated reports stale.

Applies when:
Adding another scoring correction field, operation, scope, or trace renderer.

Do not overgeneralize:
Do not apply these adjustments in report components, provider snapshots, or manual solve/de-merit persistence.
