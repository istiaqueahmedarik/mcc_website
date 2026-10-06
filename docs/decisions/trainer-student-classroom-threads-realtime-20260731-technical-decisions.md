# Trainer Student Classroom Threads Realtime Technical Decisions

Status: Approved
Task ID: trainer-student-classroom-threads-realtime-20260731
Last updated: 2026-07-31
Delivery mode: Manual

## Mode and Gate Results

RSD gate was approved by the user on 2026-07-31. Technical decisions and ADR-0008 were approved by the user on 2026-07-31.

Gates waited on:
- RSD approval.
- Technical decisions and ADR approval.

Gates not yet satisfied:
- Full task plan and dependency graph approval.
- Implementation review before final merge.

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-student-classroom-threads-realtime-20260731-rsd.md`
  Used for: approved requirements
  Evidence: add `Threads`, keep `Updates` first/default, add `Settings`, use one thread per student, safe file sharing, Supabase Realtime, and system event bubbles.
  Confidence: High
- Source: `AGENTS.md`
  Used for: gate policy and verification expectations
  Evidence: repository requires approval after technical decisions and before task planning.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: current classroom communication implementation state
  Evidence: existing Updates/problem-thread implementation touches `ClassroomLiveClient.js`, `UpdatesTab.js`, `ProblemThread.js`, `PrioritySettings.js`, `classroomController.ts`, `classroomRoute.ts`, `userController.ts`, `userRoute.ts`, and `classroomUpdatesSchema.ts`.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`
  Used for: compatibility constraints
  Evidence: Updates is notification/read-state only, classroom live should avoid polling, and old generic chat removal did not authorize destructive data cleanup.
  Confidence: High
- Source: `docs/knowledge-base/patterns.md`
  Used for: read receipt and classroom live patterns
  Evidence: stable update keys are generated server-side and no hidden classroom live polling should be added.
  Confidence: High
- Source: `docs/knowledge-base/quality-rules.md`
  Used for: maintainability constraints
  Evidence: thread UI should be lazy and authorization must remain server-owned.
  Confidence: High
- Source: `docs/adr/0007-classroom-problem-thread-update-model.md`
  Used for: superseded thread model boundary
  Evidence: old accepted model used problem-scoped threads and explicitly kept Updates non-realtime.
  Confidence: High
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: UI integration decisions
  Evidence: trainer and student tab state already defaults to `updates`; existing `PrioritySettings` is rendered inside `Updates`, and old problem thread buttons open floating problem-thread bubbles.
  Confidence: High
- Source: `client/src/components/ProblemThread.js`
  Used for: old thread UI replacement decision
  Evidence: current component loads one problem thread by `problemId` and posts HTTP messages without realtime or attachments.
  Confidence: High
- Source: `client/src/components/FloatingThreadDock.js`
  Used for: old thread UI replacement decision
  Evidence: current floating dock keeps multiple problem-thread bubbles, reinforcing the confusing problem-first mental model.
  Confidence: High
- Source: `client/src/components/UpdatesTab.js`
  Used for: Updates preservation decision
  Evidence: current Updates component supports load, refresh, mark one read, mark all read, unread state, and fixed update labels.
  Confidence: High
- Source: `client/src/components/PrioritySettings.js`
  Used for: Settings tab decision
  Evidence: current priority reorder and classroom email toggle already exist as a component but are embedded under Updates.
  Confidence: High
- Source: `client/src/hooks/use-supabase-realtime.ts`
  Used for: realtime strategy
  Evidence: existing Supabase Realtime use is a broadcast pattern for typing rooms, not classroom-authenticated private chat.
  Confidence: High
- Source: `client/src/utils/supabase/client.js`
  Used for: realtime dependency availability
  Evidence: client Supabase uses public URL and anon key.
  Confidence: High
- Source: `https://supabase.com/docs/guides/realtime/authorization`
  Used for: realtime authorization decision
  Evidence: Supabase Realtime private channels require authorization policies on `realtime.messages`, and channel permissions are calculated from RLS, JWT claims, request headers, and topic.
  Confidence: High
- Source: `https://supabase.com/docs/guides/realtime/broadcast`
  Used for: broadcast/invalidation strategy
  Evidence: Supabase Broadcast supports JSON payloads and requires Realtime Authorization by default for protected data.
  Confidence: High
