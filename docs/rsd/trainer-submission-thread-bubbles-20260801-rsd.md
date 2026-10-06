# Trainer Submission Thread Bubbles RSD

Status: Approved
Task ID: trainer-submission-thread-bubbles-20260801
Owner: Codex / Arik
Last updated: 2026-08-01
Delivery mode: Manual

## Mode and Gate Policy

Manual mode is selected because the user did not request semi-auto or auto mode. The repository requires approval after the RSD, technical decisions and ADRs, full task plan and dependency graph, and implementation review before final merge or delivery actions.

Gates waited on:
- Grill Mode answers received on 2026-08-01.
- RSD approval received from the user on 2026-08-01.
- Technical decisions and ADR approval received from the user on 2026-08-01.
- Full task plan and dependency graph approval received from the user on 2026-08-01.
- Implementation completed and review artifact written on 2026-08-01.

Gates not yet satisfied:
- User approval of the implementation review before final merge.

## Grill Mode Summary

Task restatement:
Add a trainer-facing thread link beside pending submissions. When clicked, it opens a floating bubble containing the existing student-scoped classroom thread for the submitted student. Messages sent from that submission-opened bubble carry a visible reference to the submission. Add a bubble-opening option to the normal `Threads` tab as well.

Answers received:
- The pending-submission entry point must cover both live class submissions and topic submissions.
- The bubble should use the current student-scoped `Threads` chat model, not the legacy problem-thread bubble.
- Every message sent while a bubble is opened from a pending submission must store a reference to that submission.
- The submission reference chip/details must be visible to both trainer and student in the chat.
- The normal `Threads` tab should also provide an option to open the selected student conversation as a bubble.

Assumptions:
- A message sent from a normal student-thread bubble has no submission reference unless the bubble was opened from a pending-submission context.
- Submission references should be persisted in student-thread message metadata rather than creating a separate chat table.
- Submission references should point to the authoritative existing submission/progress records; thread messages remain conversation, not grading authority.
- Opening the bubble should preserve the active classroom page and tab state instead of navigating away.
- Existing dirty workspace changes are prior user/generated work and must be preserved.

Important unresolved questions:
- None blocking for the RSD. Technical decisions must still define the exact metadata shape and server validation path for live versus topic submission references.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: process and gates
  Evidence: RSD, technical decisions, task plan, and implementation review approval gates are required.
  Confidence: High
- Source: `docs/rsd/trainer-student-classroom-threads-realtime-20260731-rsd.md`
  Used for: existing classroom communication model
  Evidence: `Threads` is the active one-student classroom conversation surface; `Updates` remains first/default; attachments and realtime stay server-authorized.
  Confidence: High
- Source: `docs/decisions/trainer-student-classroom-threads-realtime-20260731-technical-decisions.md`
  Used for: architecture constraints
  Evidence: student-thread reads/writes go through classroom-scoped server APIs, old problem-thread UI is legacy, and realtime is opaque invalidation.
  Confidence: High
- Source: `docs/adr/0008-classroom-student-thread-realtime-model.md`
  Used for: durable communication decision
  Evidence: student-scoped threads are the only active classroom conversation surface; old problem threads are not the primary UI model.
  Confidence: High
