# Trainer IDE Tracking and Team Editing RSD

Status: Approved
Task ID: trainer-ide-tracking-team-edit-20260725
Owner: Codex
Last updated: 2026-07-25
Delivery mode: Auto

## Mode and Gate Policy

Auto mode selected by user via `mode::auto`. RSD, technical decision, task plan, and implementation review gates are recorded as waived for autonomous delivery. No external production action, credential, or irreversible operation is planned.

## Grill Mode Summary

Task restatement:
Trainer classroom live page needs IDE activity moved out of Teams into its own tab, IDE monitoring must stop polling all students constantly, trainer must choose one student to track live like the board, and Teams needs a way to change team student lists.

Answers received:
- User wants `caveman ultra` communication and auto delivery.
- User explicitly does not want the server bombarded by constant IDE monitor polling.
- Trainer should select a student before live IDE tracking starts.
- Teams currently lacks student-list editing.

Assumptions:
- Blank item 4 means no fourth requirement for this run.
- Existing student IDE activity recording remains acceptable; this task changes trainer read behavior and team editing.
- Bounded polling for one selected student is acceptable for "live like the board" because existing IDE telemetry is HTTP-based, while board broadcast already uses WebSocket.
- Team editing means replacing the selected team's membership with the checked student list.

Important unresolved questions:
- Exact polling frequency preference is unknown; proceed with a conservative interval and manual refresh.
- Whether team renaming is desired is unknown; keep membership editing only.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: workflow, artifact, verification, and security constraints.
  Evidence: repository requires RSD-first delivery, scoped changes, knowledge-base updates, and narrow verification.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: subsystem scope.
  Evidence: `ClassroomLiveClient.js`, classroom controller/routes, and IDE monitor are known entry points.
  Confidence: High
- Source: `docs/knowledge-base/patterns.md`
  Used for: implementation boundary.
  Evidence: CodeMirror telemetry belongs in `ClassroomIdePanel.jsx`; team dashboard can derive work locally.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`
  Used for: storage and UX constraints.
  Evidence: IDE monitor stores one latest session plus append-only event rows; it is not a code runner or cheating detector.
  Confidence: High
- Source: `references/hci-design-rules.md`
  Used for: tab, selection, feedback, disabled/empty states, and error recovery.
  Evidence: visible state, clear signifiers, feedback, constraints, and accessibility are blocking for workflow UI.
  Confidence: High
- Source: `references/code-quality-rules.md`
  Used for: scope and API design.
  Evidence: prefer smallest design, avoid new dependencies, and keep public interfaces restrained.
  Confidence: High

## Goal

Trainer can open a separate IDE tab, choose exactly one enrolled student, and see that student's latest IDE session plus recent activity without whole-class IDE polling. Trainer can edit team members from the Teams area.

## Non-Goals

- No IDE WebSocket implementation.
- No code execution.
- No plagiarism or misconduct scoring.
- No database schema migration.
- No team rename/delete workflow.
- No changes to student IDE recording cadence.

## Users and Use Cases

- Trainer: selects a student from a classroom, watches latest code/focus/language/event status, manually refreshes or lets selected-student polling run.
- Trainer: opens Teams, edits one team's membership, saves, and sees team list update.
- Student: keeps using classroom IDE unchanged.

## User-Visible Behavior

- Trainer tabs include a separate `IDE` tab.
- Teams tab no longer embeds the IDE activity log.
- IDE tab shows a student selector and starts live polling only after a student is selected.
- IDE tab shows latest code snapshot, focus, language, last event, character count, paste count, large insert count, and event log for selected student.
- IDE empty state explains selection or no activity.
- Team rows include an edit-members control with checked enrolled students and save/cancel feedback.

## Acceptance Criteria

- [ ] IDE activity log has its own trainer tab.
- [ ] Trainer IDE polling does not run unless trainer is on the IDE tab and selected a student.
- [ ] IDE activity endpoint can filter by one selected student.
- [ ] Selected-student monitor shows latest session code and recent events.
- [ ] Teams tab no longer calls all-student IDE activity polling for live counts/logs.
- [ ] Trainer can update a team's student members.
- [ ] Server validates trainer permission and classroom membership before updating team members.
- [ ] Relevant client and server checks pass or blockers are recorded.

## Constraints

- Preserve existing routes unless additive endpoint is needed.
- Use existing Tailwind, shadcn/Radix, lucide, and CodeMirror patterns.
- Keep edits scoped to classroom live UI, IDE monitor component, classroom controller/routes, and docs.
- Do not rely on client-only authorization for team membership changes.

## Dependencies

- Existing `classroom_ide_sessions` latest snapshot storage.
- Existing `classroom_ide_events` append-only event storage.
- Existing classroom teams and team member tables.
- Existing JWT middleware and `canManageClassroom` authorization helper.

## Risks and Open Questions

- Risk: one-student polling can still feel delayed compared with the board. Mitigation: show last-event timestamps and manual refresh; future WebSocket can be added under a new RSD.
- Risk: team edit could drop members accidentally. Mitigation: checked list is explicit, save button disabled without a selected edit target, and server validates enrolled students.
- Risk: existing uncommitted IDE/team work is already dirty. Mitigation: preserve current changes and edit only targeted areas.

## Test Expectations

- Client lint for changed classroom live files.
- Server bundle validation for controller/route edits because full server TypeScript has known config limitations.
- Manual code review for polling dependencies and authorization checks.

## HCI Expectations

Actions must be discoverable through a clearly labeled IDE tab, student selector, live state badges, refresh control, and edit-members buttons. State must be visible: no student selected, loading, no activity, active/focused, stale, and save failure. Team editing must use checkboxes because membership is binary and concrete.

## Code Quality Expectations

Use existing controller/route style and local React helpers. Avoid new dependencies, schema changes, or global state. Keep polling condition explicit and easy to audit. Keep server-side membership validation close to the update command.

## Definition of Done

- [x] Mandatory Grill Mode completed with auto assumptions.
- [x] RSD gate satisfied by auto-mode waiver.
- [x] Technical decision gate satisfied by auto-mode waiver.
- [x] Full task plan gate satisfied by auto-mode waiver.
- [x] Implementation passes targeted verification or records blockers.
- [x] Implementation review gate satisfied by auto-mode waiver.
- [x] Knowledge base and mistake note updated.
