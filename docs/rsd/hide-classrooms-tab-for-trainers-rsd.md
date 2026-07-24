# Hide Classrooms Tab for Trainers RSD

Status: Approved
Task ID: hide-classrooms-tab-for-trainers
Owner: Codex
Last updated: 2026-07-25

## Goal

Remove duplicate trainer navigation by hiding the top-level `Classrooms` tab when a logged-in user already has access to `Trainer Dashboard`.

## Non-Goals

- Do not remove `/classroom/list` or classroom route access.
- Do not change trainer dashboard content, classroom data loading, classroom permissions, or server APIs.
- Do not change student classroom navigation.

## Users and Use Cases

- Trainers should use `Trainer Dashboard` as their classroom management entry point.
- Students should keep the `Classrooms` nav item so they can enter assigned classrooms.
- Admins can access `Trainer Dashboard`; this RSD assumes they should follow the same no-duplicate nav behavior unless the user requests admin-only behavior to stay unchanged.

## User-Visible Behavior

- Logged-in trainer/admin users see `Trainer Dashboard` in desktop navbar and mobile menu.
- Logged-in trainer/admin users do not see the top-level `Classrooms` nav item in desktop navbar or mobile menu.
- Logged-in non-trainer, non-admin users still see `Classrooms`.
- Unauthenticated users see no `Classrooms` or `Trainer Dashboard` entries.
- Direct navigation to `/classroom/list` continues to work for logged-in users.

## Acceptance Criteria

- [ ] For a user with `profile.trainer === true`, desktop navbar does not render `Classrooms`.
- [ ] For a user with `profile.trainer === true`, mobile menu does not render `Classrooms`.
- [ ] For a user with `profile.trainer === true`, desktop navbar and mobile menu still render `Trainer Dashboard`.
- [ ] For a logged-in user without trainer/admin role, desktop navbar and mobile menu still render `Classrooms`.
- [ ] No server authorization or classroom route behavior changes.
- [ ] Change stays local to the existing navigation pattern unless implementation inspection shows a shared helper is already used.

## Constraints

- Use the existing profile-derived role flags in `client/src/components/Navbar.js`.
- Keep the implementation small and reviewable.
- Do not touch unrelated dirty worktree changes.

## Dependencies

- `auth/user/profile` continues to provide `trainer` and `admin`.
- Existing `Navbar.js` server component remains responsible for role-aware top-level navigation.

## Assumptions

- Because admins also get `Trainer Dashboard`, admin users should not see the duplicate `Classrooms` nav item either.
- Hiding a nav item is only UX cleanup, not an authorization control.
- The desired label to keep for trainers is exactly `Trainer Dashboard`.

## Risks and Open Questions

- Risk: Admin-only users may still want a separate `Classrooms` shortcut. Mitigation: confirm this RSD before implementation; if needed, hide only when `profile.trainer === true`.
- Risk: Other components may contain separate classroom shortcuts. Mitigation: scope this request to navbar/mobile menu unless user expands the requirement.

## Test Expectations

- Run client lint for syntax and component issues if dependency install allows it.
- Manually inspect `Navbar.js` role conditions for desktop and mobile parity.
- Optional browser check if a local authenticated trainer session is available.

## Code Quality Expectations

- Prefer the current link-array and role-flag pattern in `Navbar.js`.
- Avoid introducing a new navigation abstraction for a one-condition UI cleanup.
- Keep route authorization separate from nav visibility.
- Leave unrelated formatting and files unchanged.

## Definition of Done

- [x] RSD approved by user
- [x] Technical decisions approved by user
- [x] Full task plan approved by user
- [x] Implementation passes verification
- [x] Implementation review approved by user
- [x] Knowledge base and mistake note updated