- Source: `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`
  Used for: implemented entry points and residual risk
  Evidence: `ClassroomThreadsTab.js`, `useClassroomThreadRealtime.js`, student-thread APIs, event bubbles, and private attachment handling are already implemented.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: current classroom/thread entry points
  Evidence: student-thread server routes and client components are listed as the active classroom communication entry points.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`
  Used for: non-goal and compatibility boundaries
  Evidence: active classroom conversation is student-scoped; browser writes must not bypass MCC authorization; old problem-thread data remains legacy.
  Confidence: High
- Source: `docs/knowledge-base/patterns.md`
  Used for: event bubble pattern
  Evidence: successful classroom mutations should mirror concise system bubbles to affected active real students and avoid sensitive details in event metadata.
  Confidence: High
- Source: `docs/knowledge-base/hci-rules.md`
  Used for: chat mental model
  Evidence: classroom communication must keep Updates, Threads, and Settings concepts separate and show selected-student scope near chat.
  Confidence: High
- Source: `docs/knowledge-base/quality-rules.md`
  Used for: authorization and polling constraints
  Evidence: student-thread policy must remain server-owned and classroom live must not add hidden polling.
  Confidence: High
- Source: `client/package.json`
  Used for: frontend stack
  Evidence: React, Next.js, Tailwind, shadcn/Radix, lucide, Supabase, and Sonner dependencies are already available.
  Confidence: High
- Source: `server/package.json`
  Used for: backend stack
  Evidence: Bun, Hono, PostgreSQL, JWT, and existing server dependency set are available.
  Confidence: High
- Source: `client/src/components/ClassroomThreadsTab.js`
  Used for: current thread UI behavior
  Evidence: trainer view lists student threads, student view opens own thread, and messages/attachments are posted to student-thread endpoints.
  Confidence: High
- Source: `client/src/components/FloatingThreadDock.js`
  Used for: current bubble behavior
  Evidence: current floating dock renders problem-thread bubbles through `ProblemThread`, which is legacy for this requirement.
  Confidence: High
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: pending submission and tab entry points
  Evidence: pending submission lists, live progress rows, student-thread tab integration, and legacy problem-thread bubble state are currently in this page.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: student-thread API and submission source behavior
  Evidence: existing endpoints persist student-thread messages and current live/topic submissions remain authoritative status workflows.
  Confidence: High
- Source: `references/hci-design-rules.md`
  Used for: discoverability and feedback expectations
  Evidence: visible state, signifiers, mapping, constraints, error recovery, and accessibility are blocking checks.
  Confidence: High
- Source: `references/code-quality-rules.md`
  Used for: maintainability expectations
  Evidence: keep interfaces small, hide volatile details, preserve server-owned policy, and avoid drive-by churn.
  Confidence: High

## Goal

Make pending submission discussion immediate and contextual by letting trainers open the submitted student's active classroom thread as a floating bubble from both live and topic pending-submission surfaces. Messages sent from a submission-context bubble must visibly and durably reference the submission so both trainer and student can understand which solution is being discussed.

## Requirement Review and Auditor Pass

Review result:
- The RSD is consistent with the user's Grill Mode answers: both live and topic pending submissions are in scope, student-scoped threads are the active model, references are visible to both roles, and normal `Threads` conversations can open as bubbles.
- The requirement extends the approved student-thread model without conflicting with `Updates` as the first/default notification surface.
- The old problem-thread bubble is explicitly out of scope for the active model.

Auditor result:
- The RSD is satisfiable with additive message metadata and focused client reuse if the technical decisions validate submission-reference ownership server-side.
- No material open question blocks the technical decision phase.
- Implementation must preserve existing dirty workspace changes and avoid adding hidden polling or verdict side effects.

## Non-Goals

- Do not revive the legacy problem-thread bubble as the active model.
- Do not create student-to-student chat.
- Do not make thread messages update problem verdicts.
- Do not change final-verdict ownership; trainers still approve or reject submissions through the existing review workflow.
- Do not add hidden polling, interval refetches, or browser visibility refetches.
- Do not move `Updates` away from first/default tab behavior.
- Do not add new attachment file categories or loosen attachment validation.
- Do not destructively migrate or delete old problem-thread data.
- Do not alter unrelated trainer dashboard, classroom roster, topic CRUD, attendance, IDE, or settings behavior.

## Users and Use Cases

Trainer, admin, or approved classroom manager:
- Reviews live class pending submissions and topic pending submissions.
- Clicks a thread action beside a pending submission.
- Gets a floating student-thread bubble without losing the current review list.
- Sends feedback or clarification from the bubble, with the message automatically tied to the pending submission.
- Opens a normal student conversation from the `Threads` tab into a floating bubble when they want to keep chatting while working elsewhere in the classroom page.

Student:
- Opens their normal `Threads` tab and sees trainer messages.
- Can see when a trainer message is tied to one of their submitted solutions.
- Can continue the conversation in the same student-scoped classroom thread.

## User-Visible Behavior

- Both live class pending submissions and topic pending submissions show a clear thread action.
- Clicking the thread action opens a floating bubble for the submitted student's existing student-scoped classroom thread.
- The bubble header identifies the student and, when opened from a submission, identifies the referenced submission context.
- The submission reference appears as a compact visible chip or block on messages sent from that submission-context bubble.
- The reference is visible to both trainer and student when reading the thread.
- Reference content includes enough context to identify the submission, such as problem title, submission type, topic/class context where available, student name, and submitted time where available.
- The reference does not expose private solution code, private storage paths, or hidden trainer-only notes beyond what the existing authorized submission review surface already exposes.
- The normal `Threads` tab includes an explicit bubble/open-floating action for the selected student conversation.
- Opening or closing a bubble does not change the active classroom tab, lose form input, or navigate away.
- Multiple bubbles may follow the existing dock limit, but duplicate bubbles for the same student/context should focus the existing bubble instead of creating clutter.
- Bubble send, attachment send, realtime state, error state, and refresh behavior match the normal `Threads` panel.
- Student and trainer readers can distinguish normal messages, submission-referenced messages, and system event bubbles without relying on color alone.

## Acceptance Criteria

- [ ] Live class pending submissions expose a thread action that opens the submitted student's student-thread bubble.
- [ ] Topic pending submissions expose a thread action that opens the submitted student's student-thread bubble.
- [ ] The bubble uses `ClassroomThreadsTab`/student-thread APIs or a focused shared student-thread panel, not `ProblemThread`.
- [ ] Messages sent from a live-submission bubble persist a validated live submission reference in message metadata.
- [ ] Messages sent from a topic-submission bubble persist a validated topic submission reference in message metadata.
- [ ] Submission reference metadata is validated server-side against classroom, student, and submission ownership.
- [ ] Invalid, stale, cross-student, or cross-classroom submission references are rejected without sending the referenced message.
- [ ] Submission reference UI is visible to both trainer and student on referenced messages.
- [ ] Normal thread messages sent outside a submission context continue to work and do not require a submission reference.
- [ ] The `Threads` tab provides an open-as-bubble option for the selected student conversation.
- [ ] Bubble opening focuses an existing duplicate bubble instead of appending duplicates.
- [ ] Realtime invalidation and explicit refresh still work for the bubble without adding interval or visibility polling.
- [ ] Attachments sent from a submission-context bubble inherit the same submission reference metadata.
- [ ] Existing trainer approve/reject/status controls remain the authoritative submission workflow.
- [ ] Existing `Updates`, `Threads`, and `Settings` tab ordering and behavior are preserved.
- [ ] Targeted client and server verification passes or unrelated blockers are documented.

## Constraints

- Preserve existing classroom route paths and authorization-bearing checks unless the technical-decision package approves additive request fields.
- Keep active conversation on the student-thread model introduced by `trainer-student-classroom-threads-realtime-20260731`.
- Keep policy server-owned: the client may request a submission reference, but the server must validate it before storing metadata.
- Keep old problem-thread data untouched.
- Keep changes scoped to classroom live pending-submission actions, student-thread client components, floating student-thread bubble support, and student-thread message API validation.
- Avoid adding new dependencies.
- Preserve no-hidden-polling behavior.
- Preserve private attachment handling and safe file validation.
- Existing dirty/untracked files in this workspace must not be reverted.

## Dependencies

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js` for live progress, topic pending submissions, tab integration, and existing bubble state.
- `client/src/components/ClassroomThreadsTab.js` for current student-thread list/panel/composer behavior.
- `client/src/components/FloatingThreadDock.js` as a likely candidate to adapt from legacy problem-thread bubbles into student-thread bubbles, or replace with a new focused dock.
- `client/src/hooks/useClassroomThreadRealtime.js` for realtime invalidation.
- `client/src/lib/action.js` for authenticated JSON and multipart requests.
- `server/src/controllers/classroomController.ts` for student-thread message endpoints and live/topic submission validation.
- `server/src/routes/classroomRoute.ts` for any additive route/body behavior.
- `server/src/utils/classroomStudentThreadsSchema.ts` for student-thread message metadata handling and validation helpers.
- Existing live class problem rows and topic progress rows as authoritative pending submission sources.

