# Task Plan: Admin Change User Password

Status: Proposed (Awaiting User Approval)
Task ID: admin-change-user-password-20260726
Date: 2026-07-26

## Work Items

### 1. Server Controller & Endpoint Implementation
- [ ] Implement `changeUserPassword` in `server/src/controllers/classroomController.ts`.
- [ ] Export `changeUserPassword` and route `POST /classroom/admin/change-password` in `server/src/routes/classroomRoute.ts`.
- [ ] Verify security guard checks `admin === true` and input validation (`newPassword.length >= 8`).

### 2. Client UI Implementation
- [ ] Add state for password change modal (`changePasswordOpen`, `selectedUserForPassword`, `newPassword`, `confirmPassword`, `passwordError`, `passwordLoading`) in `TrainersManagementClient.js`.
- [ ] Add "Change Password" action button in `UserRoleTable` rows.
- [ ] Build `Dialog` modal component for password reset with input validation, visibility toggle buttons, and submit handler.
- [ ] Connect modal submission to `post_with_token('classroom/admin/change-password', ...)` and display feedback message.

### 3. Verification & Quality Assurance
- [ ] Run `npm run lint` in `client/` to verify UI component code quality.
- [ ] Run `npm run build` in `client/` to verify build integrity.
- [ ] Verify server route configuration cleanly handles admin checks.

### 4. Project Memory & Review
- [ ] Update `docs/knowledge-base/project-index.md` and `docs/knowledge-base/decisions.md`.
- [ ] Submit implementation review for final merge.
