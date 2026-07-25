# Task Plan: User Change Own Password

Status: Proposed (Awaiting User Approval)
Task ID: user-change-own-password-20260726
Date: 2026-07-26

## Work Items

### 1. Server Implementation
- [ ] Implement `changeOwnPassword` controller method in `server/src/controllers/authController.ts`.
- [ ] Register `route.post('/user/change-password', changeOwnPassword)` in `server/src/routes/authRoute.ts`.

### 2. Client Action & UI Integration
- [ ] Export `changeOwnPassword(currentPassword, newPassword)` server action in `client/src/lib/action.js`.
- [ ] Create `ChangeOwnPasswordModal` component (or integrate modal dialog) in `client/src/components/ProfileSidebarEditor.jsx` for `/profile`.
- [ ] Integrate Change Password modal dialog in `client/src/app/trainer/profile/TrainerProfileClient.jsx` for `/trainer/profile`.

### 3. Verification & Quality Assurance
- [ ] Run `npm run lint` in `client/` to verify UI syntax and component imports.
- [ ] Run `npm run build` in `client/` to verify build output.

### 4. Knowledge Base & Review
- [ ] Update `docs/knowledge-base/decisions.md` and `docs/knowledge-base/project-index.md`.
- [ ] Create implementation review document.
