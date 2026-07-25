# Trainer Form Builder Add Field Toast RSD

Status: Draft
Task ID: trainer-form-builder-add-field-toast-20260726
Owner: Codex
Last updated: 2026-07-26
Delivery mode: Manual

## Mode and Gate Policy

Manual mode is selected by default. Approval is required after this RSD, after technical decisions, after the task plan, and after the implementation review. No gates have been skipped.

## Grill Mode Summary

Task restatement:
Add Sonner toast feedback in the trainer form builder when a trainer adds a new field/action, because the new item is appended to the bottom of the field queue and can be hard to notice.

Answers received:
- The user specifically requested a Sonner toast for add actions in the trainer form builder.
- The reason is visibility: newly added items appear last, away from the clicked add control.

Assumptions:
- "New action" means adding form fields/cells from mapped user fields, custom field presets, and grouped preset buttons.
- Duplicating an existing field also creates a newly appended field and should receive the same bottom-of-queue feedback.
- Moving, editing, deleting, saving, and form submission are out of scope unless the existing code already handles them.

Important unresolved questions:
- None blocking. Toast copy can be adjusted after implementation if the exact wording feels off.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: workflow and verification scope
  Evidence: MCC uses an RSD-first workflow and narrow verification for client UI changes.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: scope boundary
  Evidence: trainer form builder presentation changes are scoped to `/trainer/forms` client presentation, preserving routes, API calls, state transitions, and authorization guards.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`
  Used for: implementation constraints
  Evidence: trainer UI presentation should use existing Tailwind, shadcn/Radix components, and lucide icons without adding UI dependencies.
  Confidence: High
- Source: `client/src/app/trainer/forms/TrainerFormsClient.js`
  Used for: current behavior
  Evidence: `addField`, `addFields`, and `duplicateField` append new fields to `form.fields`.
  Confidence: High

## Goal

Trainers receive immediate, visible confirmation after adding a field/cell in the form builder, including a clear cue that the item was added to the bottom of the field queue.

## Non-Goals

- Do not change API routes, server code, database schema, form submission behavior, authorization, or public form rendering.
- Do not reorder fields automatically or scroll the page automatically.
- Do not add dependencies or create shared abstractions.

## Users and Use Cases

Trainer users building a form from presets or mapped profile fields need to understand that the clicked item was added successfully and where to look next.

## User-Visible Behavior

When a trainer clicks an add control that appends one or more fields, a Sonner success toast appears. The toast should name the field or set when reasonable and state that it was added to the bottom of the field queue.

## Acceptance Criteria

- [ ] Adding a mapped user field shows a Sonner success toast.
- [ ] Adding a custom question preset shows a Sonner success toast.
- [ ] Adding a grouped preset set shows a Sonner success toast that reflects multiple fields.
- [ ] Duplicating a field shows a Sonner success toast because it also appends a new field.
- [ ] Toasts do not fire for moving, editing, removing, loading, or submitting fields.
- [ ] Existing field data, order, validation, routes, and API calls remain unchanged.

## Constraints

- Use the existing `sonner` package already present in the app.
- Keep the change local to `TrainerFormsClient.js` unless verification exposes a missing global toaster.
- Preserve current Tailwind/shadcn style and avoid broad refactors.

## Dependencies

- Existing app-level Sonner toaster in `client/src/app/layout.js`.
- Existing `toast` API from the installed `sonner` package.

## Risks and Open Questions

- Risk: noisy repeated toasts when trainers add many fields quickly. Mitigation: keep copy short and only trigger for explicit add/duplicate actions.
- Risk: toast copy could imply the page scrolled or focused the new field. Mitigation: say the item was added to the bottom, not selected or opened.

## Test Expectations

- Run targeted ESLint against `client/src/app/trainer/forms/TrainerFormsClient.js`.
- Run `git diff --check`.
- Manually inspect the changed code path for add/duplicate handlers.

## HCI Expectations

The change must reduce the evaluation gulf: after clicking an add control, trainers can tell the click worked and know the result is at the bottom of the queue. Feedback should be immediate, plain, and tied to the user's current mental model.

## Code Quality Expectations

Use the smallest local change that satisfies the acceptance criteria. Do not add a new wrapper, global helper, dependency, or unrelated cleanup.

## Definition of Done

- [x] Mandatory Grill Mode completed
- [ ] RSD gate satisfied for selected mode
- [ ] Technical decision gate satisfied for selected mode
- [ ] Full task plan gate satisfied for selected mode
- [ ] Implementation passes verification
- [ ] Implementation review gate satisfied for selected mode
- [ ] Knowledge base and mistake note updated