## Assumptions

- Pending live submissions are represented by `class_problems` rows with `status = 'pending_approval'`.
- Pending topic submissions are represented by topic progress rows with `status = 'pending_approval'`.
- Message metadata JSON can carry submission-reference context without a schema migration.
- A compact reference chip is sufficient; the message does not need to embed full submitted code or file contents.
- Bubble UI can reuse the existing thread panel internals with props rather than duplicating the full chat implementation.

## Risks and Open Questions

- Risk: if submission reference validation is client-only, users could attach messages to another student's submission. Mitigation: validate reference ownership server-side before insert.
- Risk: reusing the old `FloatingThreadDock` unchanged would preserve the confusing problem-thread model. Mitigation: technical decisions should either adapt it to student-thread bubbles or introduce a student-thread dock.
- Risk: `ClassroomThreadsTab.js` currently owns list, panel, composer, realtime, and attachment behavior in one file. Mitigation: extract only the minimum shared panel/dock pieces needed to avoid duplicate chat code.
- Risk: pending submission lists may not carry every ID needed to validate live and topic references. Mitigation: inspect server payloads and add only necessary fields from authorized existing endpoints.
- Risk: message references could leak private solution details. Mitigation: store and render identifiers and summary context only; use existing submission review UI for code/link review.
- Question: Should the reference chip link/focus the original pending submission row when the trainer is still on the same page? Owner: technical-decision gate; not required for v1 unless cheap and safe.

