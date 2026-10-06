# Classroom Live Stop Polling RSD

Status: Approved
Task ID: classroom-live-stop-polling-20260726
Owner: OpenCode
Last updated: 2026-07-26
Delivery mode: Auto

## User Request

Switching away from the browser tab and returning to a classroom live page triggers chat, classroom detail, problem, and server-action requests, causing broad rerenders. Stop polling and visibility-triggered refetch behavior in the classroom live experience.

## Goal

Classroom live pages should not refetch data or post IDE activity merely because the browser tab becomes visible/focused again, and should not poll chat/details/IDE activity on intervals.

## Acceptance Criteria

- [x] Remove classroom live chat/details interval polling.
- [x] Remove classroom live `visibilitychange` refetch behavior.
- [x] Remove trainer IDE activity interval polling.
- [x] Remove IDE focus/blur/visibility activity posts.
- [x] Keep initial load and explicit user/action refresh behavior.
- [x] Targeted lint passes.

## Non-Goals

- Do not remove explicit Refresh buttons.
- Do not remove WebSocket streams used for live IDE viewing.
- Do not remove non-network timers such as countdowns elsewhere in the app.
