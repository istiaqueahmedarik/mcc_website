# Trainer Student Classroom Threads Realtime RSD

Status: Approved
Task ID: trainer-student-classroom-threads-realtime-20260731
Owner: Codex / Arik
Last updated: 2026-07-31
Delivery mode: Manual

## Mode and Gate Policy

Manual mode is selected because the user did not request semi-auto or auto mode. The repository requires approval after the RSD, technical decisions and ADRs, full task plan and dependency graph, and implementation review before final integration.

Gates waited on:
- Grill Mode answers received on 2026-07-31.
- RSD approval received from the user on 2026-07-31.

Gates not yet satisfied:
- Technical decisions and ADR approval.
- Full task plan and dependency graph approval.
- Implementation review approval before final merge.

## Grill Mode Summary

Task restatement:
The current trainer/student thread system is confusing. Add a `Threads` tab where trainers can chat with students in one classroom-level thread per student. Student submissions, trainer problem additions, trainer feedback, and similar classroom actions should also appear as event bubbles inside the relevant student thread. Use Supabase Realtime for live updates, support safe file sharing, keep `Updates` as the first/default notification page, and add a `Settings` tab for update priority management. The visual style should follow an iMessage-like chat pattern.

Answers received:
- Thread model: one classroom chat per student.
- Events: system events should appear as bubbles in the relevant trainer-student chat.
- Chat top behavior: both a top updates area and newest/important activity visibility are desired.
- File sharing: allow only safe file types.
- Updates tab: keep it. It acts like notifications and remains the first page trainers and students see.
- Settings: add a settings tab for priority changing.

Assumptions:
- `Threads` supersedes the visible per-problem thread mental model in the classroom UI, but existing per-problem thread data should not be destructively deleted without a separate migration decision.
- A student sees only their own classroom thread; trainers, admins, and approved classroom managers see a student list and can open one thread per active student.
- Pre-enrolled or link-pending placeholder students cannot participate in live chat until linked to an active real account; trainer UI may show them as unavailable if useful.
- System event bubbles fan out only to affected student threads. For example, an individual live problem event goes to that student; a class-wide problem event appears in every affected active student thread; a group/topic event appears only for affected members.
- The "both" chat-top request means the thread has a top `Latest updates` strip with newest/high-priority events, while the main iMessage-style conversation still preserves natural chronological chat flow and a clear jump-to-latest affordance.
- File sharing should use authenticated classroom access and should not store private classroom files in a public bucket.

