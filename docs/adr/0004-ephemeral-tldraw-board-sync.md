# ADR-0004: Ephemeral tldraw Board Sync

Status: Accepted
Date: 2026-07-25
Task ID: classroom-team-topic-board-chat-20260725

## Context

The classroom board must use tldraw and live WebSocket sharing. Trainers can start a broadcast, students can join and see it, and the app should not permanently save board contents. The current server is Bun/Hono; adding separate Cloudflare infrastructure would be larger than the approved task.

## Decision

Host tldraw sync inside the existing Bun/Hono server using `@tldraw/sync-core` and Hono's Bun WebSocket helper.

Use one in-memory `TLSocketRoom` per active board room. Store only board session metadata in PostgreSQL. Do not persist drawing snapshots or uploaded assets. Trainers/admins join with edit rights; students join readonly. Clients fetch a short-lived board join token over authenticated HTTP, then connect through `useSync` with a dynamic WebSocket URI.

## Consequences

Positive:
- Satisfies live sharing without public demo rooms.
- Avoids hand-rolled tldraw conflict resolution.
- Honors no permanent board save.
- Keeps authorization under existing classroom access rules.

Negative:
- Board contents disappear on server restart.
- Multiple server processes require sticky routing or a future shared sync backend.
- Image/video uploads should be blocked or deferred until asset storage is designed.
- WebSocket deployment/proxy settings must be verified.

## Alternatives Considered

- tldraw demo sync: rejected because rooms are public to anyone with the room id and meant for prototyping.
- Cloudflare tldraw sync template: strong production option, but adds Durable Objects/R2 and persistent storage not requested here.
- Raw custom WebSocket sync: rejected because tldraw sync already handles lifecycle, conflict resolution, presence, chunking, and reconnection.

## References

- `docs/rsd/classroom-team-topic-board-chat-20260725-rsd.md`
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`
- `https://tldraw.dev/docs/sync`
- `https://tldraw.dev/reference/sync/useSync`
- `https://tldraw.dev/reference/sync-core/TLSocketRoom`
- `https://hono.dev/docs/helpers/websocket`
- `https://bun.com/docs/runtime/http/websockets`
