# Quality Rules

## 2026-07-25 - Keep Role-Based Navigation Local

Source:
- `client/src/components/Navbar.js`

Rule:
For small role-based navigation changes, prefer editing the existing link rendering conditions in `Navbar.js` over introducing a new navigation registry or policy layer.

Applies when:
The change only affects which already-existing links appear for a role.

Do not overgeneralize:
Extract shared navigation policy only if multiple components begin duplicating the same role logic.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Verify Narrow First

Source:
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

Rule:
For a scoped component-only change in a repository with unrelated lint failures, record the full-suite blocker and run a targeted lint command against the changed component.

Applies when:
Full lint fails outside the approved write scope.

Do not overgeneralize:
Do not use targeted lint as a substitute when failures are in changed files or shared dependencies touched by the task.
