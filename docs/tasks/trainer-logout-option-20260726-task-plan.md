# Task Plan: Trainer Logout Option

Status: Proposed
Date: 2026-07-26
RSD: [trainer-logout-option-20260726-rsd.md](file:///c:/Users/Arik/Desktop/mcc/docs/rsd/trainer-logout-option-20260726-rsd.md)
Decisions: [trainer-logout-option-20260726-decisions.md](file:///c:/Users/Arik/Desktop/mcc/docs/decisions/trainer-logout-option-20260726-decisions.md)

## Implementation Steps

1. **Update Trainer Profile Page (`client/src/app/trainer/profile/page.js`)**:
   - Import `logout` from `@/lib/action`.
   - Pass `logoutAction={logout}` as a prop to `TrainerProfileClient`.

2. **Update Trainer Profile Client (`client/src/app/trainer/profile/TrainerProfileClient.jsx`)**:
   - Import `LogOut` icon from `lucide-react`.
   - Add `logoutAction` prop to `TrainerProfileClient`.
   - Add a `<form action={logoutAction}>` containing a Logout button in the left sidebar card under user details.

3. **Update Mobile Sheet in `Navbar.js` (`client/src/components/Navbar.js`)**:
   - Import `logout` from `@/lib/action` and `LogOut` icon.
   - Add a Logout form/button in the mobile sheet for logged-in users.

4. **Verification**:
   - Run `npm run lint` in `client/`.
   - Verify build step with `npm run build` in `client/` if needed.

## Risk Assessment & Rollback

- Risk: Low. Pure UI addition calling existing server action.
- Rollback: Revert changes to `page.js`, `TrainerProfileClient.jsx`, and `Navbar.js`.