Important unresolved questions:
- The technical-decision phase must verify the safest Supabase Realtime integration pattern for this app's current auth model and database setup.
- The technical-decision phase must decide whether old per-problem thread messages are migrated, bridged, or left as legacy read-only/inert data.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: process, artifact, and gate requirements
  Evidence: RSD, technical decisions, task plan, and implementation review approval gates are required.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: current classroom thread/update entry points
  Evidence: Updates and problem threads are implemented in `ClassroomLiveClient.js`, `UpdatesTab.js`, `ProblemThread.js`, `PrioritySettings.js`, `classroomController.ts`, `classroomRoute.ts`, `userController.ts`, `userRoute.ts`, and `classroomUpdatesSchema.ts`.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`
  Used for: compatibility constraints
  Evidence: Updates are notification/read-state only, no polling is approved, old generic chat was removed from active surface, and thread APIs are classroom-scoped/authenticated.
  Confidence: High
- Source: `docs/knowledge-base/patterns.md`
  Used for: read receipt and realtime/polling constraints
  Evidence: stable server-generated update keys must be validated before read receipt writes; no hidden classroom live polling.
  Confidence: High
- Source: `docs/knowledge-base/hci-rules.md`
  Used for: classroom chat mental model
  Evidence: chat surfaces must show visible scope and state close to the message list.
  Confidence: High
- Source: `docs/knowledge-base/quality-rules.md`
  Used for: scope and maintainability
  Evidence: lazy thread loading and server-owned authorization are required for classroom communication surfaces.
  Confidence: High
- Source: `docs/rsd/trainer-updates-problem-threads-20260728-rsd.md`
  Used for: prior approved Updates/problem-thread requirements
  Evidence: Updates first/default, fixed update taxonomy, priority settings, read state, and classroom email settings already exist as a product direction.
  Confidence: High
- Source: `docs/decisions/trainer-updates-problem-threads-20260728-technical-decisions.md`
  Used for: prior technical boundaries
  Evidence: existing decisions avoid polling, keep Updates as notification/read-state, preserve existing submission APIs, and avoid destructive chat table drops.
  Confidence: High
- Source: `docs/reviews/trainer-updates-problem-threads-20260728-implementation-review.md`
  Used for: current implemented state and residual risks
  Evidence: Updates/problem threads were implemented and verified; SMTP delivery was not live-tested, and time-exceeded is computed on load/refresh.
  Confidence: High
- Source: `references/doc-learning-audit.md`
  Used for: documentation evidence requirements
  Evidence: major artifacts must include an evidence ledger and update knowledge base after meaningful phases.
  Confidence: High
- Source: `references/hci-design-rules.md`
  Used for: HCI expectations
  Evidence: discoverability, signifiers, feedback, mapping, visible modes, constraints, error recovery, and accessibility are blocking checks.
  Confidence: High
- Source: `references/code-quality-rules.md`
  Used for: implementation quality expectations
  Evidence: prefer small, deliberate, test-backed changes; keep public interfaces purposeful; avoid destructive unrelated churn.
  Confidence: High

## Goal

Make trainer-student classroom communication easier to understand by replacing the problem-thread-first mental model with a dedicated `Threads` tab. Each active student has one classroom thread with the trainer side, where normal messages, safe file shares, and classroom system events appear together in a polished iMessage-style interface. `Updates` remains the first/default notification page, and `Settings` owns update priority and classroom email preferences.

## Requirement Review and Auditor Pass

Review result:
- The RSD is satisfiable and consistent with the user's Grill Mode answers.
- The prior Updates notification model can remain first/default without conflicting with the new `Threads` tab.
- The old per-problem thread model is the main source of user confusion and should be treated as a legacy implementation detail unless a technical decision explicitly keeps part of it visible.

Auditor result:
- No material RSD change was required after approval.
- Technical decisions must resolve Supabase Realtime authorization, private attachment access, event fan-out/storage, and legacy problem-thread treatment before task planning.

## Non-Goals

- Do not remove the `Updates` tab.
- Do not make `Threads` the first/default tab; `Updates` remains first/default.
- Do not add hidden polling, interval refetching, or browser visibility refetching.
- Do not expose a student-to-student classroom chat.
- Do not expose one student's thread to another student.
- Do not store private classroom files in a public bucket.
- Do not allow arbitrary executable or unsafe file uploads.
- Do not change student submission final-verdict ownership; trainers still own final approvals.
- Do not add automatic judge execution or external solution verification.
- Do not destructively drop old chat/thread tables without a separate approved migration and rollback plan.
- Do not remove or alter auth/password/non-classroom email behavior.

## Users and Use Cases

Trainer, admin, or approved classroom manager:
- Opens a classroom and sees `Updates` first.
- Uses `Threads` to select an active student and chat in that student's classroom thread.
- Sees system event bubbles when that student submits a solution, receives feedback, gets a new assigned problem, or has a relevant status/progress change.
- Shares safe files with a student inside the classroom thread.
- Opens `Settings` to reorder notification priority and configure classroom update emails.

Student:
- Opens a classroom and sees `Updates` first.
- Uses `Threads` to chat only with the trainer side for that classroom.
- Sees their own submission, problem-assignment, feedback, and status events in the same thread.
- Shares safe files with the trainer side.
- Opens `Settings` to reorder notification priority and configure classroom update emails.

## User-Visible Behavior

- Classroom tabs include `Updates`, `Threads`, and `Settings` for both trainer and student views.
- `Updates` remains the first tab and default active page for both roles.
- `Updates` continues to act as a notification/read-state surface, with priority ordering and read controls.
- `Settings` contains update priority changing and classroom update email preferences; priority changing should no longer be hidden inside the notification list if that makes the first page noisy.
- `Threads` trainer view shows a student conversation list and one selected chat panel.
- `Threads` student view opens directly to the student's own classroom thread.
- Each thread clearly labels the classroom, the student, and the trainer-side audience.
- Thread messages use an iMessage-like style: left/right bubble alignment, compact sender/timestamp metadata, readable attachments, clear day separators, and a bottom composer.
- A sticky or top `Latest updates` area appears above the conversation and shows newest/high-priority event bubbles for that thread.
- The main conversation preserves chronological chat readability and provides a clear jump-to-latest control when realtime items arrive away from the current scroll position.
- System event bubbles are visually distinct from human chat bubbles and cannot be edited as normal user messages.
- Supported event bubbles include at minimum: student solution submitted, trainer added a problem, trainer feedback/status change, topic/resource update that affects the student, and relevant thread/message activity.
- Safe file sharing supports upload progress, success, failure, retry, remove-before-send, and download/open states.
- Realtime updates appear without page refresh when a user is viewing the relevant classroom thread.
- If realtime disconnects, the UI shows a visible offline/reconnecting state and offers explicit refresh.
- Empty states explain when no active students are available, no thread is selected, or no messages/events exist yet.

## Safe File Types

Allowed file categories:
- Images: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`.
- Documents: `.pdf`.
- Plain text and code: `.txt`, `.md`, `.csv`, `.json`, `.c`, `.cpp`, `.h`, `.hpp`, `.java`, `.py`, `.js`, `.jsx`, `.ts`, `.tsx`.

