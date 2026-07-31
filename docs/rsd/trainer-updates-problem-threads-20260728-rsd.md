# Trainer Updates and Problem Threads RSD

Status: Approved
Task ID: trainer-updates-problem-threads-20260728
Owner: Codex
Last updated: 2026-07-29
Delivery mode: Manual

## Mode and Gate Policy

Manual mode is selected. The user approved this RSD on 2026-07-28. The next required gates are technical decisions and ADRs, full task plan and dependency graph, implementation review, and final merge approval.

Gates waited on:
- RSD approval: approved by user on 2026-07-28.

Gates not yet satisfied:
- Technical decisions and ADRs.
- Full task plan and dependency graph.
- Implementation review before final merge.

## Grill Mode Summary

Task restatement:
Replace generic classroom messaging with per-problem discussion threads, add an Updates tab as the first tab for trainer and student classroom views, and use email notifications for fixed important classroom events when recipient settings allow it.

Answers received:
- Remove the generic messaging option.
- Every live class problem and topic problem should have its own thread.
- The thread should behave like a proper chat.
- Students can ask questions in the thread.
- Students submit solutions through the existing current submission system, and that activity should be visualized on the thread.
- Thread messages support reactions.
- Email notifications should notify the respective teacher or student.
- Email can be enabled or disabled from settings.
- Add an Updates tab for both student and teacher.
- Updates must be the first tab for both student and teacher.
- Trainer Updates contains student updates, time exceeded, thread replies, and other necessary fixed items.
- Time exceeded must be checked only on first website load or explicit user action. No polling or background refresh that slows the website.
- Updates should be visualized as a priority queue.
- Priority order is manageable from settings by dragging.
- Student Updates contains new problem, teacher feedback, thread reply, and related fixed items.
- Updates need `Mark as read` per item and `Mark all as read` for the current classroom feed.
- Thread access must be explicit and discoverable from problem lists/cards, not from the Updates notification feed.

Assumptions:
- "Messaging option" means the generic classroom chat UI and routes should be removed from the active product surface, but destructive table drops require an explicit technical decision and rollback plan.
- Email settings apply to classroom update emails only, not authentication, password reset, team collection, or administrative account emails.
- Time-exceeded updates are visual load-time updates in this release unless a deduplicated event model is explicitly approved for email side effects.
- Topic problem threads must preserve existing topic assignment privacy and must not reveal which group received which topic to unauthorized students.

