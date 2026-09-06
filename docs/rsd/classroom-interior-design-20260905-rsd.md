# Classroom interior design

Status: approved for implementation by the user on 2026-09-05. The Contests v2 revision was visually approved on 2026-09-06. Dashboard implementation remains a separate scope.

## Intent and existing behavior

A trainer enters a classroom to prepare a session, teach live, review students, or generate contest reports. The room should feel like a calm teaching workspace: clear section names, a short persistent context header, and controls next to the work they affect.

Current entry points: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`, `client/src/components/ClassroomContestPanel.jsx`, and the classroom Updates component. The shell currently has a large description/header, five primary trainer tabs, a More menu, and several dense embedded workspaces. Topics and People already use progressive disclosure; History and Resources already have detail dialogs. Preserve these strengths.

Domain: classrooms, scheduled sessions, problem assignments, submissions, topics, groups, standings, attendance, report freshness. Visual direction: existing Inter typography and semantic theme tokens; neutral charcoal/white surfaces, blue primary actions, green verified outcomes, amber work requiring attention, red active-live/destructive status, violet group distinctions. Retain theme support; the wireframe is a structural proposal rather than a new palette specification.

Signature: the live session pairs the current problem set with a student review inspector, keeping teaching and review in one context. Avoid three generic defaults: decorative KPI walls, a new permanent sidebar duplicating tabs, and every tool appearing as a primary button.

## Navigation and shared shell

- Preserve primary trainer tabs: Updates, Live, Topics, People, Contests. Contests must remain visible. Preserve the student navigation and permissions.
- Keep More for Threads, Board, Progress Matrix, Schedule, Attendance, and Settings. Provide the same commands in visible menus and optional context menus; right-click is never required.
- Compact header: dashboard/classroom breadcrumb, room title, one-line trainer/roster context, truthful active-session status, and Manage. Long titles wrap; descriptions move to a details disclosure rather than consuming every tab's first screen.
- A slim session strip can link to Live while working elsewhere. Only persisted active class state is Live; a meeting link alone is not.
- Section URLs must support refresh, Back/Forward, and dashboard deep links. Preserve existing tab values; add optional selected topic, contest room, or student state only with validation and authorization. Never put provider credentials in URLs.
- Mobile uses two rows of labeled primary tabs when necessary so Contests is visible without a hidden horizontal target. More remains a labeled control. Tablet and laptop retain a single row where it fits.

## Screen A: Updates / arrival

Lead with a compact next-session or active-session card and a small Needs attention list. Show exact session name, status, local time/timezone, and a contextual Prepare/Open live action. Keep the existing read/mark-read Updates feed as the main content, independently scrollable and keyboard-accessible with its Load more fallback. The current API has no announcement-create mutation, so the illustrative composer is outside this implementation. History and Resources stay discoverable buttons that open the existing dialogs. Schedule is accessible from next-session context and More.

Attention items must correspond to real pending work: join requests, submitted work awaiting verification if supported, and report freshness. Show separate meanings and counts; do not sum incompatible concepts into a fabricated engagement score. Empty/no upcoming session offers Schedule session. Fetch failure offers Retry without pretending the room is empty.

## Screen B: Live teaching

- Session toolbar shows persisted class name/status, start time, meeting/board access, and an explicitly separated End session action. End session uses the existing confirmation and authorization.
- A labeled Assign problem button opens the current assignment form in a focused dialog; preserve individual/group targets, timers, hints, tags, previews, imports, and validation.
- Main panel is the existing assigned-problem/student progress list, searchable with clear All / Awaiting review filters. Show exact status text, not color alone.
- Selecting work opens an inspector at the right on wide screens, and an accessible dialog/sheet on mobile. The inspector includes selected student/group, problem, submission/code, notes, hints, thread access, and existing verify/return actions. No invented grading or rejection semantics.
- Inspector is one selection at a time, internally scrollable, with a close action returning focus to the source row. Keyboard selection has no decorative animation. Unsaved notes warn before navigation.
- The idle state leads to a scheduled class or Schedule session instead of listing many equally prominent Start buttons.

## Screen C: Contests

- Preserve independent contest rooms, providers, persisted manual ordering, mapping, scoring, report sharing, and exports.
- Preserve the established desktop split: a bounded, independently scrollable room list on the left and the selected room/report workspace on the right. The rail is 280px so it reads as navigation that serves the report. On mobile it stacks above the selected room actions and report.
- The room list has a visible local Sort by control. Name A-Z is the default, using deterministic case-insensitive lexicographic ordering. Name Z-A, Most contests, and Fewest contests are also available. Sorting derives a new list without mutating the API response, does not persist server-side, and keeps selection tied to the room ID, including validated URL restoration.
- Each room summary shows its name, Private/Shared state, contest count, and readiness based only on configured contests and fetched snapshots. Add room remains visible. Edit and Delete remain adjacent to the room list; deletion retains the existing busy-state guard.
- The selected-room toolbar keeps Refresh, Generate report, Share, Add contest, and Tools visible. Contest ordering, scoring/merge, mappings, and provider access stay one level deeper in the labeled Tools menu, with contextual visible alerts when action is required.
- Source list is a compact collapsible section above the report. Each source retains provider, last fetch, readiness/failure, fetch, solve override, demerit, edit, delete, and EDU recovery actions.
- Report leads the content area, with Compact/Extended control, search where supported, last generated timestamp, freshness, and Private/Shared state. Keep rank, identity, total solved and contest scores; preserve solved/penalty meaning and current default penalty configuration. Never fabricate scores.
- Stale report keeps the last successful report visible with a warning and Generate again; failed fetch preserves the previous snapshot and shows a row-level recovery action. Provider access dialogs remain transient/session-safe. EDU browser-saved HTML recovery remains available.
- Classroom reports include mapped classroom participants only. Mapping/settings operations remain trainer-authorized. Adding UI shortcuts must not weaken access checks.
- On mobile the report scrolls inside a labeled focusable region; surrounding controls and page never overflow. Keep identity columns readable and expose a per-row detail action if needed.

## Screen D: Topics and People

Topics retains its scan-first grid. Each card has title, module, problem/resource counts, assignment status and one Open topic action. Create topic is the single primary toolbar action. The selected topic dialog organizes Overview / Problems / Resources / Assignments, preserving current dialogs and avoiding duplicate inline copies. Counts need existing real data, not assumptions.

People retains Students / Groups. One search and contextual filter row precedes compact roster rows; each row shows name/ID, group, meaningful account/verification status and a labeled action menu. Pending joins are a separate review view/action with a count. Student/group details open the existing focused dialog; provider handles and attendance detail stay there. Use existing add/pre-enroll/import/substitute flows, not new registration behavior.

## Delivery sequence after design approval

1. Shared shell and URL-backed section state; preserve handlers and extract only touched presentation components.
2. Updates arrival panel and discoverable History/Resources/Schedule actions, backed by existing data.
3. Live workspace and focused inspector while preserving assignment, notes, hints and verification behavior.
4. Contest room rail, local sorting, selected-room toolbar, source disclosure, and report workspace; no scoring/provider algorithm changes.
5. Topic/People consistency, mobile refinements, and selected-item deep links where useful.

Dashboard work may add the narrow tab deep-link support needed for its approved shortcuts before this larger design is implemented.

## Acceptance and verification

- Existing trainer/student roles, joins, substitute management, Discord gating and classroom isolation remain enforced server-side.
- Every existing task remains reachable with visible controls and keyboard. Radix tabs/dialogs restore focus; expensive tab panels may use manual activation to avoid fetches during arrow-key navigation.
- Verify mobile 390px, laptop 1366px and wide 1920px; long titles, 0/1/many records, table overflow, pending requests, no live class, stale report, partial failures and expired provider access.
- 44px mobile targets, visible focus, explicit labels, sufficient contrast, reduced-motion behavior, no layout-shifting loading blocks; animate opacity/transform only where useful.
- Verify real app state separately from sample-data mockups. Focused lint, relevant behavioral tests and production build precede authenticated browser evidence.
- Follow https://vercel.com/design/guidelines and https://www.radix-ui.com/primitives/docs/components/tabs.

## Review artifact

Editable design: `/home/arik/Documents/Classroom Interior Design.tldraw`. The approved contest revision is page `05 · Contests v2 - review`; the original design pages remain intact. All example names/counts are illustrative, not fetched student data. The approved implementation is recorded in `docs/reviews/classroom-interior-design-20260905-implementation-review.md`.
