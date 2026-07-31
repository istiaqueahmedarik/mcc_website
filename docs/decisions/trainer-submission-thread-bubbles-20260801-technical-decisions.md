# Trainer Submission Thread Bubbles Technical Decisions

Status: Approved
Task ID: trainer-submission-thread-bubbles-20260801
Last updated: 2026-08-01
Delivery mode: Manual

## Mode and Gate Results

RSD gate was approved by the user on 2026-08-01. Technical decisions and ADR-0009 were approved by the user on 2026-08-01.

Gates waited on:
- RSD approval.
- Technical decisions and ADR approval.

Gates not yet satisfied:
- Full task plan and dependency graph approval.
- Implementation review before final merge.

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-submission-thread-bubbles-20260801-rsd.md`
  Used for: approved requirements
  Evidence: both live and topic pending submissions need student-thread bubbles; referenced bubble messages must visibly persist submission metadata for trainer and student.
  Confidence: High
- Source: `AGENTS.md`
  Used for: gate policy and verification expectations
  Evidence: technical decisions and ADRs require user approval before task planning.
  Confidence: High
- Source: `docs/rsd/trainer-student-classroom-threads-realtime-20260731-rsd.md`
  Used for: existing communication model
  Evidence: student-scoped `Threads` is the active classroom conversation surface, while `Updates` remains first/default.
  Confidence: High
- Source: `docs/decisions/trainer-student-classroom-threads-realtime-20260731-technical-decisions.md`
  Used for: architecture constraints
  Evidence: student-thread APIs are server-authorized, old problem threads are legacy, and Supabase Realtime is opaque invalidation.
  Confidence: High
- Source: `docs/adr/0008-classroom-student-thread-realtime-model.md`
  Used for: durable model boundary
  Evidence: one thread per `(classroom_id, student_id)`, chat messages do not grant final solve verdicts, and old problem-thread UI is not the active model.
  Confidence: High
- Source: `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`
  Used for: implemented entry points
  Evidence: student-thread routes/components already exist, with residual risk around live Supabase/browser QA.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: approved scope and entry points
  Evidence: the approved requirement scope for this task was recorded after RSD approval.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`
  Used for: compatibility constraints
  Evidence: active classroom chat is student-scoped; browser Supabase writes must not bypass MCC authorization.
  Confidence: High
- Source: `docs/knowledge-base/patterns.md`
  Used for: event and no-polling patterns
  Evidence: system bubbles are conversation history, not grading authority; classroom live should avoid hidden polling.
  Confidence: High
- Source: `docs/knowledge-base/hci-rules.md`
  Used for: visible communication scope
  Evidence: communication surfaces must keep Updates, Threads, and Settings distinct and show selected-student scope near chat.
  Confidence: High
- Source: `docs/knowledge-base/quality-rules.md`
  Used for: server-owned policy
  Evidence: student-thread modules must keep access policy and attachment safety on the server.
  Confidence: High
- Source: `client/src/components/ClassroomThreadsTab.js`
  Used for: client reuse decisions
  Evidence: current file owns student-thread list, panel, composer, attachment send, message rendering, latest event strip, and realtime status.
  Confidence: High
- Source: `client/src/components/FloatingThreadDock.js`
  Used for: bubble reuse decision
  Evidence: current dock renders legacy `ProblemThread`, so using it unchanged would revive the old problem-thread model.
  Confidence: High
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: pending-submission entry point decisions
  Evidence: topic pending submissions are listed in the submission hub and topic workspace; live pending submissions are visible in live problem rows.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: validation and API decisions
  Evidence: student-thread message and attachment endpoints already call `getStudentThreadAccess`; live/topic submission rows remain authoritative.
  Confidence: High
- Source: `server/src/routes/classroomRoute.ts`
  Used for: route compatibility
  Evidence: existing student-thread routes are classroom-scoped under `/classroom/:id/student-threads`.
  Confidence: High
- Source: `server/src/utils/classroomStudentThreadsSchema.ts`
  Used for: metadata and schema decisions
  Evidence: student-thread messages already include `metadata jsonb`; no schema change is required for references.
  Confidence: High
