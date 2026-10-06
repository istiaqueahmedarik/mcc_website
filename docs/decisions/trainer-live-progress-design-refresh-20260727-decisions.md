# Trainer Live Progress Design Refresh Decisions

- **Author**: OpenCode
- **Date**: 2026-07-27
- **Status**: APPROVED

## Decision 1: UI-Only Refresh In Existing Component

Keep changes inside `ClassroomLiveClient.js` and preserve endpoint strings, handlers, state keys, and authorization-bearing logic.

Reason:
- Existing project rules for classroom UI refreshes require behavior preservation unless explicitly approved.

## Decision 2: Full-Width Operational Table

Keep a table for desktop trainer workflow, but make it full-width with better fixed/relative column sizing and row content structure.

Reason:
- Trainers need scan speed across multiple students/problems.
- Table is still correct interaction model; issue is spacing/hierarchy, not data model.

## Decision 3: Summary Metrics Above Rows

Compute lightweight local counts from existing `problems` state and render compact metric chips in the Live progress card.

Reason:
- Improves situational awareness without API or polling changes.

## Decision 4: Pending Review Gets Primary CTA

Render submitted proof as a small action button/chip near row actions when `solution_link` exists, instead of inline text beside problem title.

Reason:
- Reduces problem-title clutter and makes pending review easier to spot.

## Decision 5: No New Shared Components

Use small local JSX changes rather than extracting global table components.

Reason:
- Scope is one section in one large page.
