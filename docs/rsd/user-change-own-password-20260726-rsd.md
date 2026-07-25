# User Change Own Password RSD

Status: Proposed (Awaiting User Approval)
Task ID: user-change-own-password-20260726
Owner: Antigravity
Last updated: 2026-07-26

## Goal

Provide every authenticated user (students, trainers, admins) with the ability to securely change their own account password directly from their profile pages (`/profile` and `/trainer/profile`).

## Non-Goals

- Do not alter public forgot-password email OTP flows.
- Do not change session cookie structures or login JWT payload formats.
- Do not remove the administrator's ability to reset user passwords via `/admin/trainers`.

## Users and Use Cases

- **All Logged-In Users (Students, Trainers, Admins)**: Users wanting to update their password for security hygiene or after receiving a temporary password can visit their profile page, enter their current password and new password, and update it immediately.

## User-Visible Behavior

1. **User Profile Page (`/profile` - `ProfileSidebarEditor.jsx`)**:
   - Includes a **Change Password** action button in the profile sidebar.
   - Clicking opens a modal dialog (`Dialog`) for password updating.
   - User inputs **Current Password**, **New Password**, and **Confirm New Password** with eye icon toggles (`Eye`/`EyeOff`).
   - Displays real-time validation feedback (mismatched passwords, min 8 chars, incorrect current password).
2. **Trainer Profile Page (`/trainer/profile` - `TrainerProfileClient.jsx`)**:
   - Includes a **Change Password** action button in the profile settings sidebar.
   - Clicking opens the same secure password change modal dialog.

## Acceptance Criteria

- [ ] Backend endpoint `POST /auth/user/change-password` requires JWT authentication.
- [ ] Backend verifies current password using `Bun.password.verify` before applying updates.
- [ ] Backend validates new password length (minimum 8 characters) and hashes it with `Bun.password.hash`.
- [ ] Client action `changeOwnPassword` in `client/src/lib/action.js` interfaces with the new endpoint.
- [ ] `ProfileSidebarEditor.jsx` (`/profile`) includes a **Change Password** button and modal dialog.
- [ ] `TrainerProfileClient.jsx` (`/trainer/profile`) includes a **Change Password** button and modal dialog.
- [ ] Code passes `npm run lint` and `npm run build` in `client/`.

## Constraints

- Authentication required on `POST /auth/user/change-password`.
- Strict current password verification to prevent unauthorized modifications on unattended active sessions.

## Dependencies

- Bun password hashing and verification (`Bun.password.hash`, `Bun.password.verify`).
- JWT authentication middleware on `/auth/user/*`.

## Code Quality Expectations

- Reusable modal component / pattern for password change across profile views.
- Clean validation and toast/alert feedback.

## Definition of Done

- [x] Primary Requirement Satisfaction Document (RSD) created
- [ ] RSD approved by user
- [ ] Technical decisions approved by user
- [ ] Full task plan approved by user
- [ ] Implementation completed and verified
- [ ] Implementation review approved by user
- [ ] Knowledge base updated
