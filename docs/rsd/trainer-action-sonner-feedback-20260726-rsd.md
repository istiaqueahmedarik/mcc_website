# Trainer Action Sonner Feedback RSD

Status: Draft
Task ID: trainer-action-sonner-feedback-20260726
Owner: Codex
Last updated: 2026-07-26
Delivery mode: Manual

## Mode and Gate Policy

Manual mode is selected. Approval is required after this RSD, after technical decisions, after the task plan, and after the implementation review. No gates have been skipped.

## Grill Mode Summary

Task restatement:
Trainer-facing workflows currently do not give enough visible feedback when an action starts and when it finishes. Add Sonner toast feedback so trainers can tell that a task has begun, completed successfully, or failed.

Answers received:
- User feedback says trainers have trouble understanding whether a task has started or is done.
- The requested feedback mechanism is Sonner toaster.

Assumptions:
- "Trainer feature" includes trainer-owned operational pages and trainer-mode classroom actions, not public student form submission.
- Feedback should focus on explicit user-triggered actions, especially async network mutations, not background polling or initial page loads.
- Existing inline errors and loading spinners may remain when useful, but Sonner becomes the immediate action lifecycle signal.
- Toast copy should be short, action-specific, and avoid exposing internal API names.

Important unresolved questions:
- Scope can be narrowed if the intended complaint is only about the trainer form builder or only about live classroom tasks.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: workflow and verification scope
  Evidence: MCC uses RSD-first delivery with approval gates and narrow verification for scoped client UI changes.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: trainer UI boundaries
  Evidence: trainer dashboard and trainer form management are operational UI surfaces whose existing routes, API calls, state transitions, and authorization guards should be preserved for UI work.
  Confidence: High
- Source: `docs/knowledge-base/patterns.md`
  Used for: implementation style
  Evidence: trainer UI changes should preserve endpoint strings and state keys unless a behavior RSD approves broader workflow changes.
  Confidence: High
- Source: `docs/knowledge-base/quality-rules.md`
  Used for: quality and verification
  Evidence: component-only changes should use focused verification when full client lint is blocked outside the write scope.
  Confidence: High
- Source: `client/src/app/layout.js`
  Used for: Sonner availability
  Evidence: the app already mounts Sonner's `<Toaster />` globally.
  Confidence: High