- Source: `references/hci-design-rules.md`
  Used for: HCI impact
  Evidence: visible state, signifiers, feedback, mapping, constraints, error recovery, and accessibility are blocking checks.
  Confidence: High
- Source: `references/code-quality-rules.md`
  Used for: maintainability impact
  Evidence: keep public interfaces small, hide volatile details, and avoid duplicating behavior.
  Confidence: High

## Context

The current classroom communication model already has student-scoped threads, system event bubbles, attachment support, and realtime invalidation. The new requirement is to make pending-submission discussion easier: trainers should open the affected student's existing thread as a floating bubble from either live or topic pending submissions, and every message sent from that submission context should visibly reference the authoritative pending submission.

## Decisions

### TD-001: Use Student-Thread Bubbles, Not Legacy ProblemThread Bubbles

Decision:
Create or adapt a floating dock for student-scoped thread bubbles that renders the same student-thread panel/composer behavior used by `ClassroomThreadsTab`. Do not use `ProblemThread` for the new pending-submission or normal-thread bubble behavior.

Options considered:
- Re-enable `FloatingThreadDock` with `ProblemThread`.
- Modify `ProblemThread` to act like student chat.
- Add a student-thread bubble dock that reuses student-thread components.

Rationale:
The approved communication model is one classroom thread per student. Reusing `ProblemThread` would preserve the confusing problem-first model the user wants to leave behind.

Tradeoffs:
Adding a student-thread dock requires a small client component, but it avoids twisting legacy props and behavior into the new model.

Security and privacy impact:
The dock only renders content returned by the existing student-thread APIs; it does not decide authorization.

Testing impact:
Verify old problem-thread UI remains inactive and the new bubble calls `/student-threads/:studentId`.

HCI impact:
The visible object remains "student conversation" across the full tab and bubble. Trainers do not have to mentally choose between problem chat and student chat.

Code-quality impact:
Prefer a focused `StudentThreadBubbleDock` or similarly named component over extending legacy `FloatingThreadDock` semantics.

Rollback or migration:
Remove the new dock and bubble buttons; the normal `Threads` tab still works.

ADR required: No.

### TD-002: Persist Submission References in Student-Thread Message Metadata

Decision:
Store submission context on human message metadata under a canonical `submission_reference` object. Use existing `classroom_student_thread_messages.metadata jsonb`; no new database column or table is required.

Canonical metadata shape:

```json
{
  "submission_reference": {
    "type": "live_problem | topic_problem",
    "class_problem_id": "uuid or omitted",
    "progress_id": "uuid or omitted",
    "assignment_id": "uuid or omitted",
    "topic_problem_id": "uuid or omitted",
    "student_id": "uuid",
    "problem_title": "string",
    "topic_title": "string or omitted",
    "class_id": "uuid or omitted",
    "class_name": "string or omitted",
    "submitted_at": "ISO timestamp or null",
    "status": "pending_approval"
  }
}
```

Options considered:
- Add a dedicated `submission_reference_id` column.
- Create a separate `classroom_student_thread_message_references` table.
- Store normalized reference metadata in the existing message JSON.

Rationale:
Message metadata already exists for client message ids and event context. The reference is display/context metadata tied to a chat message, not a new authoritative submission relationship.

Tradeoffs:
JSON metadata is less relationally queryable, but v1 only needs display and audit context in the message timeline.

Security and privacy impact:
The stored reference must be server-generated from authoritative rows, not trusted from client-provided labels. Do not store solution code, private file paths, or trainer-only notes in the reference.

Testing impact:
Verify live and topic references appear in returned messages and survive refresh.

HCI impact:
The chip can show problem/topic/class/submitted time consistently for both roles without requiring users to remember which pending row started the chat.

Code-quality impact:
The metadata shape should be normalized by one helper, not assembled in multiple client handlers.

Rollback or migration:
Ignore `submission_reference` when rendering. Existing messages remain valid.

ADR required: Yes, as an amendment to the student-thread model.

### TD-003: Validate Submission References Server-Side Before Inserting Messages or Attachments

