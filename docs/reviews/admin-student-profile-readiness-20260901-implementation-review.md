# Admin Student Profile Readiness Implementation Review

Status: Approved
Task ID: admin-student-profile-readiness-20260901
Reviewed: 2026-09-01

## Outcome

The protected `/admin/student-profiles` tool now visualizes profile readiness, identifies missing required fields, previews matching student rows, and exports the current filtered view as CSV. It defaults to batches 22–26 and currently finds 86 complete profiles while also showing the 36 profiles that need attention. Batch classification is owned by student-ID length/position and does not depend on `batch_name`.

## Reviewer Flow

1. `server/src/controllers/classroomController.ts` owns batch classification, four-field completeness, minimal row selection, batch aggregation, and admin revalidation.
2. `server/src/routes/classroomRoute.ts` registers the protected read endpoint under the existing JWT/Discord-link middleware stack.
3. `client/src/app/api/classroom/admin/student-profile-readiness/route.js` forwards the browser request with the HTTP-only MCC token and disables caching.
4. `client/src/app/admin/student-profiles/page.js` provides the server-side admin page guard and normalizes initial URL state.
5. `client/src/app/admin/student-profiles/StudentProfileReadinessClient.jsx` renders the range/status/search controls, Motion-backed charts, compact preview, and safe client-side CSV download.
6. `client/src/components/Navbar.js` adds the tool to the existing admin navigation.

## UI Review

| Before | After | Why |
| --- | --- | --- |
| One-off database CSV export | Admin-owned repeatable export surface | Admins can refresh the same policy without database access |
| Complete rows only, no context | Ready/needs-attention comparison by batch | Makes the size and location of profile gaps visible |
| No missing-field diagnosis | Four-field pressure view | Shows whether Codeforces or VJudge details are blocking readiness |
| Static data handoff | URL-backed batch/status controls plus local search | Refresh, Back/Forward, and shared export scopes remain predictable |
| No interaction motion | Short transform/opacity chart entrances through installed Motion | Explains the data arriving without looping or delaying repeated actions |
| No reduced-motion contract | `MotionConfig reducedMotion="user"` and opacity-only fallbacks | Preserves feedback without vestibular movement |
| Unbounded spreadsheet interpretation | Quoted UTF-8 CSV with formula-leading value neutralization | Reduces spreadsheet formula-injection risk |

## Verification Evidence

- Targeted ESLint: passed for the new page, client, proxy, and Navbar.
- Full client lint: passed with 9 existing warnings in unrelated files and 0 errors.
- Client production build: passed; Next.js emitted `/admin/student-profiles` and `/api/classroom/admin/student-profile-readiness` as dynamic routes.
- Server Bun bundle: passed (802 modules).
- Live read query, batches 22–26: 122 total, 86 complete, 36 incomplete; complete counts are 8, 10, 18, 49, and 1.
- Classification QA: `202214027` resolves to batch 22; a 2–8 digit ID uses its first 2 digits; missing, 1-digit, and longer-than-9-digit IDs remain unclassified. `batch_name` does not affect the result.
- Regression QA: Abdullah Al Kafi (`202516060`) is returned as a complete Batch 25 profile even though the stored `batch_name` is department-specific.
- Route authorization: no token returned 401; a signed non-admin request returned 403; a signed admin request returned 200.
- Response minimization: row objects contain only `batch`, the four requested export fields, `complete`, and `missing_fields`.
- Browser QA: passed at 1440×1000 and 390×844 with no page-level horizontal overflow; table overflow stayed inside its labelled focusable region.
- Reduced-motion browser QA: `prefers-reduced-motion: reduce` was detected and the reduced path rendered successfully.
- Download QA: refreshed `students_batches_22_26_complete.csv` with the expected five-column header, 86 data rows, Abdullah included, and no unneutralized formula-leading cells.
- Range/status QA: batches 24–26 contain 29 incomplete profiles under the revised student-ID classification rule.

## Security Review

- Authorization is enforced again in the controller through `requireAdminUser`.
- No email, phone, password, media URL, bearer token, or internal user UUID is returned by the endpoint.
- The client calls a same-origin Next.js proxy and never handles the bearer token.
- The query is parameterized, read-only, and makes no schema/RLS/Data API change.
- Error responses are generic and no profile row is logged.

## Residual Boundary

Production deployment was not performed. Browser QA used the local production client build, live Supabase data, and the local Hono server.
