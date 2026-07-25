# Trainer Logout Option RSD

Status: Proposed
Task ID: trainer-logout-option-20260726
Owner: Antigravity
Last updated: 2026-07-26

## Goal

Provide a clear and accessible option for trainers to log out of the platform from their profile page (`/trainer/profile`) and navigation bar.

## Non-Goals

- Do not change session cookie handling, auth backend API endpoints, or auth token structure.
- Do not alter the existing logout flow on `/profile` for regular users/admins.
- Do not change authentication guards on existing routes.

## Users and Use Cases

- **Trainers**: Clicking on their profile avatar navigates them to `/trainer/profile`. They need an explicit, prominent Logout button on their profile page to log out of their session.
- **All Logged-In Users (including Trainers)**: Mobile sheet menu should offer a direct Logout button so users on mobile devices can log out from any page.

## User-Visible Behavior

1. **Trainer Profile Page (`/trainer/profile`)**:
   - Displays a red-themed / destructive-styled "Logout" button in the identity sidebar or account actions area.
   - Clicking "Logout" invokes the `logout` server action, clearing the session token cookie and redirecting to `/`.
2. **Mobile Navigation Sheet (`Navbar.js`)**:
   - When a user is logged in, a Logout button is rendered in the mobile slide-out menu.
   - Clicking Logout logs the user out and closes the mobile sheet.

## Acceptance Criteria

- [ ] `TrainerProfileClient.jsx` includes a Logout button triggering the `logout` server action.
- [ ] `client/src/app/trainer/profile/page.js` imports `logout` from `@/lib/action` and passes `logoutAction` to `TrainerProfileClient`.
- [ ] `Navbar.js` mobile sheet renders a Logout form/button when `loggedIn` is true.
- [ ] Clicking Logout clears the `token` cookie and redirects to `/`.
- [ ] Code passes syntax/lint checks without breaking existing layouts or profile features.

## Constraints

- Use existing `logout` server action from `client/src/lib/action.js`.
- Maintain design consistency with shadcn UI buttons and lucide `LogOut` icon.
- Keep changes scoped strictly to trainer logout functionality and mobile navbar logout option.

## Dependencies

- `logout` function in `client/src/lib/action.js`.
- Lucide icon `LogOut`.

## Risks and Open Questions

- None identified. Standard server action redirect pattern is already present in `client/src/lib/action.js`.

## Code Quality Expectations

- Reuse existing `logout` server action.
- Keep UI consistent with existing design patterns (`ProfileSidebarEditor.jsx` logout button).

## Definition of Done

- [x] RSD approved by user
- [ ] Technical decisions approved by user
- [ ] Full task plan approved by user
- [ ] Implementation passes verification
- [ ] Implementation review approved by user
- [ ] Knowledge base and mistake note updated