Decision:
Extend `POST /classroom/:id/student-threads/:studentId/messages` and `POST /classroom/:id/student-threads/:studentId/attachments` with an optional `submissionReference` payload. Before insertion, the server resolves the reference from authoritative tables:

- `type: "live_problem"` validates `class_problems.id`, joined through `classes.classroom_id`, with `class_problems.student_id = thread.student_id` and `status = 'pending_approval'`.
- `type: "topic_problem"` validates `classroom_topic_problem_progress.id`, joined through active topic assignment/problem/classroom rows, with `progress.student_id = thread.student_id` and `status = 'pending_approval'`.

If validation fails, reject the message/attachment and do not persist partial attachment metadata.

Options considered:
- Trust the client-supplied student/submission ids.
- Validate only classroom ownership.
- Validate classroom, student ownership, source type, and current pending status.

Rationale:
The feature is launched from pending submissions, so stale or cross-student references should be rejected to prevent confusing or leaking context.

Tradeoffs:
If a trainer keeps a bubble open after approving/rejecting the submission, referenced sends will fail. The trainer can continue the conversation from the normal bubble without the stale reference.

Security and privacy impact:
Prevents attaching a visible reference to another student's submission or a submission outside the classroom.

Testing impact:
Add API-level smoke/manual tests for cross-classroom, cross-student, stale status, and invalid UUID references.

HCI impact:
Failure copy should be specific and recoverable, for example "This submission is no longer pending. Send as a normal thread message instead."

Code-quality impact:
Implement as a helper such as `resolveStudentThreadSubmissionReference(classroomId, studentId, rawReference)` near student-thread access helpers.

Rollback or migration:
Remove optional request handling; normal student-thread sends remain unchanged.

ADR required: Yes.

### TD-004: Reuse a Shared StudentThreadPanel for Full Tab and Bubble

Decision:
Refactor `ClassroomThreadsTab.js` only enough to export reusable student-thread panel behavior for both the tab and floating bubbles. Keep list/search orchestration in the tab, but share rendering, composer, attachment, message reference chip, and realtime refresh behavior.

Options considered:
- Duplicate a second bubble-only chat implementation.
- Move all classroom thread logic into a global messaging framework.
- Extract a focused panel/dock boundary.

Rationale:
The bubble should behave like the normal thread. Duplicating composer/realtime/reference rendering would create fast drift.

Tradeoffs:
The existing `ClassroomThreadsTab.js` file may need a modest split or additional exports, but no new dependency or broad architecture is needed.

Security and privacy impact:
No new policy in React. The panel passes optional submission context to the server and renders returned metadata.

Testing impact:
Targeted lint on `ClassroomThreadsTab.js` and the dock. Manual checks for tab and bubble send flows.

HCI impact:
Consistent composer, feedback, realtime state, and reference chips reduce mode confusion.

Code-quality impact:
This extracts real shared behavior and avoids a speculative app-wide chat abstraction.

Rollback or migration:
Inline the panel back into the tab and remove bubble support.

ADR required: No.

### TD-005: Add Pending-Submission Bubble Entrypoints at Existing Review Surfaces

Decision:
Add thread actions beside both live class pending submission rows and topic pending submission cards. The action opens a student-thread bubble with a submission-context object:

- live: `type`, `classProblemId`, `studentId`, `problemTitle`, `classId`, `className`, `submittedAt`.
- topic: `type`, `progressId`, `assignmentId`, `topicProblemId`, `studentId`, `problemTitle`, `topicTitle`, `submittedAt`.

The client may pass summary fields for immediate bubble header display, but the server persists only canonical validated metadata.

Options considered:
- Put the action only inside the Review dialog.
- Add it only to the submission review hub.
- Add it beside every pending-submission row/card where review actions already exist.

Rationale:
The user asked for a thread link with pending submissions. Placing it near the review/approve/reject controls creates natural mapping without making chat a verdict action.

Tradeoffs:
There may be two topic pending-submission surfaces in the current page; both should use one helper to avoid inconsistent behavior.

Security and privacy impact:
Client context improves UX only; validation still happens server-side.

Testing impact:
Manual checks for live pending rows, topic workspace pending cards, and submission review hub cards.

