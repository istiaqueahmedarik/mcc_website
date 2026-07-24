# Project Index

## 2026-07-25 - Initial RSD Bootstrap

Source:
- `AGENTS.md`

Fact:
The repository has a Next.js client in `client/` and a Bun/Hono server in `server/`.

Applies when:
Planning UI, route-handler, API, trainer, classroom, and verification changes.

Do not overgeneralize:
This index is seeded from package files and initial source inspection. Update it as deeper module ownership becomes known.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Trainer Classroom Navigation

Source:
- `docs/rsd/hide-classrooms-tab-for-trainers-rsd.md`

Fact:
Trainer and admin users should use `Trainer Dashboard` as their classroom management entry point instead of seeing a duplicate top-level `Classrooms` nav item.

Applies when:
Changing role-aware classroom navigation.

Do not overgeneralize:
This is a navigation cleanup only; classroom routes and authorization remain unchanged.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Changed Entry Point

Source:
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

Fact:
`client/src/components/Navbar.js` now hides the `Classrooms` nav item for users who can use `Trainer Dashboard`, while keeping `Classrooms` visible for logged-in student users.

Applies when:
Checking trainer/admin/student top-level navigation behavior.

Do not overgeneralize:
Direct classroom routes remain valid; this only changes navbar and mobile menu visibility.
