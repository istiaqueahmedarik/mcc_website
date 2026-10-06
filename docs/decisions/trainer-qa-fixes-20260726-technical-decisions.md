# Trainer QA Fixes Technical Decisions

Status: Approved
Task ID: trainer-qa-fixes-20260726
Last updated: 2026-07-26
Delivery mode: Auto

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-qa-fixes-20260726-rsd.md`
  Used for: decision scope
  Evidence: all QA findings are in scope, but destructive data cleanup is out of scope.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`
  Used for: group terminology and topic resource model
  Evidence: user-facing labels use Group/Groups while DB/API names remain `classroom_teams`; topic resources are separate from `classroom_resources`.
  Confidence: High
- Source: `docs/rsd/public-trainer-form-share-identity-20260726-rsd.md`
  Used for: form identity and saved JSON expectations
  Evidence: authenticated known values are server-derived; trainers need inspectable saved response JSON.
  Confidence: High
- Source: `rsd-orchestrator-agent/references/hci-design-rules.md`
  Used for: validation and feedback decisions
  Evidence: invalid actions should be prevented or explained with visible recovery feedback.
  Confidence: High
- Source: `rsd-orchestrator-agent/references/code-quality-rules.md`
  Used for: implementation shape
  Evidence: preserve public interfaces and avoid broad refactors.
  Confidence: High

## Context

The QA findings span one Hono controller and two large client surfaces. The highest risk defects are role pollution in classroom student workflows, topic-resource reader mismatch, and trainer form analytics opacity.

## Decisions

### TD-001: Prevent Trainer/Admin Student Pollution Without Destructive Cleanup

Decision: Add server-side guards and client-side filtering so trainer/admin users cannot be added or shown as enrolled students for student-only workflows. Do not delete existing rows in auto mode.

Options considered:
- Delete existing polluted `classroom_students` rows.
- Prevent future pollution and filter polluted rows from UI/API responses.

Rationale:
Deleting user data is irreversible and was not explicitly approved. Guarding and filtering fixes the current trainer UX and prevents recurrence.

Tradeoffs:
Polluted rows may remain in the database until a separate cleanup is approved.

Security and privacy impact:
Improves role separation. Must preserve trainer/admin access to classroom management through ownership/substitute/admin checks.

Testing impact:
Check People, assignment target, attendance summary, and group member selection lists.

HCI impact:
Trainers see only valid student targets, reducing mode errors and wrong-target mistakes.

Code-quality impact:
Keep the policy server-side where possible, with a small client-side safety filter only for defensive display.

Rollback or migration:
Revert guard/filter changes. No schema migration.

ADR required: No

### TD-002: Extend Existing Reader Behavior for Topic Resources

Decision: Make topic-resource `Read` links work through existing classroom resource reader semantics where practical, by teaching the server/resource detail path to resolve topic resources after classroom-resource lookup fails.

Options considered:
- Create a new topic-resource reader route.
- Reuse existing `/classroom/live/[id]/resources/[resourceId]` route and extend detail lookup.
- Remove `Read` links for topic resources.

Rationale:
Existing cards already emit the classroom reader link. Extending lookup preserves links and minimizes UI churn.

Tradeoffs:
The route name is generic "resources" and now resolves two resource sources.

Security and privacy impact:
Must validate classroom access and topic classroom ownership before returning topic-resource detail.

Testing impact:
Create a topic resource and open its `Read` link as trainer and, if feasible, enrolled student.

HCI impact:
Fixes a broken signifier: `Read` should open readable content, not "Resource not found."

Code-quality impact:
Keep source-specific normalization in the controller rather than duplicating reader pages.

Rollback or migration:
Revert detail fallback.

ADR required: No

### TD-003: Fix Form Analytics in Existing Detail UI

Decision: Compute mapped/custom counts from saved `response_json` structures and show readable JSON payloads in the existing form detail page.

Options considered:
- Add a new analytics endpoint.
- Fix client-side derived metrics/rendering from existing response payloads.

Rationale:
The data already reaches the page; the bug is presentation/derivation. A new endpoint would add unnecessary surface area.

Tradeoffs:
Client logic must handle multiple historical response JSON shapes.

Security and privacy impact:
Trainer-only detail page already exposes responses. Do not expose the data on public form pages.

Testing impact:
Submit a form and verify summary, timeline, explore/JSON visibility.

HCI impact:
Makes trainer evaluation of form submissions possible without hidden database inspection.

Code-quality impact:
Use small local helper functions to normalize response JSON shapes and avoid repeated optional chaining.

Rollback or migration:
Revert client rendering helpers.

ADR required: No

### TD-004: Fix User-Facing Copy and Validation In Place

Decision: Update affected classroom UI labels from Team/Teams to Group/Groups, add visible validation for missing targets/members, and make checkbox labels properly associated/clickable without changing API names.

Options considered:
- Rename DB/API terms.
- UI-only copy and label/validation fixes.

Rationale:
Prior approved decision explicitly says DB/API names remain unchanged while user-facing copy changes.

Tradeoffs:
Developers still see teams in code/API; user sees groups.

Security and privacy impact:
No direct impact.

Testing impact:
Browser inspect People, Groups, Topics, assignment, matrix/resource references for copy and validation.

HCI impact:
Improves conceptual model, feedback, and error recovery.

Code-quality impact:
Avoid a global rename that would create broad churn. Edit visible strings in touched surfaces only.

Rollback or migration:
Revert string and validation changes.

ADR required: No

### TD-005: Prefer Honest Fallbacks Over Fake Metadata

Decision: If problem preview cannot fetch real time/memory limits, omit the limits line or show "Limits unavailable" instead of fake "Standard sec | Standard MB."

Options considered:
- Improve scraper to always parse limits.
- Keep current placeholders.
- Use honest unavailable fallback.

Rationale:
External parsing is volatile; misleading placeholders damage trainer trust.

Tradeoffs:
Preview may be less rich when data is unavailable.

Security and privacy impact:
No direct impact.

Testing impact:
Preview Codeforces 4A and verify no fake "Standard sec | Standard MB".

HCI impact:
Trainer can accurately evaluate whether metadata was fetched.

Code-quality impact:
Small display/server normalization change.

Rollback or migration:
Revert fallback copy.

ADR required: No

### TD-006: Board UI Cleanup Without Board Architecture Changes

Decision: Remove duplicate board start affordance and suppress the tldraw license CTA through local UI/CSS if feasible. Do not change board sync, tokens, or storage.

Options considered:
- Change tldraw integration.
- UI-only cleanup.

Rationale:
Board architecture is already approved as ephemeral with short-lived tokens. QA issues are presentation-level.

Tradeoffs:
License CTA suppression may be brittle across tldraw versions.

Security and privacy impact:
No change to board auth or write/read permissions.

Testing impact:
Start board and inspect visible controls.

HCI impact:
One primary action reduces ambiguity; removing unrelated CTA preserves classroom focus.

Code-quality impact:
Keep CSS scoped to board wrapper.

Rollback or migration:
Revert board UI/CSS changes.

ADR required: No