HCI impact:
The action should use a message icon and label like `Thread` or `Open thread`, with the reference shown in the bubble header.

Code-quality impact:
Create a local helper to build submission context from live/topic rows rather than embedding literal objects in every button.

Rollback or migration:
Remove the buttons; existing review flows still work.

ADR required: No.

### TD-006: Add Open-as-Bubble From the Normal Threads Tab

Decision:
Add an `Open bubble` action in the normal `Threads` tab. In trainer mode it opens the selected student's conversation as a bubble. In student mode it opens the student's own conversation as a bubble. These normal bubbles send messages without `submission_reference` unless a submission context is supplied by the opener.

Options considered:
- Only support pending-submission bubbles.
- Put open-as-bubble on each trainer thread-list row.
- Put one explicit action in the selected thread panel/header, optionally with row-level support later.

Rationale:
The user explicitly asked for a bubble option in the normal threading option. A panel/header action is clear and avoids cluttering every list row.

Tradeoffs:
Users must select a thread first in trainer mode before opening it as a bubble, matching the current thread panel model.

Security and privacy impact:
No new server privilege; normal bubble uses the selected authorized student thread.

Testing impact:
Verify normal bubble send has no submission-reference chip and persists as a normal message.

HCI impact:
The action should be visible near the selected conversation title so the relationship between full panel and bubble is obvious.

Code-quality impact:
Expose an optional callback prop from `ClassroomThreadsTab` or `ThreadPanel` such as `onOpenBubble(context)`.

Rollback or migration:
Remove the action; tab chat remains unchanged.

ADR required: No.

### TD-007: Deduplicate Bubbles by Student and Submission Context

Decision:
Use a bubble key built from `classroomId`, `studentId`, and optional submission-reference identity. Normal bubbles use `student:<studentId>`. Submission-context bubbles use `student:<studentId>:submission:<type>:<id>`. Opening the same key focuses the existing bubble.

Options considered:
- One global bubble per student, replacing context each time.
- Unlimited duplicate bubbles.
- Context-specific deduplication.

Rationale:
The user wants context when opened from a submission, but duplicate windows for the same context would add clutter. Context-specific keys allow a normal student chat and a submission-context chat to coexist when needed.

Tradeoffs:
Multiple bubbles for one student can still exist if they refer to different pending submissions. The existing maximum bubble count should cap visual clutter.

Security and privacy impact:
The key is UI state only and must not be used for authorization.

Testing impact:
Open the same pending submission twice and verify it focuses the existing bubble. Open normal then referenced bubble and verify contexts are distinct.

HCI impact:
Deduplication keeps the floating dock predictable while preserving context.

Code-quality impact:
Keep key generation in one helper near the dock.

Rollback or migration:
Use a single student-only bubble key if context-specific bubbles are too much.

ADR required: No.

### TD-008: Keep Thread Messages Separate From Submission Verdicts

Decision:
Submission-referenced thread messages and attachments do not approve, reject, retry, or alter problem statuses. Existing live and topic review endpoints remain the only source of final trainer verdicts.

Options considered:
- Let referenced messages update pending-review state.
- Add quick approve/reject actions inside the bubble.
- Keep the bubble as contextual conversation only.

Rationale:
The existing server-owned verdict model protects students from self-approval and keeps review state auditable through existing endpoints.

Tradeoffs:
Trainers still use the review row/dialog for final verdicts.

Security and privacy impact:
Prevents status mutation through chat payloads.

Testing impact:
Verify sending referenced messages does not change `class_problems.status` or topic progress status.

HCI impact:
Bubble copy and chips should not imply that sending a chat message is the approval action.

Code-quality impact:
Avoids duplicating the submission state machine inside chat code.

Rollback or migration:
No data migration; referenced messages can remain conversational.

ADR required: No.

## Proposed ADRs

- `docs/adr/0009-student-thread-submission-reference-metadata.md`

## Gate Request

Manual-mode technical-decision gate was approved by the user on 2026-08-01. Approval of this package also approves ADR-0009 as the durable submission-reference metadata contract for student-thread messages.