- Source: `https://supabase.com/docs/guides/realtime/concepts`
  Used for: channel model and private/public channel distinction
  Evidence: Realtime channels are topic-based, and private channels require Realtime Authorization.
  Confidence: High
- Source: `https://supabase.com/docs/guides/storage`
  Used for: attachment storage strategy
  Evidence: Supabase file buckets support documents/general files with direct URL access and row-level security.
  Confidence: High
- Source: `https://supabase.com/docs/reference/javascript/v1/storage-from-createsignedurl`
  Used for: private attachment access strategy
  Evidence: Supabase Storage supports signed URLs for fixed-duration file access when object select permission allows it.
  Confidence: Medium
- Source: `client/src/lib/action.js`
  Used for: file upload caution
  Evidence: existing `uploadImage` helper uploads to public storage URLs and is not suitable for private classroom attachments.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: API and event source decisions
  Evidence: current problem-thread helpers, update generation, submission mirroring, and email queueing are implemented in this controller; final verdict protection lives in existing status endpoints.
  Confidence: High
- Source: `server/src/routes/classroomRoute.ts`
  Used for: route placement
  Evidence: classroom APIs are JWT-secured and already include Updates/problem-thread routes under `/classroom/:id`.
  Confidence: High
- Source: `server/src/utils/classroomUpdatesSchema.ts`
  Used for: schema placement
  Evidence: current runtime schema helper owns user settings, problem-thread tables, reactions, and read receipts.
  Confidence: High
- Source: `references/hci-design-rules.md`
  Used for: UI/HCI decisions
  Evidence: discoverability, feedback, visible state, mapping, constraints, error recovery, and accessibility are blocking checks.
  Confidence: High
- Source: `references/code-quality-rules.md`
  Used for: module boundary and complexity decisions
  Evidence: keep interfaces small, hide volatile implementation details, avoid speculative abstractions and destructive unrelated churn.
  Confidence: High

## Context

The prior implementation changed MCC from generic classroom chat to per-problem threads plus a first/default `Updates` tab. The user now says the current thread system for trainer/student is confusing and wants a dedicated `Threads` tab with one classroom chat per student. This is a material product-model change, not just a visual refresh. The implementation must preserve the useful parts of Updates and priority settings while replacing the visible problem-thread mental model with a simpler student-thread model.

## Decisions

### TD-001: Keep Updates First, Add Threads and Settings as Separate Tabs

Decision:
Keep `Updates` as the first/default tab for trainers and students. Add `Threads` as a dedicated classroom tab. Add `Settings` as a dedicated classroom tab and move priority ordering plus classroom update email controls there.

Options considered:
- Make `Threads` first/default.
- Keep priority settings inside `Updates`.
- Keep `Updates` first/default and split `Threads`/`Settings` into separate tabs.

Rationale:
The user explicitly said Updates is basically notification and the first page trainer or student should see. Moving settings out of Updates reduces notification-page clutter and matches the user's request for a settings tab.

Tradeoffs:
Settings becomes one more tab, but the first screen becomes calmer and clearer.

Security and privacy impact:
No direct security impact. The visible tab split reduces the chance that users treat Updates as a chat entry point.

Testing impact:
Manual tab-order checks for trainer and student. Verify `trainerTab` and `studentTab` still initialize to `updates`.

HCI impact:
Clear labels reduce the execution gulf: `Updates` means notifications, `Threads` means conversation, `Settings` means preferences.

Code-quality impact:
Use existing tab state and components instead of introducing a navigation framework.

Rollback or migration:
Remove the new tab triggers/content and place `PrioritySettings` back under `Updates`.

ADR required: No.

### TD-002: Create New Student-Scoped Thread Tables Instead of Reusing Problem Threads

Decision:
Add a first-class student-thread schema:

- `classroom_student_threads`: one row per `(classroom_id, student_id)`, with `created_at`, `updated_at`, and optional status metadata.
- `classroom_student_thread_messages`: human chat and system event bubbles, with `thread_id`, `sender_id` nullable for system events, `kind`, `event_type`, `body`, `metadata jsonb`, and timestamps.
- `classroom_student_thread_attachments`: private attachment metadata tied to a message/thread, including storage bucket/path, original filename, content type, size, and uploader.

Do not reuse `classroom_problem_threads` as the primary UI model.

