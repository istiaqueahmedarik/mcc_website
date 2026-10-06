# Admin Trainers & Admin Roles Management RSD

Status: Draft (Awaiting User Approval)
Task ID: admin-trainers-and-roles-management
Owner: Codex
Last updated: 2026-07-25

## Goal

1. Redesign `/admin/trainers` to align its design language, visual aesthetics, and component architecture with the standard UI system used across the rest of the MCC platform (using Shadcn UI components: `Card`, `Table`, `Badge`, `Button`, `Input`, `Dialog`, `Tabs`, and standard design tokens).
2. Expand the management capabilities so that administrators can assign or revoke Admin roles for existing users and create new dedicated Admin accounts directly, integrated within a unified role management interface.

## Non-Goals

- Do not change existing authentication schemas or alter non-admin auth routes.
- Do not modify non-admin user profile flows or database table structures (`admin` and `trainer` boolean columns already exist in `users` table).
- Do not alter classroom student/trainer submission or contest permissions.

## Users and Use Cases

- **Platform Admins**: Need a consistent, professional dashboard to search all registered users, manage Trainer access, promote/demote Admin privileges, and onboard new custom Trainer or Admin accounts directly.

## User-Visible Behavior

- `/admin/trainers` header and body are redesigned to remove ad-hoc inline HSL variables (`--profile-accent-*`) and isolated styling, replacing them with standard Shadcn card containers, tabbed role management (`Trainers` and `Admins`), structured data tables/grids, standard search input, and uniform badges.
- Top navigation bar under Admin menu updates label to **Manage Trainers & Admins**.
- On the **Trainers** tab/view: Admins can search users, toggle Trainer status for any non-admin user, and create new Trainer accounts via a modal form.
- On the **Admins** tab/view: Admins can search users, assign or revoke Admin privileges (with safety validation preventing self-demotion when sole admin), and create new Admin accounts via a modal form.
- Action results (success/failure) display clear toast/alert feedback matching site design standards.

## Acceptance Criteria

- [ ] `/admin/trainers` page visual design uses standard Shadcn UI components (`Card`, `Table`, `Tabs`, `Badge`, `Button`, `Input`, `Dialog`) and theme CSS variables (`bg-card`, `bg-background`, `border`, `text-muted-foreground`).
- [ ] Backend provides secure admin-only endpoints for `POST /classroom/admin/toggle-admin` and `POST /classroom/admin/create-admin`.
- [ ] Admins can toggle `admin` status for any user with clear UI feedback.
- [ ] Admins can create a new user account with `admin: true` credentials via modal dialog.
- [ ] Self-demotion safeguard prevents an admin from removing their own admin status if they are the sole administrator.
- [ ] Navbar under Admin dropdown reflects the unified scope ("Manage Trainers & Admins").
- [ ] No regression on existing Trainer status toggle (`POST /classroom/admin/toggle-trainer`) or Trainer creation (`POST /classroom/admin/create-trainer`).

## Constraints

- Admin authorization guards (`admin === true`) must be enforced on all newly added server endpoints.
- Code must follow repository quality standards and UI patterns.
- Scoped to `client/src/app/admin/trainers/`, `client/src/components/Navbar.js`, `server/src/controllers/classroomController.ts`, and `server/src/routes/classroomRoute.ts`.

## Dependencies

- Existing PostgreSQL `users` table containing `admin` (boolean) and `trainer` (boolean) fields.
- Bun / Hono JWT authentication middleware on `server/src/routes/classroomRoute.ts`.

## Risks and Open Questions

- **Risk**: Accidentally demoting the last admin could lock all users out of admin privileges. **Mitigation**: Add server-side and client-side check verifying active admin count before allowing self-demotion.

## Test Expectations

- Run `npm run lint` in `client/` to verify UI components.
- Run `npm run build` in `client/` to ensure no build regressions.
- Verify server routes start clean under Hono/Bun.

## Definition of Done

- [ ] Primary Requirement Satisfaction Document (RSD) approved by user
- [ ] Technical decisions and ADR approved by user
- [ ] Full task plan and dependency graph approved by user
- [ ] Implementation review before final merge approved by user
- [ ] Knowledge base updated
