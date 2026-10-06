# Admin Change User Password RSD

Status: Proposed (Awaiting User Approval)
Task ID: admin-change-user-password-20260726
Owner: Antigravity
Last updated: 2026-07-26

## Goal

Provide platform administrators with the capability to change or reset the password for any user account directly from the central user management dashboard (`/admin/trainers`).

## Non-Goals

- Do not change public self-service password reset flows (OTP via email).
- Do not modify user authentication JWT generation or login verification logic.
- Do not alter existing user role structures or permissions.

## Users and Use Cases

- **Platform Admins**: When a user loses access, forgets their credentials, or requires an administrative password override, the Admin needs a fast, direct, secure way to set a new password for that specific user account from the Admin Control Panel (`/admin/trainers`).

## User-Visible Behavior

1. **User Management Dashboard (`/admin/trainers`)**:
   - Each row in the users table displays a **Change Password** action button with a key icon (`Key`).
   - Clicking **Change Password** opens a modal dialog showing the target user's name and email address.
   - The modal provides inputs for **New Password** and **Confirm Password** with password visibility toggles (`Eye` / `EyeOff`) and minimum length validation (8 characters).
   - On submission, a secure request updates the target user's password in the database and displays success/error feedback toasts in the interface.

## Acceptance Criteria

- [ ] Backend route `POST /classroom/admin/change-password` enforces admin JWT authentication.
- [ ] Backend validates that target user exists and new password meets minimum 8-character length.
- [ ] Backend hashes the new password with `Bun.password.hash` before updating the `users` table.
- [ ] UI table on `/admin/trainers` includes a **Change Password** button for every listed user.
- [ ] Clicking **Change Password** opens a Shadcn `Dialog` modal with user details and new/confirm password fields.
- [ ] Form includes password visibility toggle and client-side validation (matching passwords, min 8 chars).
- [ ] Clear feedback toast/alert messages are displayed upon success or failure.
- [ ] Automated linting (`npm run lint` in `client/`) and build checks pass cleanly.

## Constraints

- Admin authorization guards (`admin === true`) must be strictly enforced on the server endpoint.
- Code must follow established repository quality standards and UI design patterns.
- Scope limited to `server/src/controllers/classroomController.ts`, `server/src/routes/classroomRoute.ts`, and `client/src/app/admin/trainers/TrainersManagementClient.js`.

## Dependencies

- PostgreSQL `users` table with `password` hash column.
- Hono JWT middleware on `server/src/routes/classroomRoute.ts`.
- `Bun.password.hash` for secure password hashing.

## Risks and Open Questions

- **Risk**: Weak passwords assigned by admin. **Mitigation**: Enforce 8+ character minimum constraint on both client and server.

## Code Quality Expectations

- Reuse existing modal dialog and Shadcn UI component standards.
- Follow existing patterns in `classroomController.ts` for admin check and user updates.

## Definition of Done

- [x] Primary Requirement Satisfaction Document (RSD) created
- [ ] RSD approved by user
- [ ] Technical decisions approved by user
- [ ] Full task plan approved by user
- [ ] Implementation completed and verified
- [ ] Implementation review approved by user
- [ ] Knowledge base updated
