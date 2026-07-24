# Decisions

## 2026-07-25 - hide-classrooms-tab-for-trainers - Local Navbar Condition

Source:
- `docs/decisions/hide-classrooms-tab-for-trainers-technical-decisions.md`

Decision:
Hide `Classrooms` for trainer/admin users by applying a local render condition in `client/src/components/Navbar.js`, not by adding a new shared navigation policy abstraction.

Applies when:
Only one existing nav item needs role-based visibility cleanup.

Do not overgeneralize:
Use a shared policy/helper only if the same role visibility rule is duplicated across multiple components or routes.