## Test Expectations

- Targeted ESLint for changed client files.
- Server Bun bundle smoke for controller/route/utility changes.
- Client build if shared classroom live or thread components are changed.
- `git diff --check`.
- Search check confirming no interval polling or visibility refetch is introduced.
- Manual trainer scenario: open live pending submission thread bubble, send text, verify visible submission reference.
- Manual trainer scenario: open topic pending submission thread bubble, send text or attachment, verify visible submission reference.
- Manual trainer scenario: open selected normal `Threads` conversation as bubble and send a normal message without requiring a submission reference.
- Manual student scenario: read trainer referenced message in own thread and verify the reference is visible but does not expose unauthorized solution details.
- Authorization scenario: attempt cross-student or cross-classroom submission reference and verify server rejection.

## HCI Expectations

- The thread action beside pending submissions should be discoverable and visually associated with discussion, not verdict approval.
- The bubble should make its scope visible: classroom, student, and optional submission reference.
- The reference chip should reduce memory burden by keeping the discussed problem/submission visible near each message.
- Referenced messages, normal messages, and system events must have distinct labels or icons in addition to color.
- Send/attachment errors must keep user text recoverable where feasible.
- Bubble close/minimize controls must have accessible names and predictable focus behavior.
- Opening a bubble must not hide the pending-submission review controls or make the trainer lose review context.

## Code Quality Expectations

- Reuse the existing student-thread message flow and realtime hook where possible.
- Do not duplicate composer, attachment, and realtime behavior across full tab and bubble surfaces when a small extracted panel can serve both.
- Keep submission-reference validation on the server and near the student-thread message insertion path.
- Keep live and topic reference normalization domain-specific and explicit.
- Preserve existing final-verdict status helpers and do not add status side effects to thread messages.
- Avoid broad rewrites of `ClassroomLiveClient.js`.
- Add comments only for non-obvious validation/security invariants.

## Definition of Done

- [x] Mandatory Grill Mode completed.
- [x] RSD gate satisfied for manual mode.
- [x] Technical decision gate satisfied for manual mode.
- [x] Full task plan gate satisfied for manual mode.
- [x] Implementation passes required verification.
- [ ] Implementation review gate satisfied for manual mode.
- [ ] Final integration completed after approval.
- [x] Knowledge base and mistake note updated.
