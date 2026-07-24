# Hide Classrooms Tab for Trainers Technical Decisions

Status: Approved
Task ID: hide-classrooms-tab-for-trainers
Last updated: 2026-07-25

## Context

`client/src/components/Navbar.js` currently derives `isLoggedIn`, `isAdmin`, and `isTrainer` from `auth/user/profile`. It renders `Classrooms` from `userTools` for every logged-in user, then renders `Trainer Dashboard` from `trainerTools` for trainers/admins. The approved RSD requires hiding duplicate classroom navigation for users who already have `Trainer Dashboard` while preserving student access to `Classrooms`.

## Requirement Review and Auditor Pass

- Clarity: The RSD defines exact affected roles and menu locations.
- Testability: Acceptance criteria are observable from `Navbar.js` output for trainer/admin and student profiles.
- Hidden dependency check: The change depends only on existing profile fields and current navbar role logic.
- Open issue resolved by assumption: Admins follow trainer no-duplicate behavior because they also see `Trainer Dashboard`.

## Decisions

### TD-001: Filter `Classrooms` at Navbar Render Time

Decision: Keep `Classrooms` in the existing `userTools` array, but render `userTools` only when the current user is logged in and does not have trainer/admin dashboard access.

Options considered:

- Option A: Add a conditional around the existing `userTools.map(...)` blocks in desktop and mobile nav.
- Option B: Remove `Classrooms` from `userTools` and add a separate student-only array.
- Option C: Create a shared navigation policy helper for all roles.

Rationale:

Option A is the smallest change that satisfies the RSD. It uses the current `Navbar.js` role flags, touches no route authorization, and avoids new abstractions for a single visibility rule.

Tradeoffs:

The same condition must be applied in both desktop and mobile sections. This is acceptable because the component already renders those sections separately and the condition is simple.

Security and privacy impact:

No new authorization behavior. Hiding a link does not grant or revoke access. Existing route/page/server checks remain the authorization boundary.

Testing impact:

Run client lint if available. Review both desktop and mobile render branches for the same visibility condition.

Code-quality impact:

Removes duplicate UX surface with minimal complexity. Follows the local link-array pattern, avoids speculative navigation architecture, and keeps policy local to the component currently owning nav visibility.

Rollback or migration:

Rollback by restoring the previous `isLoggedIn && userTools.map(...)` condition in both desktop and mobile navbar sections.

ADR required: No
