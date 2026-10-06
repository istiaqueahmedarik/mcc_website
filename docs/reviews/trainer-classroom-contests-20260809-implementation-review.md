# Trainer Classroom Contests Implementation Review

Date: 2026-08-09

## Scope

Implemented classroom-scoped VJudge contest reports for trainer classrooms without changing the global contest-report tables or routes.

## Changed Entry Points

- SQL: `docs/sql/trainer-classroom-contests-20260809.sql`
- Server helper: `server/src/services/vjudgeContestService.ts`
- Server controller: `server/src/controllers/classroomContestController.ts`
- Server routes: `server/src/routes/classroomRoute.ts`, `server/src/routes/vjudgeRoute.ts`
- Next API routes:
  - `client/src/app/api/classroom/[id]/contests/[...path]/route.js`
  - `client/src/app/api/classroom/[id]/contests/vjudge-session/route.js`
- Trainer UI: `client/src/components/ClassroomContestPanel.jsx`
- Classroom mount: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- Shared report table: `client/src/components/ReportTable.js`

## Review Notes

- Classroom contests use only lowercase `classroom_contest_*` tables and never write to `Contest_report_room`, `Contest_room_contests`, `Demerit`, or `Public_contest_report`.
- The classroom contest tables live in `public`, so RLS is enabled on all six tables. Direct Data API access has no broad anon/authenticated policy; the Hono routes remain the authorization surface.
- Mutating endpoints and VJudge fetch require classroom manager access. Shared report reads require classroom access, and students can read only when `visible_to_students` is true.
- The Next catch-all proxy forwards the MCC JWT to all classroom contest endpoints and forwards `vj_session` only to `rooms/:roomId/items/:contestItemId/fetch`.
- VJudge passwords are not persisted in the classroom flow. The session route stores `vj_session`, optional username, and clears any legacy `vj_session_password` cookie.
- `ReportTable` keeps the existing global live-share modal by default. Classroom usage passes a private share control and disables global live share.
- Student classroom live now includes read-only Contests and Contest Progress tabs. Students see only shared classroom reports; the current student's mapped VJudge/classroom row is highlighted when available.
- Classroom contest dialogs use larger, scrollable workbench layouts for dense mapping/demerit flows, and the report table defaults "Remove Worst Contests" to 0.
- Demerit tooltip text no longer uses `innerHTML`; demerit reasons render as plain text in the browser tooltip.

## Verification

- `bun --check src/services/vjudgeContestService.ts`
- `bun --check src/controllers/classroomContestController.ts`
- `bun build src/routes/classroomRoute.ts --target=bun --outfile=/tmp/classroomRoute-check.js`
- `bun build src/routes/vjudgeRoute.ts --target=bun --outfile=/tmp/vjudgeRoute-check.js`
- `bun build src/controllers/classroomContestController.ts --target=bun --outfile=/tmp/classroomContestController-check.js`
- `bun build src/services/vjudgeContestService.ts --target=bun --outfile=/tmp/vjudgeContestService-check.js`
- `npx eslint "src/components/ClassroomContestPanel.jsx" "src/components/ReportTable.js" "src/app/classroom/live/[id]/ClassroomLiveClient.js" "src/app/api/classroom/[id]/contests/[...path]/route.js" "src/app/api/classroom/[id]/contests/vjudge-session/route.js"`
- `npm run lint` passes with existing warnings.
- `npm run build`
- Live DB smoke after applying SQL: all six `classroom_contest_*` tables exist, RLS is enabled, authenticated room/item/handle/demerit CRUD works, generated report creation works from a seeded snapshot, private share toggles, and all smoke rows were cleaned up.
- Follow-up smoke: focused client ESLint, server controller/build checks, student private-vs-shared report API access, report cleanup, and Next classroom live route check passed after the student tabs and modal redesign.

## Follow-Up

- Manual VJudge fetch/share authorization scenarios still need an authenticated trainer/student browser pass against a seeded classroom.
