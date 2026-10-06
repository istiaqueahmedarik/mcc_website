# Trainer IDE Tracking and Team Editing Technical Decisions

Status: Approved
Task ID: trainer-ide-tracking-team-edit-20260725
Last updated: 2026-07-25
Delivery mode: Auto

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-ide-tracking-team-edit-20260725-rsd.md`
  Used for: scope and acceptance criteria.
  Evidence: trainer selects one student; Teams membership editing is required.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`
  Used for: IDE storage boundary.
  Evidence: IDE monitor stores latest session plus event rows and is not a code runner or cheating detector.
  Confidence: High
- Source: `docs/knowledge-base/patterns.md`
  Used for: component placement.
  Evidence: browser IDE logic should stay in `ClassroomIdePanel.jsx`.
  Confidence: High
- Source: `references/hci-design-rules.md`
  Used for: UI state and controls.
  Evidence: selection, feedback, constraints, and error recovery must be visible.
  Confidence: High
- Source: `references/code-quality-rules.md`
  Used for: public interface restraint and simple implementation.
  Evidence: avoid dependencies and keep API additions purposeful.
  Confidence: High

## Context

Existing trainer Teams dashboard pulls all IDE sessions and events every five seconds. This creates unnecessary server work and mixes activity logs into Teams. Existing storage already keeps latest code snapshot per classroom/student, so trainer can track one student without new schema.

## Decisions

### TD-001: Move IDE Monitor To Dedicated Trainer Tab

Decision: Add an `IDE` trainer tab and remove the embedded IDE activity log from the Teams dashboard.

Options considered:

- Keep log inside Teams.
- Create a separate IDE tab.

Rationale:

Separate tab matches user request and reduces conceptual overload in Teams.

Tradeoffs:

Trainers switch tabs to monitor IDE. Teams becomes more focused.

Security and privacy impact:

No new data class. IDE data stays trainer-only through existing manager endpoint.

Testing impact:

Client lint and manual UI review must check tab visibility and polling guard.

HCI impact:

Clear tab label improves discoverability and mode clarity.

Code-quality impact:

Removes coupling between team analytics and IDE logs.

Rollback or migration:

Move monitor component back into Teams if needed.

ADR required: No

### TD-002: Filter IDE Reads By Selected Student

Decision: Extend `listClassroomIdeActivity` to accept optional `studentId`; client polls only when trainer is on IDE tab and a student is selected.

Options considered:

- Poll all student sessions/events.
- Use WebSockets.
- Filter existing endpoint by selected student.

Rationale:

Filtered polling satisfies performance requirement with smallest compatible server change. WebSockets need more architecture and are out of scope.

Tradeoffs:

Not instant like board WebSocket; bounded polling can be a few seconds stale.

Security and privacy impact:

Server validates trainer permission and selected student enrollment before returning data.

Testing impact:

Server bundle check and client lint must cover new optional request path.

HCI impact:

Student selector is an explicit forcing function that prevents accidental whole-class monitoring.

Code-quality impact:

Small public API addition with validation close to query construction.

Rollback or migration:

Stop sending `studentId` and endpoint returns existing whole-class behavior.

ADR required: No

### TD-003: Replace Team Membership Through Additive Update Endpoint

Decision: Add `updateTeamMembers` endpoint to replace one team's member set after validating team ownership and classroom enrollment.

Options considered:

- Delete/recreate teams.
- Add one member/remove one member endpoints.
- Replace membership with checked list.

Rationale:

Checked list maps directly to trainer workflow and avoids many small calls.

Tradeoffs:

Replacing membership is broader than toggling one row, so UI must show selected members clearly.

Security and privacy impact:

Only classroom managers can update; server rejects students outside the classroom.

Testing impact:

Server bundle check and manual review of transaction-like delete/insert sequence.

HCI impact:

Checkboxes are visible, reversible before save, and preserve user control.

Code-quality impact:

One cohesive endpoint avoids duplicated membership logic in multiple routes.

Rollback or migration:

Remove endpoint/UI; existing `createTeam` remains.

ADR required: No