Important unresolved questions:
- Should time-exceeded also send email? That requires deduplication to prevent repeat emails on page loads. This is called out for the technical-decision gate.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: gate policy and artifact locations
  Evidence: RSD, technical decisions, task plan, and implementation review all require approval gates.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: classroom entry points and notification constraints
  Evidence: classroom live work centers on `ClassroomLiveClient.js`, `classroomController.ts`, and `classroomRoute.ts`; prior classroom notification/polling work removed costly notification paths.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`
  Used for: no-polling and notification-removal constraints
  Evidence: classroom live should avoid interval polling and tab-visibility refetch bursts; previous classroom notification bell/broadcast/email side effects were removed for performance.
  Confidence: High
- Source: `docs/decisions/classroom-live-stop-polling-20260726-technical-decisions.md`
  Used for: performance requirement
  Evidence: explicit refresh/action-driven fetches remain valid, but polling/visibility refetches are not.
  Confidence: High
- Source: `docs/decisions/trainer-bulk-import-feedback-notifications-20260726-technical-decisions.md`
  Used for: notification compatibility
  Evidence: old classroom in-app notification bell, broadcast, DB writes, and email side effects were intentionally removed.
  Confidence: High
- Source: `server/src/routes/userRoute.ts`
  Used for: settings endpoint placement
  Evidence: authenticated user-scoped routes already mount under `/user`.
  Confidence: High
- Source: `server/src/sendEmail.ts`
  Used for: email dependency
  Evidence: project already exposes `sendEmail(to, subject, text, html)`.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: existing problem and progress workflows
  Evidence: live `class_problems` and topic problem progress already support pending approval, solution links, solution code, trainer notes, and verification.
  Confidence: High
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: user-visible integration points
  Evidence: trainer and student classroom views are tabbed and already use separate live/topic/challenge surfaces.
  Confidence: High

## Goal

Give trainers and students a focused, low-overhead classroom communication and update surface where the first visible tab answers "what needs attention now" and each problem owns its own conversation, solution activity, feedback, and reactions.

## Non-Goals

- Do not add generic classroom chat back under another name.
- Do not add polling, interval refetching, or visibility-triggered refetch bursts.
- Do not add a global notification bell or Supabase broadcast notification path.
- Do not change authentication, password reset, or non-classroom email settings.
- Do not add automatic judge verification or external solution validation.
- Do not expose topic-to-group assignment mappings to unauthorized students.
- Do not perform destructive database table drops without an approved migration and rollback decision.

## Users and Use Cases

Trainer:
- Opens a classroom and sees the Updates tab first.
- Reviews students who exceeded assigned problem time.
- Notices student solution submissions and pending reviews.
- Opens a problem thread to answer questions or leave feedback.
- Marks individual updates or all visible classroom updates as read after review.
- Reorders update priority from settings.
- Enables or disables classroom update emails.

Student:
- Opens a classroom and sees the Updates tab first.
- Notices new problems, teacher feedback, thread replies, and solution status changes.
- Opens a problem thread to ask a question.
- Marks individual updates or all visible classroom updates as read after review.
- Submits a solution through the current submission flow and sees that submission represented in the thread.
- Reacts to useful thread messages.
- Reorders update priority from settings.
- Enables or disables classroom update emails.

## Fixed Update Types

Trainer update types:
- `time_exceeded`: student has an unsolved assigned problem past its timer.
- `student_solution_submitted`: student submitted link/code and is waiting for trainer review.
- `thread_reply`: student posted a problem-thread question or reply.
- `student_needs_review`: submission or thread item requires trainer attention.
- `problem_progress_changed`: student changed status or perceived difficulty.

Student update types:
- `new_problem`: trainer assigned a new live problem or topic problem.
- `teacher_feedback`: trainer replied, approved, rejected, or added notes.
- `thread_reply`: trainer or authorized group participant replied.
- `solution_status_changed`: pending, approved, rejected, solved, tried, or not-solved status changed.
- `topic_or_resource_updated`: trainer changed relevant topic/problem/resource material.

## User-Visible Behavior

- `Updates` appears as the first tab for trainers and students.
- `Updates` is the default active tab for both roles.
- Update cards are sorted by user-managed priority first, then newest timestamp.
- The update priority manager supports drag reordering and keyboard-accessible reorder controls.
- The email toggle is visible in settings and clearly scoped to classroom update emails.
- Problem threads appear in live problem and topic problem contexts.
- Thread messages show sender, timestamp, message body, solution/status event badges when relevant, and reaction counts.
- Student solution submissions continue through the current submission system and appear in the thread as structured activity, not as a generic free-form replacement.
- Email notifications include direct links to the relevant classroom problem/thread context when possible.
- Unread updates are visually distinct; read updates remain accessible but visually quieter.
- Each update card has a `Mark as read` action when unread.
- The Updates tab has a `Mark all as read` action that marks all currently visible, authorized update items for the current user and classroom.
- Problem threads are accessible from the related problem card, the related Updates card, and authenticated email/deep links.
- Deep links open the classroom page, select the relevant tab/problem, and open or focus the thread when authorization allows it.

## Acceptance Criteria

- [ ] Trainer and student classroom views show `Updates` as the first tab and default active tab.
- [ ] Trainer Updates includes the fixed categories listed in this RSD, including load-time `time_exceeded`.
- [ ] Student Updates includes the fixed categories listed in this RSD.
- [ ] No new polling, interval refetch, or tab-visibility refetch is added for Updates.
- [ ] Priority sorting uses each user's saved classroom update priority order, with deterministic timestamp fallback.
- [ ] Each update item includes a stable `update_key`, `is_read`, and `read_at` state scoped to the current user.
- [ ] Users can mark one unread update as read without affecting other users.
- [ ] Users can mark all currently visible classroom updates as read without polling or global notification broadcasts.
- [ ] Settings let trainers and students reorder update priority and toggle classroom update emails.
- [ ] Generic classroom messaging UI is removed from the active classroom surface.
- [ ] Live class problems and topic problems expose scoped threads.
- [ ] Problem lists/cards can open the related thread when the current user is authorized; Updates remains a notification/read-state feed without thread launch actions.
- [ ] Thread authorization prevents nonparticipants from reading or posting.
- [ ] Thread replies support reactions.
- [ ] Existing live and topic solution submission flows remain the source of truth.
- [ ] Solution submissions, trainer feedback, and status changes are visualized in the relevant thread.
- [ ] Classroom update emails are sent only for approved event-backed triggers and only when the recipient's classroom email setting is enabled.
- [ ] Email failures do not fail or noticeably delay the user action that caused them.
- [ ] Email HTML escapes user content and does not log secrets or private code.
- [ ] Topic thread behavior does not reveal hidden group assignment mappings.
- [ ] Relevant client and server verification commands pass or any unrelated blockers are documented.

## Constraints

- Preserve existing routes, role checks, classroom access checks, and submission status semantics unless explicitly approved in the next gates.
- Use existing Next.js, React, Tailwind, shadcn/Radix, lucide, Bun/Hono, PostgreSQL, and `postgres.js` patterns.
- Use existing `sendEmail` infrastructure after removing unsafe credential logging.
- Keep classroom update computation bounded and load-time/action-driven.
- Keep implementation scoped to classroom live, classroom API, user settings API, and schema support for this feature.

## Dependencies

- Existing classroom live UI in `ClassroomLiveClient.js`.
- Existing class problem workflow in `class_problems`.
- Existing topic problem progress workflow in `classroom_topic_problem_progress`.
- Existing classroom authorization helpers in `classroomController.ts`.
- Existing authenticated `/user` route.
- Existing SMTP configuration used by `server/src/sendEmail.ts`.

## Risks and Open Questions

- Risk: time-exceeded email can spam recipients if sent on page load without deduplication. Mitigation: keep it visual-only unless a deduplicated event model is approved.
- Risk: problem thread polymorphism can leak topic assignment context. Mitigation: use explicit class/topic foreign keys and role-aware access checks.
- Risk: email bodies may leak private solution code. Mitigation: never include full submitted code in email; link to authenticated classroom instead.
- Risk: preview-generated dirty code currently includes destructive table drops in an unrelated schema helper. Mitigation: implementation plan must remove that DDL and forbid destructive drops outside approved migration scripts.

## Test Expectations

- Targeted client lint for modified/new classroom components.
- Client production build when UI integration risk justifies it.
- Server Bun build for route/controller/schema changes.
- Manual trainer scenario: Updates default, student thread reply, pending submission appears, priority reorder.
- Manual trainer scenario: mark one update read, mark all visible updates read, refresh, and verify read state persists only for that trainer.
- Manual student scenario: Updates default, new problem, teacher feedback, thread reply, email setting toggle.
- Manual student scenario: open a thread from a problem card, from an Updates card, and from a deep link.
- Authorization checks for trainer, target student, assigned topic group member, and unrelated classroom member.
- Security review for email content, secret logging, private code, and unauthorized thread access.

## HCI Expectations

- The first screen makes attention items visible without making users hunt through tabs.
- Update cards clearly signal type, urgency, actor, target problem, and next action.
- Read/unread state is visible without relying on color alone.
- `Mark as read` and `Mark all as read` give immediate feedback and do not remove items in a surprising way unless the user chooses an unread-only filter.
- Settings labels explain that the toggle controls classroom update emails only.
- Reordering has visible drag affordances and keyboard move controls.
- Thread UI makes the difference between normal chat, solution submission, trainer feedback, and status change easy to understand.
- Loading, empty, save, failure, and retry states are visible and calm.
- Buttons and icons have accessible names; color is never the only type/priority signifier.

## Code Quality Expectations

- Keep update taxonomy centralized and validated.
- Keep read-state keys deterministic and server-generated; do not trust client-provided update ownership.
- Keep email delivery behind a small classroom-notification helper so controllers do not duplicate preference checks and email formatting.
- Keep authorization policy server-side; never trust client-supplied role, student id, or problem scope.
- Avoid broad `ClassroomLiveClient.js` rewrites; use focused components where they reduce complexity.
- Avoid destructive schema changes in unrelated helpers.
- No new UI or drag-drop dependency unless a technical decision proves it is necessary.

## Definition of Done

- [x] Mandatory Grill Mode summary completed from user-provided answers and recorded assumptions.
- [x] RSD gate satisfied for manual mode.
- [ ] Technical decision gate satisfied for manual mode.
- [ ] Full task plan gate satisfied for manual mode.
- [ ] Implementation passes verification.
- [ ] Implementation review gate satisfied for manual mode.
- [ ] Final Git integration completed after approval.
- [ ] Knowledge base and mistake note updated.
