# Trainer Student Thread Realtime Hardening Performance Implementation Review

Status: Approved by user
Task ID: trainer-student-thread-realtime-hardening-performance-20260802
Last updated: 2026-08-02

## Summary

Implemented the approved trainer/student thread realtime hardening and performance fix. The slow path was mainly caused by request-time schema/index work, broad refetches on realtime signals, stable public channel names, missing list realtime for trainers, and attachment sends broadcasting before attachment metadata was queryable.

The implementation now uses server-issued scoped opaque Realtime channels, lightweight invalidation payloads, incremental message/summary fetches, request-path DDL removal, scoped SQL indexes/RLS/grants, and one ordered attachment broadcast after metadata insert.

## Changed Files

- `docs/rsd/trainer-student-thread-realtime-hardening-performance-20260802-rsd.md`
- `docs/decisions/trainer-student-thread-realtime-hardening-performance-20260802-technical-decisions.md`
- `docs/adr/0010-classroom-student-thread-realtime-hardening.md`
- `docs/tasks/trainer-student-thread-realtime-hardening-performance-20260802-task-plan.md`
- `docs/sql/trainer-student-thread-realtime-hardening-20260802.sql`
- `server/src/utils/classroomStudentThreadsSchema.ts`
- `server/src/controllers/classroomController.ts`
- `server/src/routes/classroomRoute.ts`
- `client/src/lib/action.js`
- `client/src/hooks/useClassroomThreadRealtime.js`
- `client/src/components/ClassroomThreadsTab.js`
- `docs/reviews/trainer-student-thread-realtime-hardening-performance-20260802-implementation-review.md`
- `docs/knowledge-base/project-index.md`
- `docs/knowledge-base/patterns.md`
- `docs/knowledge-base/quality-rules.md`
- `docs/knowledge-base/mistakes.md`

## Requirement Satisfaction

- Realtime exposure hardened: stable public per-thread topics were replaced with server-issued opaque scoped channel names for active thread panels and trainer manager-list views.
- Public table exposure reduced: `anon` and `authenticated` grants were revoked for student-thread tables, RLS was enabled, and service-role/server-side access remains the access model.
- Request-time DDL removed: student-thread request handlers no longer create/alter/drop indexes or tables on reads/writes.
- Trainer list realtime added: manager list views receive lightweight invalidation and fetch only the changed student summary when possible.
- Heavy thread refetch reduced: message realtime now fetches a single changed message by ID when the signal has enough information.
- Attachment ordering fixed: attachment metadata is inserted before the single realtime invalidation broadcast.
- Index gaps fixed: student-thread, attachment, realtime-channel, and touched topic-assignment foreign key/index paths were added in the SQL artifact and applied through Supabase MCP.

## Security And Privacy

- Authorization and permissions: JWT-authenticated Hono routes still authorize classroom manager/student access before issuing channels, summaries, messages, or attachment URLs.
- Realtime payloads: broadcasts contain IDs, event type, kind, and timestamps only; full message bodies and attachment storage paths are fetched through authorized API routes.
- Table grants: focused Supabase verification confirmed no `anon` or `authenticated` grants on `classroom_student_threads`, `classroom_student_thread_messages`, `classroom_student_thread_attachments`, or `classroom_student_thread_realtime_channels`.
- RLS: focused Supabase verification confirmed RLS enabled on those four tables. Supabase advisor now reports `rls_enabled_no_policy` for them, which is expected because the app intentionally uses service-role server access and revoked public grants instead of browser Data API policies.
- Secret handling: no frontend service key usage was added. If any `.env.local` or service/database key values were shared, committed, uploaded, or pasted outside the local machine, rotate those keys.
- Dependency risk: no new runtime dependencies were added.

## Performance Review