Options considered:
- Reuse `classroom_problem_threads` and group them by student.
- Reuse old `classroom_messages`.
- Add explicit student-scoped thread tables.

Rationale:
The user's confusion comes from the problem-thread mental model. A new student-thread model keeps the product model simple and avoids contorting problem-thread foreign keys into a direct-message experience.

Tradeoffs:
Adds new tables and event-writing helpers. Existing problem-thread data remains separate unless a future migration is approved.

Security and privacy impact:
The `(classroom_id, student_id)` key makes access policy direct: classroom managers can access; the active real student can access only their own thread.

Testing impact:
Schema smoke check, uniqueness checks, active-student access checks, and no cross-student reads.

HCI impact:
The visible object is a student conversation, matching trainer expectations.

Code-quality impact:
This is a deeper module than a shallow compatibility wrapper. It hides old problem-thread volatility behind a new domain model.

Rollback or migration:
Leave tables unused or drop them later through an approved migration. Existing Updates and problem workflows continue to exist.

ADR required: Yes.

### TD-003: Server APIs Are the Source of Truth for Reads, Writes, Files, and Authorization

Decision:
Add classroom-scoped JWT-secured endpoints under `/classroom/:id/student-threads`, such as:

- `GET /classroom/:id/student-threads` for trainer thread list and student own-thread summary.
- `GET /classroom/:id/student-threads/:studentId` for authorized messages and latest event strip.
- `POST /classroom/:id/student-threads/:studentId/messages` for human messages.
- `POST /classroom/:id/student-threads/:studentId/attachments` for safe file upload.
- `GET /classroom/:id/student-threads/:studentId/attachments/:attachmentId` for authorized attachment access or signed URL creation.

Exact route names can be tightened in the task plan, but every read/write must go through server authorization.

Options considered:
- Let the client write directly to Supabase tables.
- Use Supabase Storage directly from the browser.
- Keep all sensitive reads/writes behind existing MCC JWT server APIs.

Rationale:
MCC already uses its own JWT/role model. Direct Supabase writes would duplicate or bypass classroom authorization.

Tradeoffs:
More server code is required, but security policy stays in one place.

Security and privacy impact:
Server checks must require manager access or active real student membership. Pre-enrolled/link-pending placeholders cannot chat as students. Client-supplied role, student ID, MIME type, and file metadata are never trusted.

Testing impact:
Trainer, active student, unrelated student, unrelated classroom member, and pre-enrolled/link-pending scenarios.

HCI impact:
Unauthorized or unavailable threads should fail with clear messages such as "This student cannot chat until account linking is active."

Code-quality impact:
Thread authorization belongs in helper functions near the thread queries, not repeated in React components.

Rollback or migration:
Remove the new routes and components; no existing problem status endpoint has to change to preserve core classroom functionality.

ADR required: Yes.

### TD-004: Store Classroom Events as System Bubbles in Affected Student Threads

Decision:
After successful existing classroom mutations, append system-event messages to affected student threads. Event types should include:

- `student_solution_submitted`
- `trainer_problem_added`
- `trainer_feedback`
- `solution_status_changed`
- `topic_or_resource_updated`

Events are appended through a shared helper, for example `appendStudentThreadEvent(classroomId, studentIds, event)`, which filters to active real students and writes batched rows.

Options considered:
- Derive every event dynamically from problem/topic tables on thread load.
- Store only human chat and keep events only in Updates.
- Store compact system-event bubbles in student threads after successful mutations.

Rationale:
Realtime chat needs a durable timeline. Storing events as messages makes a single conversation history possible and lets Supabase Realtime signal the same message stream.

Tradeoffs:
Class-wide or group events fan out to multiple student threads. The helper must batch inserts and avoid unbounded work.

Security and privacy impact:
Event fan-out must use affected active student IDs. A group/topic event must not leak to unaffected students.

Testing impact:
Student submission creates one event in that student's thread. Trainer assigns a live problem to a group and only affected active members get event bubbles.

HCI impact:
System bubbles should be visually distinct from human bubbles and use concise language. They should not look editable or user-authored.

Code-quality impact:
One helper centralizes event writing and prevents duplicated per-controller fan-out logic.

Rollback or migration:
Stop calling the event helper; human chat remains intact.

ADR required: Yes.

### TD-005: Use Supabase Realtime as Opaque Thread Invalidation, Not Sensitive Payload Transport