Constraints:
- Reject archives, executables, installers, office macro files, and unknown binary formats.
- Enforce file type, extension, size, and classroom authorization server-side.
- Default maximum size should be conservative, such as 10 MB per file, unless existing infrastructure imposes a stricter safe limit.
- Store enough metadata to render name, size, type, sender, created time, and authenticated access URL.
- Never rely on client-side `accept` attributes as the only protection.

## Acceptance Criteria

- [ ] `Updates` is the first/default classroom tab for both trainer and student views.
- [ ] `Threads` appears as a dedicated classroom tab for trainers and students.
- [ ] `Settings` appears as a dedicated classroom tab and contains update priority ordering plus classroom email notification controls.
- [ ] Trainer `Threads` view lists active classroom students and opens one classroom thread per selected student.
- [ ] Student `Threads` view opens only the current student's own classroom thread.
- [ ] Thread access is enforced server-side for trainer/admin/manager and student roles.
- [ ] Pre-enrolled/link-pending placeholder identities cannot chat as students.
- [ ] Human chat messages can be sent and received in the relevant student thread.
- [ ] System event bubbles are created for successful solution submissions, trainer problem additions, trainer feedback/status changes, and affected topic/resource updates.
- [ ] System event bubbles appear only in affected student threads.
- [ ] `Threads` includes a top latest/high-priority update area and a normal readable chat timeline below it.
- [ ] Realtime message/event delivery uses Supabase Realtime and does not add interval polling or visibility-triggered refetches.
- [ ] Realtime disconnect/reconnect state is visible and recoverable through explicit refresh.
- [ ] File sharing supports only the safe file types listed in this RSD.
- [ ] File uploads are authorized and validated server-side by type, extension, size, classroom, and participant.
- [ ] Private classroom files are not made public by default.
- [ ] File share messages render safe previews/metadata without executing file content.
- [ ] The existing Updates notification/read-state model remains functional.
- [ ] Existing final-verdict protections for student submissions remain intact.
- [ ] Old per-problem thread data is not destructively deleted.
- [ ] Targeted client/server verification passes or unrelated blockers are documented.

## Constraints

- Preserve existing classroom routes and authorization-bearing checks unless a later technical decision explicitly approves an additive API.
- Preserve existing `Updates` read receipt semantics and user priority settings.
- Preserve existing student submission and trainer verification workflows as source of truth.
- Use existing Next.js, React, Tailwind, shadcn/Radix, lucide, Bun/Hono, PostgreSQL, and Supabase client dependencies where possible.
- Use Supabase Realtime for live thread delivery, but do not allow unauthenticated or cross-classroom subscription leaks.
- Keep changes scoped to classroom live UI, thread/update components, classroom API/controller/schema utilities, user settings placement if needed, and file upload/storage helpers for this feature.
- Use the narrowest verification that covers changed files, then broaden to client build/server bundle when schema or shared workflow risk justifies it.

