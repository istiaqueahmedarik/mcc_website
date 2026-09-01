# Classroom Codeforces EDU Lesson Standings Implementation Review

Date: 2026-09-01

## Review Flow

1. Source and crawler: `server/src/services/codeforcesContestService.ts` distinguishes numeric contests from EDU lessons, crawls bounded authenticated HTML pages, parses problems/rows, filters classroom handles, and normalizes solved/penalty data. Its tests cover URL normalization, HTML parsing, pagination, weighting, filtering, and invalid sessions.
2. Session safety: `server/src/utils/codeforcesSession.ts`, the classroom controller/routes, and the Next route handlers implement header-first/cookie-second resolution and an HTTP-only 12-hour cookie. No session value enters Postgres or report data.
3. Classroom integration: `server/src/controllers/classroomContestController.ts` loads verified roster/override handles before an EDU fetch, passes only those targets to the crawler, applies existing canonical classroom mappings, and persists the normal snapshot contract.
4. Trainer UI: `client/src/components/ClassroomContestPanel.jsx` accepts EDU standings URLs, shows an EDU-specific missing-session state, and adds connect/clear controls inside the existing Codeforces Access dialog with password masking and explicit storage guidance.
5. Database rollout: `docs/sql/classroom-codeforces-edu-lesson-standings-20260901.sql` expands only the existing identifier check constraint; it does not change grants, RLS, tables, or indexes.
6. Wide-workspace follow-up: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js` raises the classroom shell maximum from 1060px to 1600px so contest controls and report columns use desktop and ultra-wide space while retaining the existing fluid width and responsive padding below the cap.

## Security And Privacy Review

- Authorization remains classroom-manager owned for Hono session endpoints and all contest mutations/fetches.
- The browser session is HTTP-only, SameSite=Lax, Secure in production, expires after 12 hours, and is forwarded only during snapshot fetches.
- Crawl URLs are constructed from validated numeric course/lesson IDs and alphanumeric list keys on a fixed Codeforces origin, preventing arbitrary URL fetching.
- Provider HTML is bounded to 4 MiB per page and parsed as data; it is never rendered.
- Only classroom-target handles are retained. Full global EDU standings are not persisted.
- Missing/expired/challenged responses fail before snapshot insertion.

## Verification

- Supplied session returned the authenticated `Standings - Codeforces` lesson page with 22 problem columns; the value was not saved or printed.
- `bun test` in `server/`: 52 passed, 0 failed.
- Bun bundles passed for the classroom controller, classroom route, and Codeforces service.
- Targeted ESLint passed for the classroom panel and both Next contest session/proxy routes.
- `npm run build` in `client/` passed on Next.js 16.1.1.
- `git diff --check` passed.
- The Supabase `classroom_contests_external_id_check` migration was applied and verified on 2026-09-01: the constraint is validated, zero existing rows violate it, supported numeric/EDU/friends/list identifiers pass, and malformed identifiers fail.
- Targeted ESLint and a full client production build passed after the wide-workspace adjustment.

## Rollout

1. Database migration applied and verified on 2026-09-01.
2. Deploy/restart server and client.
3. Connect a trainer Codeforces JSESSIONID, add the EDU standings URL, fetch its snapshot, and generate the classroom report.
4. Prefer a Codeforces `friends=true` or `list=<readKey>` standings URL for large lessons when available.
