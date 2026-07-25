# Technical Decisions: Admin Change User Password

Status: Proposed (Awaiting User Approval)
Task ID: admin-change-user-password-20260726
Date: 2026-07-26

## 1. Backend Architecture & Route Placement

- **Decision**: Add `changeUserPassword` controller method in `server/src/controllers/classroomController.ts` and register endpoint `POST /classroom/admin/change-password` in `server/src/routes/classroomRoute.ts`.
- **Rationale**: `/classroom/admin/*` is already the designated administrative route cluster for managing user roles, creating admin/trainer accounts, and listing platform users with JWT admin protection.
- **Security Control**:
  ```ts
  const adminCheck = await sql`SELECT admin FROM users WHERE id = ${id}`;
  if (adminCheck.length === 0 || !adminCheck[0].admin) {
    return c.json({ error: 'Unauthorized: Admins only' }, 403);
  }
  ```
- **Password Hashing**: Uses Bun's native secure password hasher `Bun.password.hash(newPassword)`.

## 2. Frontend UI Integration & Modal Design

- **Decision**: Integrate password change capabilities directly into `TrainersManagementClient.js` under `client/src/app/admin/trainers/`.
- **Rationale**: `/admin/trainers` serves as the unified Trainers & Roles / User Management dashboard where admins inspect all user accounts.
- **UX Flow**:
  - `UserRoleTable` renders a "Change Password" action button for each user.
  - Clicking launches a targeted Shadcn `Dialog` modal pre-filled with the user's name and email.
  - User enters and confirms the new password with password visibility toggles (`Eye`/`EyeOff`).
  - Calls `post_with_token('classroom/admin/change-password', { targetUserId, newPassword })`.
  - On success, resets state, closes modal, and displays a success alert message.

## 3. Input Validation Standards

- **Server & Client Rules**:
  - `targetUserId`: Required, string.
  - `newPassword`: Required, string, minimum length of 8 characters.
  - Matching confirmation check on client side.