## Dependencies

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js` for classroom tab integration.
- `client/src/components/UpdatesTab.js` for existing notification behavior.
- `client/src/components/PrioritySettings.js` for priority and classroom email settings.
- `client/src/components/ProblemThread.js` as current thread implementation context, likely superseded or adapted.
- `client/src/utils/supabase/client.js` and existing Supabase package dependencies.
- `server/src/controllers/classroomController.ts` and `server/src/routes/classroomRoute.ts` for classroom thread, event, upload, and authorization endpoints.
- `server/src/utils/classroomUpdatesSchema.ts` for existing update/read receipt schema patterns.
- Existing classroom problem, topic problem progress, trainer feedback, and submission endpoints.
- Supabase Storage or an equivalent authenticated storage path for private classroom attachments.

## Assumptions

- The app's existing Supabase project can enable Realtime on any new thread/event tables needed for this feature.
- If Supabase Realtime cannot safely enforce current MCC auth by itself, the implementation should keep writes and initial reads behind existing server APIs and use realtime only as a live invalidation/event delivery layer with server authorization safeguards.
- The iMessage style means familiar chat affordances, not Apple branding, logos, or copied proprietary assets.
- File sharing is for classroom learning artifacts and solution discussion, not a general cloud drive.
- Existing dirty workspace changes belong to the user or prior generated work and must be preserved or integrated carefully rather than reverted.

## Risks and Open Questions

- Risk: Supabase Realtime subscriptions can leak row changes if Realtime/RLS/auth are misconfigured. Mitigation: technical decisions must define a subscription authorization strategy before implementation.
- Risk: fan-out event bubbles can create excessive writes when a trainer assigns a problem to many students. Mitigation: decide between per-student event rows and derived event display during technical decisions.
- Risk: file uploads can expose private data if stored in public buckets or if signed URLs are too broad. Mitigation: use private storage or server-mediated access and short-lived URLs.
- Risk: maintaining old per-problem threads plus new per-student threads can confuse users. Mitigation: hide or demote old per-problem entry points unless a migration/bridge decision says otherwise.
- Risk: `ClassroomLiveClient.js` is already large. Mitigation: prefer focused components and small integration points instead of broad rewrites.
- Question: Should historical per-problem thread content be copied into student threads, linked read-only, or left untouched? Owner: technical-decision gate.
- Question: Should class-wide trainer problem additions create physical event rows per affected student, or be rendered from assignment data into each thread? Owner: technical-decision gate.

## Test Expectations

- Targeted lint for changed client components.
- Client production build if tab integration or shared components are changed.
- Server Bun build for controller, route, schema, storage, or realtime changes.
- Manual trainer scenario: open classroom, land on `Updates`, switch to `Threads`, select a student, send a message, attach a safe file, reject an unsafe file, and observe realtime inbound updates.
- Manual student scenario: open classroom, land on `Updates`, switch to `Threads`, send a message, attach a safe file, and observe trainer replies/events.
- Manual event scenario: student submits a solution and the relevant student thread receives a system event bubble.
- Manual event scenario: trainer adds a problem and affected student threads show the event without leaking to unaffected students.
- Settings scenario: priority reorder persists from `Settings` and still controls `Updates`.
- Authorization scenario: unrelated student cannot read another student's thread or attachment.
- Authorization scenario: pre-enrolled/link-pending placeholder cannot participate in chat.
- Security scenario: unsafe file types are rejected server-side even if the browser accept filter is bypassed.
- Realtime scenario: disconnect/reconnect state is visible; explicit refresh recovers current messages.

## HCI Expectations

- Users should immediately understand that `Updates` means notifications and `Threads` means conversation.
- The selected thread scope should be visible at all times: classroom, student, and trainer-side audience.
- Thread events should be recognizable as system activity, not mistaken for a human message.
- File upload states should show progress, success, failure, retry, and remove-before-send.
- New realtime messages should not yank the scroll position while the user is reading older messages.
- A jump-to-latest affordance should appear when new messages arrive off-screen.
- Read/unread, event type, upload status, and realtime connection state must not rely on color alone.
- Keyboard and screen-reader users should be able to navigate tabs, choose a student thread, send a message, attach/remove files, refresh, and reorder priorities.
- The UI should use familiar chat symbols and lucide icons with accessible names.
- The iMessage-inspired style should remain operational and readable inside MCC's existing classroom dashboard design.

## Code Quality Expectations

- Keep the classroom student-thread model explicit and domain-named.
- Keep authorization checks server-side and close to the thread/message/attachment query helpers.
- Keep Supabase Realtime details hidden behind a small client hook or module so components do not duplicate channel setup and cleanup.
- Keep file validation rules centralized and reused by upload and message creation paths.
- Avoid adding new dependencies unless technical decisions prove existing tools cannot safely satisfy realtime, upload, or UI needs.
- Avoid broad rewrites of `ClassroomLiveClient.js`; introduce focused components where they reduce meaningful complexity.
- Preserve existing update/read receipt helpers rather than duplicating notification taxonomy logic.
- Do not rely on client-supplied role, student id, MIME type, or update/thread ownership.
- Add comments only for non-obvious security/realtime invariants.

## Definition of Done

- [x] Mandatory Grill Mode completed.
- [x] RSD gate satisfied for manual mode.
- [ ] Technical decision gate satisfied for manual mode.
- [ ] Full task plan gate satisfied for manual mode.
- [ ] Implementation passes required verification.
- [ ] Implementation review gate satisfied for manual mode.
- [ ] Final Git integration completed after approval.
- [ ] Knowledge base and mistake note updated.
