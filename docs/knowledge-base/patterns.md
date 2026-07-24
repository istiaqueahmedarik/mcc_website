# Patterns

## 2026-07-25 - Navigation Uses Profile-Derived Role Flags

Source:
- `client/src/components/Navbar.js`

Fact:
Navbar reads `auth/user/profile`, derives `isLoggedIn`, `isAdmin`, and `isTrainer`, then renders top-level and role-specific links from small link arrays.

Applies when:
Changing visibility of navigation entries by user role.

Do not overgeneralize:
Route authorization still belongs in route/page guards and server controllers; hiding a nav item is not an authorization control.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Shared Role Predicate Inside Navbar

Source:
- `docs/tasks/hide-classrooms-tab-for-trainers-task-plan.md`

Fact:
When desktop and mobile navbar sections need the same simple role condition, define a local boolean in `Navbar.js` and reuse it in both render branches.

Applies when:
A small role visibility rule must stay consistent between desktop navbar and mobile sheet menu.

Do not overgeneralize:
Keep the predicate local unless more components need the same rule.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Trainer Dashboard Predicate

Source:
- `client/src/components/Navbar.js`
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

Fact:
`canUseTrainerDashboard` is the local navbar predicate for users with trainer or admin access.

Applies when:
Adding or hiding navbar items tied to Trainer Dashboard access.

Do not overgeneralize:
This is not a route authorization helper.
