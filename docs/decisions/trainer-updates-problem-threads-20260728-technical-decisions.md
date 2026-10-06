# Trainer Updates and Problem Threads Technical Decisions

Status: Approved
Task ID: trainer-updates-problem-threads-20260728
Last updated: 2026-07-29
Delivery mode: Manual

## Mode and Gate Results

Technical-decision gate satisfied by user approval on 2026-07-28.
User added read-state and thread-access requirements on 2026-07-29; TD-011 and TD-012 record the amendment that must be included in the task-plan approval.

Gates waited on:
- RSD approval.
- Technical decisions and ADR approval.

Gates not yet satisfied:
- Full task plan and dependency graph.
- Implementation review before final merge.

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-updates-problem-threads-20260728-rsd.md`
  Used for: approved requirements
  Evidence: Updates must be first/default, generic messaging must be removed, per-problem threads must support solution visualization and reactions, email must respect settings.
  Confidence: High
- Source: `AGENTS.md`
  Used for: required gates and verification policy
  Evidence: technical decisions need user approval before task planning and implementation.
  Confidence: High
- Source: `docs/decisions/classroom-live-stop-polling-20260726-technical-decisions.md`
  Used for: update fetching strategy
  Evidence: explicit refresh/action-driven fetches are allowed; polling and visibility-triggered refetches are not.
  Confidence: High
- Source: `docs/decisions/trainer-bulk-import-feedback-notifications-20260726-technical-decisions.md`
  Used for: notification compatibility
  Evidence: old classroom notification bell, broadcasts, writes, and email side effects were removed for performance.
  Confidence: High
- Source: `server/src/routes/userRoute.ts`
  Used for: settings endpoint placement
  Evidence: authenticated user routes are already mounted under `/user`.
  Confidence: High
- Source: `server/src/sendEmail.ts`
  Used for: email delivery dependency
  Evidence: existing helper can send text and HTML email through SMTP.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: current submission and topic-progress workflows
  Evidence: live and topic problem flows already store solution links/code, trainer notes, pending approval, and status changes.
  Confidence: High
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: UI integration
  Evidence: trainer and student classroom views already use controlled tabs and can default to `updates`.
  Confidence: High
- Source: `references/hci-design-rules.md`
  Used for: UI feedback, signifiers, accessibility, and error recovery decisions
  Evidence: discoverability, feedback, mapping, constraints, and accessibility are blocking HCI checks.
  Confidence: High
- Source: `references/code-quality-rules.md`
  Used for: schema/helper/module decisions
  Evidence: keep interfaces small, avoid speculative abstractions, and avoid destructive unrelated churn.
  Confidence: High

## Context

The previous classroom notification feature was removed because it introduced polling, broadcasts, DB writes, and email side effects that hurt classroom performance. The new requirement is narrower: a first-tab Updates view, scoped per-problem threads, and recipient-controlled classroom email for fixed important events. The current workspace also contains preview-generated dirty changes that are incomplete and risky; implementation must review or replace them rather than assume they are valid.

## Decisions

### TD-001: Updates Load on Mount and Explicit Refresh Only

Decision: Implement `GET /classroom/:id/updates` as a classroom route that computes update cards on request. The client fetches on Updates mount and after explicit user action or relevant local mutation. No `setInterval`, visibility-change refetch, background cron, or broad classroom notification broadcast will be added.

Options considered:
- Reintroduce realtime notification broadcasts.
- Poll Updates periodically.
- Compute Updates on mount/action only.

Rationale:
This satisfies the user's "first website load check" constraint and preserves the prior no-polling performance decision.

Tradeoffs:
Updates are not live unless the user refreshes or performs an action. This is intentional for performance.

Security and privacy impact:
The endpoint must re-check classroom membership/trainer access server-side before returning any item.

Testing impact:
Inspect for absence of timers/visibility effects; run manual first-load and explicit refresh scenarios.

HCI impact:
The Updates tab should expose a visible refresh affordance and stale/last-loaded state so users understand when the list was evaluated.

Code-quality impact:
Keeps update retrieval a query path instead of reviving global notification infrastructure.

Rollback or migration:
Remove the new route/component without affecting core problem workflows.

ADR required: Yes.

### TD-002: Use a Fixed Central Update Taxonomy

Decision: Define a fixed classroom update taxonomy shared by server and client: `time_exceeded`, `student_solution_submitted`, `student_needs_review`, `problem_progress_changed`, `new_problem`, `teacher_feedback`, `thread_reply`, `solution_status_changed`, and `topic_or_resource_updated`. Trainer and student views filter this taxonomy to the categories approved in the RSD.

Options considered:
- Free-form update types from DB rows.
- Separate unrelated taxonomies per role.
- One fixed taxonomy with role filtering.

Rationale:
A fixed taxonomy makes priority ordering manageable, testable, and safe for future additions.

Tradeoffs:
Adding a new update type later requires code changes and settings default updates.

Security and privacy impact:
Role filtering prevents accidental exposure of trainer-only or assignment-mapping details.

Testing impact:
Test unknown or missing priority values are ignored and default ordering remains deterministic.

HCI impact:
Stable labels and badges give users a predictable mental model.

Code-quality impact:
Central constants reduce duplicated string rules across server and client.

Rollback or migration:
Unsupported types can be hidden while stored priority settings remain harmless.

ADR required: No.

### TD-003: Classroom Email Settings Are User-Scoped and Namespaced

Decision: Add a `user_settings` table if missing, with `user_id`, `classroom_update_priorities text[]`, `classroom_email_notifications_enabled boolean default true`, and timestamps. Add authenticated `/user/classroom-settings` GET/POST handlers for this feature.

Options considered:
- Add columns directly to `users`.
- Add generic `email_notifications_enabled`.
- Add namespaced classroom settings in `user_settings`.

Rationale:
Namespaced settings avoid accidentally disabling auth/password/admin emails while keeping the UI simple.

Tradeoffs:
Adds a small table and user route handlers.

Security and privacy impact:
Users can only read/write their own settings from JWT identity.

Testing impact:
Test default settings, reorder persistence, invalid priority filtering, and email toggle persistence.

HCI impact:
Settings copy must say "Classroom update emails" rather than generic email.

Code-quality impact:
Prevents a broad `users` table change and keeps classroom preferences isolated.

Rollback or migration:
Drop or ignore the `user_settings` rows for this feature; no core user profile data changes.

ADR required: Yes.

### TD-004: Model Threads with Explicit Problem References, Not a Single Polymorphic Text ID

Decision: Add `classroom_problem_threads`, `classroom_problem_thread_messages`, and `classroom_problem_thread_reactions`. A thread references either `class_problem_id` or `(topic_assignment_id, topic_problem_id)` with check constraints. Topic threads are assignment-scoped to preserve team/group privacy.

Options considered:
- Store messages in a single `problem_threads` table with `problem_id text` and `problem_type`.
- Reuse old `classroom_messages`.
- Use explicit thread/message/reaction tables with nullable typed references and constraints.

Rationale:
Explicit references make authorization, cascade cleanup, and topic privacy much safer than a loose polymorphic text key.

Tradeoffs:
The schema is slightly more verbose, but the access policy becomes clearer and less brittle.

Security and privacy impact:
Server checks must allow trainers/substitutes to access classroom threads, target students to access their class problem threads, and assigned group members to access assignment-scoped topic problem threads.

Testing impact:
Authorization tests must cover unrelated student, unrelated classroom member, assigned topic group member, trainer, and substitute trainer.

HCI impact:
Thread scope labels should show the problem and relevant context without exposing hidden group assignment mappings.

Code-quality impact:
The table shape hides storage details behind small controller helpers and prevents stringly typed authorization bugs.

Rollback or migration:
New thread tables can be left unused or dropped by an approved migration. Existing problem/progress tables remain source of truth.

ADR required: Yes.

### TD-005: Existing Submission APIs Remain Source of Truth

Decision: Keep `updateProblemStatus`, `updateClassroomTopicProblemProgress`, and trainer verification endpoints as the authoritative submission/status paths. Thread entries for solution submissions, trainer feedback, and status changes are created as structured event messages after successful existing mutations.

Options considered:
- Let thread free-form messages submit solutions directly.
- Create a parallel submission endpoint only for threads.
- Use existing submission endpoints and mirror activity into threads.

Rationale:
The user explicitly asked for the current system to remain, with thread visualization.

Tradeoffs:
Controllers need a small shared helper for recording thread events after mutations.

Security and privacy impact:
The existing authorization checks remain central. Emails and thread event bodies should not include full private code.

Testing impact:
Test that failed submissions do not create thread events; successful submissions do.

HCI impact:
Students see submission events in context without learning a second submit workflow.

Code-quality impact:
Avoids duplicate status/submission business rules.

Rollback or migration:
Remove the event-recording helper calls; submission flows continue to work.

ADR required: No.

### TD-006: Email Only for Event-Backed Updates in This Release

Decision: Send classroom update emails for event-backed triggers: new problem assignment, student solution submission, trainer feedback/status change, and problem thread replies. Do not send email for computed-only `time_exceeded` in this release unless the user approves a deduplicated event table and side-effect policy.

Options considered:
- Send time-exceeded email on every load.
- Add a deduplicated event table for time-exceeded email now.
- Keep time-exceeded visual-only and email event-backed mutations.

Rationale:
Sending email from a load-time computed condition can spam recipients and add hidden side effects to page load. This conflicts with the user's performance intent.

Tradeoffs:
Trainers see time exceeded in Updates but do not receive time-exceeded emails in v1.

Security and privacy impact:
Email bodies include actor, classroom, problem title, short event summary, and authenticated deep link. They do not include full solution code or sensitive private content.

Testing impact:
Test email preference guard for each trigger and verify disabled recipients receive no classroom update email.

HCI impact:
The settings UI should not imply that computed time-exceeded sends email unless that later ships.

Code-quality impact:
Avoids hidden load-side effects and keeps email tied to explicit mutations.

Rollback or migration:
Disable helper calls or set the classroom email toggle false.

ADR required: Yes.

### TD-007: Remove Generic Messaging Surface Without Destructive Table Drops

Decision: Remove generic classroom chat UI, route usage, imports, and active entry points. Do not drop `classroom_messages` or `classroom_message_reactions` in runtime helpers. If physical table cleanup is desired later, create a separate migration with backup/rollback.

Options considered:
- Drop old chat tables in `ensurePreEnrollmentSchema`.
- Drop old chat tables in this implementation.
- Remove active product surface now and leave old data inert.

Rationale:
The user asked to remove the messaging option, not to destroy existing data. The preview DDL in `classroomPreEnrollment.ts` is unrelated and unsafe.

Tradeoffs:
Old tables may remain until a separate cleanup task.

Security and privacy impact:
Leaving inert tables is lower risk than accidental data loss. Removed routes/UI prevent active use.

Testing impact:
Search for old chat UI/routes and verify no active classroom chat entry remains.

HCI impact:
Users see one clear communication model: problem threads.

Code-quality impact:
Avoids destructive side effects in unrelated schema helpers and prevents hidden temporal coupling.

Rollback or migration:
Re-enable old route/UI from Git if needed; no data is destroyed.

ADR required: Yes.

### TD-008: Build Three Focused Client Components

Decision: Build `UpdatesTab`, `ProblemThread`, and `ClassroomUpdateSettings` components and integrate them into `ClassroomLiveClient.js` with minimal tab wiring.

Options considered:
- Add all UI inline to `ClassroomLiveClient.js`.
- Create a broad notification framework.
- Build three focused components around the approved workflows.

Rationale:
The classroom live client is already large. Focused components reduce the blast radius without inventing a broad framework.

Tradeoffs:
Some props and callbacks are needed for deep linking and local refresh.

Security and privacy impact:
Components only display server-authorized data and never decide access.

Testing impact:
Targeted lint/build plus manual responsive checks for tabs, settings, thread, and empty/error states.

HCI impact:
Use existing shadcn/Radix patterns, lucide icons, stable sizes, visible empty/loading/error states, and accessible labels.

Code-quality impact:
Keeps UI cohesive and avoids shallow wrapper proliferation.

Rollback or migration:
Remove components and tab wiring.

ADR required: No.

### TD-009: Use Native Drag Reorder Plus Keyboard Move Controls

Decision: Implement priority reordering with native drag handling and explicit move up/down buttons. Do not add a drag/drop dependency for this bounded list.

Options considered:
- Add `@dnd-kit`.
- Use only move buttons.
- Use native drag plus keyboard-accessible controls.

Rationale:
The list is small and fixed. Native drag satisfies the user's drag request, while buttons preserve accessibility.

Tradeoffs:
Native drag is less polished than a library for complex lists, but complexity is much lower.

Security and privacy impact:
No new dependency risk.

Testing impact:
Manual drag reorder and keyboard/button reorder checks.

HCI impact:
Visible drag handles and buttons make the control discoverable and recoverable.

Code-quality impact:
Avoids unnecessary dependency and keeps implementation small.

Rollback or migration:
Replace with a library later if priority settings become complex.

ADR required: No.

### TD-010: Sanitize Email and Thread Rendering

Decision: Escape user content in email HTML, truncate email previews, avoid sending full solution code in email, and render thread markdown with raw HTML disabled.

Options considered:
- Include full message/submission content in email.
- Send plain links only.
- Send concise escaped summaries plus authenticated deep links.

Rationale:
Emails are less access-controlled than the app. The app should remain the source for private code and full discussion.

Tradeoffs:
Recipients may need one click to inspect full context.

Security and privacy impact:
Reduces data exposure and HTML injection risk. `sendEmail.ts` must stop logging SMTP credentials before classroom emails are enabled.

Testing impact:
Check email helper escaping/truncation and search logs for secret printing.

HCI impact:
Emails remain useful without overexposing content.

Code-quality impact:
Central helper prevents duplicated unsafe email formatting.

Rollback or migration:
Disable classroom email helper calls.

ADR required: No.

### TD-011: Store Per-User Update Read Receipts by Stable Update Key

Decision: Add `classroom_update_read_receipts` with `classroom_id`, `user_id`, `update_key`, `read_at`, and timestamps. The Updates endpoint generates stable server-side `update_key` values for every returned item and joins read receipts to return `is_read` and `read_at`. Add `POST /classroom/:id/updates/read` for one or more update keys and `POST /classroom/:id/updates/read-all` for all currently visible, authorized update keys.

Options considered:
- Hide read state client-side only.
- Store a generic global notification read flag.
- Store per-user classroom read receipts keyed by deterministic update keys.

Rationale:
Client-only state would be lost across devices and refreshes. A global notification model would revive the old notification feature. Stable update keys keep read state lightweight while preserving the load/action-only Updates model.

Tradeoffs:
Computed updates such as `time_exceeded` need deterministic keys. If the underlying problem changes meaningfully, the key strategy must decide whether the item remains read or becomes new again.

Security and privacy impact:
The server must derive/validate visible update keys for the current user before writing receipts. A user cannot mark another user's hidden update as read.

Testing impact:
Test mark-one-read, mark-all-visible-read, refresh persistence, cross-user isolation, and unauthorized update-key rejection.

HCI impact:
Unread cards need clear non-color-only signifiers. Read actions should show immediate feedback and should not make items disappear unexpectedly unless the user chooses an unread-only filter.

Code-quality impact:
Read-state logic belongs beside the Updates query helpers, not in a global notification abstraction.

Rollback or migration:
The read receipt table can be ignored or dropped later without affecting core classroom/problem data.

ADR required: Yes.

### TD-012: Thread Access Uses Problem Cards, Updates Cards, and Authenticated Deep Links

Decision: Expose threads through problem-context surfaces only: a `Thread` action on live problem cards, topic problem cards, and problem/challenge lists. Updates is a notification/read-state feed and must not open thread dialogs. Authenticated deep links from email/URLs should land on the relevant problem surface, where the user can open the thread after server authorization.

Options considered:
- Create a global all-threads inbox.
- Make threads accessible only from problem cards.
- Provide problem-card/list access plus email deep links to the relevant problem surface.

Rationale:
Problem-card access matches the mental model that each problem owns its discussion. Updates and email links handle attention workflows without introducing another global messaging surface.

Tradeoffs:
Deep-link resolution adds client state handling in `ClassroomLiveClient.js`.

Security and privacy impact:
Thread IDs and problem IDs are not authorization. The thread API must check trainer/substitute access, target live-problem student access, or assigned topic-group membership on every read/post/reaction.

Testing impact:
Test problem-card/list open, absence of Updates thread actions, email/deep-link problem-surface landing, unauthorized link handling, and deleted/archived target fallback.

HCI impact:
If a thread link cannot be opened, the UI should explain whether the target is unavailable or the user lacks access.

Code-quality impact:
Use one deep-link resolver/helper rather than scattering query-param logic across cards and dialogs.

Rollback or migration:
Remove deep-link handling while keeping problem-card thread access.

ADR required: Yes.

## Proposed ADRs

- `docs/adr/0007-classroom-problem-thread-update-model.md`

## Gate Request

Manual-mode technical-decision gate was approved by the user on 2026-07-28. TD-006 is approved as written: time-exceeded is visual-only in this release unless a future deduplicated email event model is approved. The 2026-07-29 read-state and thread-access amendment is included for the pending task-plan gate.
