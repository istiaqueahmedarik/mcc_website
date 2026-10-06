# Admin Student Profile Readiness Technical Decisions

Status: Approved
Task ID: admin-student-profile-readiness-20260901
Last updated: 2026-09-01

## Decisions

1. Add `GET /classroom/admin/student-profile-readiness` to the existing authenticated classroom router and reuse `requireAdminUser` for server-owned authorization.
2. Keep classification and completeness authority in one read-only PostgreSQL query over `public.users`; do not duplicate authoritative rules in the browser. Batch comes from student-ID length and position only: exactly 9 digits uses characters 3–4, while 2–8 digits uses the first 2 characters. `batch_name` is intentionally ignored.
3. Return aggregate batch rows plus the minimal row-level export fields in one response so the graph, preview, and CSV describe the same snapshot.
4. Add an authenticated Next.js proxy at `/api/classroom/admin/student-profile-readiness`; the browser never receives or sends the MCC bearer token directly.
5. Build a dedicated `/admin/student-profiles` page and add it to the existing admin tool navigation.
6. Use semantic HTML/CSS bars animated through installed Motion wrappers instead of adding another chart dependency. Visible counts and text labels remain the accessible chart alternative.
7. Generate CSV in the browser from the current filtered rows. Quote every field and prefix spreadsheet-formula-leading values with an apostrophe.
8. Default to batches 22–26; validate a bounded two-digit range on the server and swap reversed endpoints.

## Rollback

Revert the dedicated controller export, route registration, Next proxy, admin page/client, Navbar entry, and task documentation. No database or data rollback is required.