- Source: `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
  Used for: current trainer dashboard behavior
  Evidence: classroom creation and substitute trainer add/remove actions perform network calls without Sonner lifecycle feedback.
  Confidence: High
- Source: `client/src/app/trainer/forms/TrainerFormsClient.js`
  Used for: current trainer form behavior
  Evidence: form creation, share-link copy, and builder append actions rely on inline state or silent updates rather than Sonner feedback.
  Confidence: High
- Source: `client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js`
  Used for: current trainer form management behavior
  Evidence: response-toggle and share-link copy actions lack Sonner lifecycle or terminal feedback.
  Confidence: High
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: trainer-mode live classroom behavior
  Evidence: many trainer actions, including class start/complete, assignment, attendance, topic, board, and verification flows, use local state refreshes without consistent Sonner lifecycle feedback.
  Confidence: High

## Goal

Trainer-triggered actions should visibly communicate:

1. The action has started.
2. The action completed successfully.
3. The action failed and needs attention.

## Non-Goals

- Do not change server APIs, route paths, database schema, authorization rules, or response formats.
- Do not replace existing inline validation messages where they help the user fix form input.
- Do not add new dependencies or a new global notification abstraction.
- Do not add toasts for background polling, automatic refreshes, initial page loads, or passive status checks.
- Do not change student-facing public form behavior unless a trainer-owned action directly navigates there.

## Users and Use Cases

Trainer users need confidence that high-value actions have actually started and finished:

- Creating a classroom.
- Managing substitute trainers.
- Creating and sharing trainer forms.
- Turning form submissions on or off.
- Scheduling, starting, or completing a classroom session.
- Managing students, groups, attendance, resources, problem assignments, topic assignments, board broadcast, and solution verification inside trainer-mode classroom pages.

## User-Visible Behavior

- Async trainer actions show `toast.loading(...)` immediately after client-side validation passes.
- Success replaces the loading toast with `toast.success(...)` using the same toast id.
- Failure replaces the loading toast with `toast.error(...)` using the same toast id.
- Instant but easy-to-miss builder actions may use a success toast only when the action creates or copies something visible elsewhere, such as appending fields at the bottom of the queue or copying a share link.
- Toast language should name the action in trainer terms: "Creating classroom...", "Classroom created", "Starting session...", "Session started", "Assigning problem...", "Problem assigned".

## Acceptance Criteria

- [ ] Trainer dashboard classroom creation uses Sonner loading, success, and error feedback.
- [ ] Trainer dashboard substitute trainer add/remove actions use Sonner loading, success, and error feedback.
- [ ] Trainer forms creation uses Sonner loading and error feedback; successful creation shows completion before redirecting or otherwise makes completion visible.
- [ ] Trainer form share-link copy uses Sonner success/error feedback.
- [ ] Trainer form response-toggle uses Sonner loading, success, and error feedback.
- [ ] Trainer form builder append actions that place fields at the bottom of the queue show a short success toast.
- [ ] Trainer-mode classroom mutation actions use Sonner lifecycle feedback for start/done/failure where they do not already provide an equivalent action-level signal.
- [ ] Background fetches, polling, and passive refreshes do not create noisy toasts.
- [ ] Existing routes, endpoint strings, payloads, state shape, and authorization-sensitive logic remain unchanged.
- [ ] Targeted lint/checks cover all changed client files, and `git diff --check` passes.

## Constraints

- Use the existing `sonner` package already installed in the client.
- Use the globally mounted Toaster from `client/src/app/layout.js`.
- Keep toast changes local to the affected client components unless repeated code becomes genuinely hard to maintain.
- Preserve existing inline validation for form fields and permission/domain errors.
- Keep the implementation additive and behavior-preserving.

## Dependencies

- App-level Sonner toaster in `client/src/app/layout.js`.
- Existing `toast` API from `sonner`.
- Existing trainer client components and existing action helpers/fetch calls.

## Risks and Mitigations

- Risk: too many toasts during repeated trainer actions.
  Mitigation: only toast explicit user-triggered actions, and update existing loading toast ids instead of stacking lifecycle messages.
- Risk: toast copy becomes inconsistent across many handlers.
  Mitigation: use consistent verb pairs and short action-specific messages.
- Risk: broad edits in `ClassroomLiveClient.js` accidentally affect polling or student flows.
  Mitigation: keep changes inside explicit mutation handlers and run targeted lint on the changed file.
- Risk: redirect after form creation hides the success toast too quickly.
  Mitigation: use a concise success toast before navigation, while preserving the existing destination.

## Test Expectations

- Run targeted ESLint for changed trainer/client files.
- Run `git diff --check`.
- Manually inspect key handler paths to confirm loading toast ids are resolved on success and failure.
- If the classroom live component is changed, include it in targeted lint and report any pre-existing hook warnings separately.

## HCI Expectations

This change should reduce the evaluation gulf for trainer actions: after clicking an action, the trainer should not need to infer from delayed list refreshes or hidden state changes whether work is in progress or complete. Feedback should be immediate, close in language to the action, and calm enough for repeated operational use.

## Code Quality Expectations

Use simple local Sonner calls that match existing project patterns. Avoid introducing a notification service, broad refactors, endpoint changes, or layout redesigns. Preserve existing loading and error state where it supports disabled controls or inline recovery.

## Definition of Done

- [x] Mandatory RSD created
- [ ] RSD gate satisfied for selected mode
- [ ] Technical decision gate satisfied for selected mode
- [ ] Full task plan gate satisfied for selected mode
- [ ] Implementation passes verification
- [ ] Implementation review gate satisfied for selected mode
- [ ] Knowledge base updated after approved gates and final review
