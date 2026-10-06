# Trainer dashboard update: implementation review

The trainer dashboard now leads directly into searchable classrooms, with pending work in a compact right sidebar on wide screens. The separate Next Session hero and top-right overflow rail are removed. The desktop shell is widened from 1280px to 1440px, while New classroom and Forms remain visibly labeled. Classroom cards expose student counts, latest topic, session timing, pins and contextual actions; a compact list is available. A saved meeting link alone no longer marks a classroom Live.

The user approved the dashboard drawing and requested implementation. The requested subagent investigated in a separate worktree but reached its usage limit before making edits. Root completed implementation in the main workspace. No dashboard deployment or classroom interior redesign is included.

## Review in this order

1. **Data contract and access** — `server/src/controllers/classroomController.ts` enriches only `classroom/list?dashboard=true`, only for current trainer/admin database roles, and only after the existing classroom ownership/substitute/admin selection. `server/src/utils/trainerDashboardSummary.ts` performs three batched reads for roster counts/latest topic, real sessions, and stale reports. The summary contains no student identities, emails, provider credentials or standings. Upcoming scheduled sessions sort ahead of old unstarted schedules. No migration, index, scoring or provider behavior changed.
2. **Request routing** — `client/src/app/api/classroom/list/route.js` uses the existing authenticated proxy helper, which preserves the query string. Previously the dynamic `[id]` proxy handled `list` but discarded query parameters. Direct Hono deployments use the same controller contract. Client fetching rejects responses missing dashboard details rather than rendering false zero counts when the backend is outdated.
3. **Page and workflow** — `TrainerDashboardClient.js` retains profile fetching, create wizard, substitute operations and Discord gating; it owns the wider 1440px header and the two labeled primary actions. The former Motion overflow rail and mobile overflow menu are removed. `TrainerDashboardWorkspace.jsx` renders the revised hierarchy without the Next Session hero: summary chips lead into the classroom workspace and Needs attention occupies the right column at wide breakpoints. Error, empty, loading and no-matches states are separate; failed refresh retains previously loaded data. `page.js` adds the Suspense boundary needed by URL-backed controls.
4. **Preferences and selection rules** — `dashboard-model.mjs` owns literal search, role filtering, live status, ordering and defensive preference parsing. Pins and recent classroom IDs/times are browser-local and scoped by current profile ID. Storage failure degrades to temporary in-memory preferences with a visible note. Search/filter/view/sort live in the URL and survive refresh.
5. **Destination behavior** — `ClassroomTabUrlSync.jsx` reads role-allowed sections and restores them on browser Back/Forward through the existing classroom handlers. Dashboard cards construct `/classroom/live/{id}` links from the selected classroom ID. In `ClassroomLiveClient.js`, the loaded classroom's back-link returns trainers to `/trainer/dashboard` and students to `/classroom/list`. `ClassroomContestPanel.jsx` accepts the requested contest room only if it appears in the authorized fetched room list. Dashboard report actions therefore open the corresponding room, and Schedule/People links select the intended tab.
6. **Separate classroom proposal** — `docs/rsd/classroom-interior-design-20260905-rsd.md` and `/home/arik/Documents/Classroom Interior Design.tldraw` contain a proposed interior design, not an implemented or approved redesign. The canvas has four pages and 333 editable shapes (`classroom-design-1`–`333`): Updates with desktop/mobile, Live, Contests, and Topics/People. The arrival-page screenshot was inspected and canvas lint returned no issues.

## Verification evidence

- Five Node behavior tests pass: meeting-link/live distinction; owned/co-training overlap; literal topic search; pins/recent/session ordering; corrupt/invalid preference recovery.
- Focused ESLint passes for all changed client source/test files, including both destination adapters and the list proxy.
- Bun controller bundle passes. A read-only live database check queried three existing classrooms through the summary helper; all three returned valid summaries/counts. No roster identities or summary values were printed.
- Client production build passed again after the mobile containment/proxy fixes; the final route output includes `/api/classroom/list` and `/trainer/dashboard` and contains no temporary preview route.
- Playwright with isolated sample API responses passed 15 checks: status correctness, search, URL state, clear filters, pin/view persistence, report destination, co-trainer dialog focus restoration, no page/tool overflow at 390/1366/1920px, and separate empty/error states. No browser page errors occurred. Temporary preview route was removed after testing; Playwright and its fixture live outside the repository.
- The actual Next list endpoint returns 401 without a session, confirming route registration and its unauthenticated guard. This alone does not verify authenticated proxy forwarding.
- `git diff --check` passes.

The follow-up hierarchy/navigation revision passed the five dashboard model tests, focused ESLint for both dashboard components and `ClassroomLiveClient.js`, the production client build, and `git diff --check`. A fresh isolated Playwright fixture run repeated all 15 interaction/responsive checks at 390, 1366 and 1920px with no page errors or horizontal overflow; visual inspection confirmed the classroom-first layout and right-side attention panel. The temporary preview route was removed afterward. The repository screenshots below predate this follow-up and therefore do not show the revised sidebar placement.

Browser screenshots use **sample data** and are not authenticated real-account evidence:

- [Desktop](assets/trainer-dashboard-desktop-20260905.png)
- [Mobile with secondary menu open](assets/trainer-dashboard-mobile-20260905.png)

## Boundaries and operational notes

Deploy client and server together: the new UI requires the enriched backend response. Authenticated production browser testing, actual create/substitute mutations, and hosted deployment were not performed. Pins do not sync across browsers/devices. Latest topic means latest updated topic, not a new pedagogical current-topic field. Attention currently covers account-link claims and stale existing reports, not every possible classroom task. Existing schedules retain saved dates/status; there is no invented calendar or automatic session transition.

Security review: existing role/ownership selection constrains summary IDs; SQL uses parameterized values; counts replace roster PII; no secrets, new permissions or dependency changes; report-room URL input is checked against authorized fetched rooms. Rollback is a code revert without database changes. New classroom interior implementation requires approval of the separate proposal.