- Removed hot-path schema checks from student-thread list/detail/message/attachment routes.
- Moved schema/index/RLS/grant work to `docs/sql/trainer-student-thread-realtime-hardening-20260802.sql`.
- Changed Realtime from broad "reload the thread/list" behavior to incremental fetches:
  - thread panel: `GET /classroom/:id/student-threads/:studentId/messages/:messageId`
  - trainer list: `GET /classroom/:id/student-threads/:studentId/summary`
- Kept fallback full refreshes for malformed/partial signals and fetch failures.
- Removed the extra attachment system-event bubble for ordinary file share, avoiding duplicate broadcasts on attachment send.
- Source scan found no interval or visibility-triggered polling in the touched thread realtime client files.

## Supabase Verification

- Applied scoped SQL through Supabase MCP migrations:
  - `trainer_student_thread_realtime_hardening_20260802`
  - `trainer_student_thread_realtime_channel_fk_indexes_20260802`
  - `trainer_student_thread_topic_assignment_fk_indexes_20260802`
- Focused SQL check confirmed all expected indexes exist for the student-thread, attachment, realtime-channel, and touched topic-assignment paths.
- Focused SQL check confirmed RLS enabled and public grants revoked on the four student-thread/realtime tables.
- Security advisor still reports unrelated project-wide issues, including security-definer landing views, older Postgres patch availability, and many non-thread public tables with RLS disabled.
- Performance advisor still reports unrelated project-wide missing indexes/duplicate indexes. It also reports newly-created scoped indexes as unused until production traffic exercises them; do not drop them based only on immediate post-migration advisor output.

## Verification

- `cd client && npx eslint src/components/ClassroomThreadsTab.js src/hooks/useClassroomThreadRealtime.js src/lib/action.js`
  - Passed with no output.

- `cd client && npm run build`
  - Passed. Next.js production build completed successfully.

- `cd server && bun build src/index.ts --target=bun --outdir ../build-check-thread-hardening`
  - Blocked: `bun` is not installed in this shell.

- `cd server && npx --yes --package typescript tsc --noEmit --pretty false`
  - Blocked: latest temporary TypeScript rejects the repo's existing `moduleResolution: "node"` config.

- `cd server && npx --yes --package typescript@5.8.3 tsc --noEmit --pretty false`
  - Blocked by existing repo/tooling type issues involving Bun/DOM declarations, missing tldraw/lodash types, existing controller typings, and `src/types/shims.d.ts`.
  - This check did catch an introduced missing import for `CLASSROOM_STUDENT_THREAD_ATTACHMENT_BUCKET`; that issue was fixed and did not recur.

- Source scans:
  - No remaining `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, `CREATE EXTENSION`, `DROP INDEX`, or `DROP CONSTRAINT` statements in `server/src/utils/classroomStudentThreadsSchema.ts` or `server/src/controllers/classroomController.ts`.
  - No `setInterval`, `setTimeout`, or `visibilitychange` in `client/src/components/ClassroomThreadsTab.js` or `client/src/hooks/useClassroomThreadRealtime.js`.

- `git status` / `git diff --check`
  - Blocked: `/home/arik/mcc_website` is not exposed as a Git repository in this workspace.

## Manual Actions

- For future or fresh environments, run/replay `docs/sql/trainer-student-thread-realtime-hardening-20260802.sql` or convert it into the repository's normal migration workflow.
- Run the Bun server smoke check in an environment where Bun is installed.
- Rotate Supabase service/database keys only if any env values were exposed outside this local machine or committed/uploaded.
- Do a quick browser smoke with two users if possible: trainer thread list open plus one student thread open, send a text message and an attachment, and confirm the trainer list updates without a full manual refresh.

## Residual Risk

The server runtime smoke could not be completed in this shell because Bun is unavailable and the repo's generic TypeScript check is currently blocked by existing configuration/dependency type noise. The client build and Supabase-focused checks passed, and one introduced server import issue was caught and fixed, but an authenticated end-to-end Realtime browser test remains the best final confidence check.

## Gate

Implementation review was approved by the user before final acceptance under `AGENTS.md`.