Decision:
Use Supabase Realtime Broadcast for per-thread invalidation signals. The server-authorized thread response returns the channel identifier(s) a user may subscribe to. Broadcast payloads contain only opaque data such as thread id, revision/message id, event kind, and timestamp. They do not contain message bodies, filenames, file paths, solution code, private notes, or student profile data. On receipt, the client refetches the thread through the JWT-secured MCC API.

Options considered:
- Use Supabase Postgres Changes directly on message tables.
- Use Supabase Broadcast with full message payloads.
- Use Supabase Broadcast as opaque invalidation plus server-authorized refetch.

Rationale:
The current app uses MCC JWTs, while the existing Supabase browser client uses public anon credentials. Without a verified Supabase Auth/RLS bridge, direct row-change payloads or full broadcast messages risk data exposure.

Tradeoffs:
Realtime arrival requires one authorized fetch after a signal. If a broadcast is missed, explicit refresh recovers the thread.

Security and privacy impact:
An attacker who guesses or spoofs a public channel can at most cause an authorized client to refetch. The server remains the gate for content.

Testing impact:
Verify no private content is included in broadcast payload construction. Manual two-browser realtime test should prove inbound refresh without polling.

HCI impact:
Show connected, reconnecting, disconnected, and refresh states. Do not silently fail realtime.

Code-quality impact:
Create a small classroom thread realtime hook/module. Do not copy the typing-room hook wholesale because that code mixes room state, leaderboard, joins, and game status.

Rollback or migration:
Disable realtime subscription and rely on explicit refresh; stored messages remain correct.

ADR required: Yes.

### TD-006: Private Supabase Storage for Safe Attachments

Decision:
Use a private Supabase Storage bucket for classroom thread attachments. Uploads go through an authenticated server endpoint that validates classroom/thread access, file extension, MIME type, size, and safe filename before storing. Downloads/open actions go through an authenticated server endpoint that returns a short-lived signed URL or streams the file after rechecking access.

