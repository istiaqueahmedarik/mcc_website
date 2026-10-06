# Technical Decisions: Admin Trainers & Admin Roles Management

- **Document ID**: `docs/decisions/admin-trainers-and-roles-management-technical-decisions.md`
- **Date**: 2026-07-25
- **Status**: APPROVED (Pending Implementation)

## 1. Unified UI Architecture for `/admin/trainers`

- **Shadcn UI Standardization**: Replace ad-hoc inline HSL CSS variables (`--profile-accent-*`), custom gradient backdrops, and non-standard card implementations in `TrainersManagementClient.js` with standard Shadcn UI components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`, `Badge`, `Button`, `Input`, `Dialog`, and `Tabs`.
- **Tabbed Interface**: Introduce a clean `Tabs` container with two primary tabs:
  1. `Trainers`: Filtered view and controls focused on Trainer assignments, statistics, and onboarding custom Trainer accounts.
  2. `Admins`: Filtered view and controls focused on Admin assignments, statistics, safety controls, and onboarding new Admin accounts.
- **Unified User Fetching**: Reuse the existing `GET classroom/admin/users` endpoint which already selects `id, full_name, email, trainer, admin` sorted by `full_name`.

## 2. Server Controller & Route Additions

- **Toggle Admin Status (`POST classroom/admin/toggle-admin`)**:
  - Requires JWT token with `admin === true`.
  - Body: `{ targetUserId: string, adminStatus: boolean }`.
  - Safety Check: If `targetUserId` matches the requesting admin's ID and `adminStatus === false`, query total admin count. If count <= 1, return HTTP 400 error (`Cannot revoke your own admin access when you are the sole admin`).
  - DB Action: `UPDATE users SET admin = ${adminStatus} WHERE id = ${targetUserId} RETURNING id, full_name, email, trainer, admin`.
- **Create Admin User (`POST classroom/admin/create-admin`)**:
  - Requires JWT token with `admin === true`.
  - Body: `{ full_name, email, phone, password }`.
  - Validation: Email required & unique, password length >= 8.
  - DB Action: Insert into `users` table with `admin: true` and `granted: true`, password hashed via Bun `Bun.password.hash(password)`.
  - Return: HTTP 200 with `{ success: true, user }`.

## 3. Navbar Navigation Label Update

- In `client/src/components/Navbar.js`, update the `adminTools` navigation item for `/admin/trainers`:
  - Change label from `"Manage Trainers"` to `"Manage Trainers & Admins"`.
