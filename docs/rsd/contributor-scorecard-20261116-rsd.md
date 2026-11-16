# Contributor scorecard and board-member assignment policy

## Authorized outcome

On 2026-11-16 the owner requested a separate contribution board showing who completed which ticket types and total story points, plus an assignment policy limited to board members. The user explicitly clarified that onboarding is a separate task. This scope implements contribution tracking and assignment guardrails without changing application features or permissions.

## Requirements and decisions

1. Reuse project 3 with a Contributions view grouped by assignee, exposing Ticket type and Story points and saved count/point sums. Add an auditable scorecard issue listing all approved members, including zero totals, per-type counts/points, accepted ticket links, and excluded records.
2. Recognize feature, bug, documentation, maintenance, and support type labels. Exactly one type label and one valid sp label are required. Project field values are for display; labels are canonical for the scorecard and must be kept aligned by maintainers.
3. Credit only issues closed as completed and labelled points:accepted after acceptance criteria and merged delivery are verified. Ignore PRs, unaccepted work, and the dashboard itself. Exclude shared/multi-assignee, unknown, or ambiguous records for review rather than double-counting. Explicit shared-credit allocation and an immutable historical ledger are deferred.
4. Mirror board access in an owner-reviewed repository roster. The signed-in project access UI showed istiaqueahmedarik and trqrizu on 2026-11-16. Do not substitute repository Write collaborators or grant repository access automatically.
5. GitHub's native assignee picker cannot enforce private project membership. A default-branch workflow asynchronously removes issue assignees outside the roster and reconciles on issue events, policy pushes, manual dispatch, and a daily schedule. This is eventual enforcement against a manually maintained snapshot, not a live project-membership gate.
6. Fetch current assignees before removing only disallowed accounts. Validate configuration before any mutation. Do not execute issue/PR text or untrusted code; use pinned actions and contents:read/issues:write only.
7. Owner branch-rule override is unchanged. No contributor permission promotion, project privacy change, external-member invitation, or onboarding work is included.

## Acceptance criteria

- Per-user scorecard displays all five ticket categories and total accepted points with traceable issue links.
- In-progress and unaccepted estimates do not count; ambiguous credit is visible for review.
- Only roster members remain assigned after a successful reconciliation; native picker and short asynchronous race window are disclosed.
- Missing/invalid roster fails visibly without mass removals.
- Current approved members, privacy, story-point estimates, and owner-only merge controls are preserved.
- The workflow remains inactive until its PR reaches the default branch. Local synthetic tests are not represented as hosted enforcement proof.
