# Classroom Team Topic Board Chat Implementation Review

Status: Ready for approval
Date: 2026-07-25

## Scope Checked

- Team-topic assignment is separated from live-class problem assignment.
- Topics are prebuilt units with resources and problems.
- Trainers can set problem difficulty metadata for topic problems.
- Students can update assigned topic problem progress.
- Trainer analytics derives team strength from solve counts.
- tldraw board broadcast uses short-lived join tokens and server readonly sockets for students.
- Class chat moved to fixed bottom-right bubble with `/pet.lottie`.

## Verification

- `server`: `bun build src/index.ts --target=bun --outdir .codex-build-20260725161716` passed.
- `client`: `npx eslint 'src/app/classroom/live/[id]/ClassroomLiveClient.js' 'src/app/classroom/live/[id]/ClassroomBoardCanvas.jsx'` passed.
- `client`: `npm run build` passed.

## Security Review

- Topic and board management endpoints require `canManageClassroom`.
- Student assignment/progress endpoints require classroom access and team membership checks.
- Board WebSocket route is outside JWT middleware only because browser WebSocket cannot send bearer headers; access is controlled by single-use, 30-second join tokens minted through authenticated HTTP.
- Students join tldraw rooms as readonly sessions; trainer role is checked server-side.
- Board drawings are in memory only; DB stores session metadata, not board contents.

## HCI Review

- Topic assignment is now its own trainer tab, not hidden inside live-class problem assignment.
- Topic unit creation separates resources, problems, and team assignment controls.
- Student view shows assigned topic units before live challenges.
- Board panel has explicit start/stop/refresh controls and a view-only student state.
- Chat no longer consumes the right column; it is available as a persistent bottom-right bubble with the pet animation.

## Residual Risk

- Existing running `bun run --hot src/index.ts` and Next dev server should hot reload, but a manual restart may be needed if a process does not reload dependency graph changes.
- The npm install reported existing dependency audit findings; no audit remediation was in scope.
- Live multi-browser tldraw collaboration was build-validated but not manually exercised with two authenticated users.