Allowed categories:
- Images: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`.
- Documents: `.pdf`.
- Plain text and code: `.txt`, `.md`, `.csv`, `.json`, `.c`, `.cpp`, `.h`, `.hpp`, `.java`, `.py`, `.js`, `.jsx`, `.ts`, `.tsx`.

Default maximum:
- 10 MB per file unless current deployment configuration requires a stricter limit.

Options considered:
- Reuse `uploadImage`/`all_picture` public URLs.
- Use UploadThing's broad file router.
- Use private Supabase Storage through server-validated upload and signed access.

Rationale:
Classroom attachments are private learning artifacts. Existing helpers are public-image oriented and not safe for private classroom files.

Tradeoffs:
Requires server-side storage code and environment validation, likely including a server-only Supabase service role key or an equivalent private-storage policy.

Security and privacy impact:
Reject executables, archives, macro office files, and unknown binaries. Do not render executable content; show metadata/download controls. Do not expose storage paths as authorization.

Testing impact:
Upload allowed image/text/PDF/code types. Reject `.exe`, `.zip`, unknown binary, wrong MIME/extension mismatch, oversized file, and unauthorized thread access.

HCI impact:
Composer should show selected file chips, progress, failure, retry, and remove-before-send controls.

Code-quality impact:
Centralize safe file rules in a shared server utility and mirror the allowed list in client UI for hints only.

Rollback or migration:
Disable attachment controls while preserving text chat. Existing attachment metadata can remain inert.

ADR required: Yes.

### TD-007: Treat Old Problem Threads as Legacy and Remove Active Problem-Thread Entry Points

Decision:
Do not migrate or delete old `classroom_problem_threads` data in this release. Remove or hide active UI entry points that open problem-thread dialogs/floating bubbles. Keep existing problem-thread routes/tables only as legacy compatibility until a future migration/cleanup is approved.

Options considered:
- Migrate old problem-thread messages into student threads immediately.
- Keep both problem-thread buttons and new student Threads tab.
- Hide old problem-thread UI and leave data untouched.

Rationale:
Keeping both visible systems would preserve the confusion the user wants removed. Migrating historic problem-thread content safely requires a separate mapping and review pass.

Tradeoffs:
Old messages may not appear in the new Threads tab initially.

Security and privacy impact:
Leaving legacy data inert avoids destructive data loss. Removing UI entry points reduces accidental cross-model usage.

Testing impact:
Search for visible `ProblemThreadDialog`, `FloatingThreadDock`, and old Thread buttons in classroom live views. Confirm old tables are not dropped.

HCI impact:
The classroom has one conversation place: `Threads`.

Code-quality impact:
Avoids a risky migration mixed into the first realtime/file-sharing implementation.

Rollback or migration:
Re-enable old entry points if needed. A future approved migration can copy old messages with explicit mapping rules.

ADR required: Yes.

### TD-008: Use Focused Client Components for Threads

Decision:
Build focused client modules:

- `ClassroomThreadsTab` for role-specific layout.
- `StudentThreadList` for trainer-side student selection.
- `StudentThreadPanel` for the iMessage-style timeline, latest update strip, composer, attachment UI, and realtime status.
- `useClassroomThreadRealtime` for Supabase channel setup/cleanup and refresh signaling.

Integrate these into `ClassroomLiveClient.js` with minimal tab wiring and existing classroom data props.

Options considered:
- Put the full Threads UI inline in `ClassroomLiveClient.js`.
- Create a broad messaging framework.
- Use focused classroom-thread components.

Rationale:
`ClassroomLiveClient.js` is already large. Focused components reduce implementation risk while keeping the feature local to classroom live.

Tradeoffs:
Several props are needed for classroom id, current user, roster, and role.

Security and privacy impact:
Components display only server-authorized data and never decide access.

Testing impact:
Targeted lint for new components and classroom integration, plus responsive visual checks.

HCI impact:
Stable panels and scroll containers prevent layout jumps in a dense classroom dashboard.

Code-quality impact:
Avoids both a bloated page component and speculative global chat abstractions.

Rollback or migration:
Remove the tab integration and the focused components.

ADR required: No.

### TD-009: Preserve Existing Updates Read Receipts and Priority Taxonomy

Decision:
Reuse existing Updates update-key/read-receipt and user priority settings. New student-thread events may add or refine notification sources, but they should use the same server-generated key validation pattern before marking read.

Options considered:
- Replace Updates with the new Threads event stream.
- Add a second notification/read-state system for Threads.
- Preserve Updates as the notification surface and reuse existing settings/read receipts.

Rationale:
The user explicitly wants Updates to remain as notifications and first/default. The existing read receipt pattern is already designed for server validation.

Tradeoffs:
Some events appear both as notification cards and as student-thread system bubbles, but their roles differ: attention queue versus conversation history.

Security and privacy impact:
Read receipt writes must still validate visible update keys server-side.

Testing impact:
Existing mark-one and mark-all read scenarios should still pass after moving settings to a separate tab.

HCI impact:
Do not make Updates open chats automatically. It should remain a clear notification page.

Code-quality impact:
Avoids duplicate update taxonomy and user settings logic.

Rollback or migration:
Remove new thread-derived update sources while preserving existing Updates behavior.

ADR required: No.

### TD-010: Do Not Change Student Submission Final-Verdict Ownership

Decision:
Keep existing live and topic submission endpoints authoritative. Student actions can create pending-review system bubbles, but final `solved`, `tried`, and `not_solved` verdicts remain trainer-owned server-side.

Options considered:
- Let chat events update status.
- Let attachment/code messages count as solved submissions.
- Preserve current submission/status API authority and mirror events into threads.

Rationale:
This preserves the existing server-owned verdict protection and avoids turning chat into an alternate grading path.

Tradeoffs:
Students still use the existing submission modal rather than sending a file/chat message as the official submission.

Security and privacy impact:
Prevents students from self-approving by crafting thread messages.

Testing impact:
Regression check that student "solved" requests still become `pending_approval` and trainer review creates feedback/status event bubbles.

HCI impact:
System bubbles should say whether an item is "submitted for review" versus "approved" so students can evaluate state correctly.

Code-quality impact:
No duplicate problem-status state machine inside chat code.

Rollback or migration:
Remove event mirroring; submission endpoints remain unchanged.

ADR required: No.

## Proposed ADRs

- `docs/adr/0008-classroom-student-thread-realtime-model.md`

## Gate Request

Manual-mode technical-decision gate was approved by the user on 2026-07-31. Approval of this package also approves ADR-0008 as the new visible classroom communication model and accepts ADR-0007 as legacy/superseded only for visible thread UI, while keeping its Updates/read-receipt decisions where still applicable.
