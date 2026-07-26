# Classroom Live Stop Polling Task Plan

Status: Approved
Task ID: classroom-live-stop-polling-20260726
Last updated: 2026-07-26
Delivery mode: Auto

## Tasks

- [x] Locate interval and visibility-triggered fetches under `client/src/app/classroom/live/[id]`.
- [x] Remove `ClassroomLiveClient.js` chat/details polling and visibility refetch burst.
- [x] Keep initial classroom load and chat load on class selection.
- [x] Remove `ClassroomLiveClient.js` IDE activity polling; keep one fetch when IDE monitor becomes active.
- [x] Remove `ClassroomIdePanel.jsx` heartbeat and browser focus/visibility activity posting.
- [x] Run targeted ESLint and `git diff --check`.
