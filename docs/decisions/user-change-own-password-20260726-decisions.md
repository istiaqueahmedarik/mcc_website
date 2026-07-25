# Technical Decisions: User Change Own Password

Status: Proposed (Awaiting User Approval)
Task ID: user-change-own-password-20260726
Date: 2026-07-26

## 1. Backend API & Verification Logic

- **Decision**: Add `changeOwnPassword` in `server/src/controllers/authController.ts` and register endpoint `POST /auth/user/change-password` in `server/src/routes/authRoute.ts`.
- **Rationale**: `/auth/user/*` is already secured with JWT middleware (`route.use('/user/*', jwt(...))`), automatically providing extracted user identity (`id`) from token payload.
- **Current Password Verification**:
  ```ts
  const user = userRows[0];
  if (user.password) {
    const isMatch = await Bun.password.verify(currentPassword, user.password);
    if (!isMatch) return c.json({ error: "Incorrect current password" }, 400);
  }
  ```

## 2. Server Action Interface

- **Decision**: Export `changeOwnPassword(currentPassword, newPassword)` in `client/src/lib/action.js`.
- **Rationale**: Unifies server calls via standard `cookies()` JWT token extraction.

## 3. UI Component Integration

- **Decision**: Implement a reusable `ChangeOwnPasswordModal` component (or embedded modal) in both `ProfileSidebarEditor.jsx` (`/profile`) and `TrainerProfileClient.jsx` (`/trainer/profile`).
- **UX Flow**:
  - Modal with fields for Current Password, New Password, and Confirm Password with eye toggles (`Eye`/`EyeOff`).
  - Validation checks: current password required, new password minimum 8 chars, new & confirm password match.
  - Submits to `changeOwnPassword` server action and displays success/error message.
