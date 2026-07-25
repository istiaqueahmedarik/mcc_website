# Technical Decisions: Trainer Logout Option

Status: Proposed
Date: 2026-07-26
RSD: [trainer-logout-option-20260726-rsd.md](file:///c:/Users/Arik/Desktop/mcc/docs/rsd/trainer-logout-option-20260726-rsd.md)

## Decision 1: Reuse `logout` Server Action from `@/lib/action`

**Context:**
The application already defines an async `logout()` server action in `client/src/lib/action.js` which deletes the `token` cookie and redirects to `/`.

**Decision:**
Import `logout` in `client/src/app/trainer/profile/page.js` and pass `logoutAction={logout}` to `TrainerProfileClient.jsx`. Also use `logout` action in `Navbar.js` mobile menu.

**Consequences:**
- Avoids code duplication.
- Ensures consistent token deletion and redirect across student, admin, and trainer logout flows.

## Decision 2: Add Logout Form & Button to `TrainerProfileClient.jsx`

**Context:**
Trainers visiting `/trainer/profile` need a dedicated logout button on their profile card/sidebar.

**Decision:**
In `TrainerProfileClient.jsx`, render a `<form action={logoutAction}>` containing a styled destructive outline button with the `LogOut` icon in the left profile sidebar, matching the design of `/profile` (`ProfileSidebarEditor.jsx`).

**Consequences:**
- Trainers can log out with 1 click directly from their profile.

## Decision 3: Add Logout Button to `Navbar.js` Mobile Sheet

**Context:**
On mobile devices, users (including trainers) might not easily navigate to their profile page to log out.

**Decision:**
Add a Logout form/button inside the mobile `<SheetContent>` of `Navbar.js` when `loggedIn` is true.

**Consequences:**
- Improves accessibility of logout for mobile users.
