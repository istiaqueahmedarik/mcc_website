# Trainer Student Classroom Threads Realtime Implementation Review

Status: Ready for user implementation-review gate
Task ID: trainer-student-classroom-threads-realtime-20260731
Last updated: 2026-07-31
Delivery mode: Manual

## Gate State

Satisfied gates:
- RSD approved on 2026-07-31.
- Technical decisions and ADR-0008 approved on 2026-07-31.
- Full task plan and dependency graph approved on 2026-07-31.

Pending gate:
- User approval of this implementation review before final merge, stage, commit, push, or cleanup actions.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: gate policy, artifact locations, verification scope, security review
  Evidence: implementation review must be approved before final merge.
  Confidence: High
- Source: `docs/rsd/trainer-student-classroom-threads-realtime-20260731-rsd.md`
  Used for: user-visible requirements and acceptance criteria
  Evidence: Updates first/default, Threads one classroom chat per student, Settings priority changer, safe file sharing, Supabase Realtime, system bubbles.
  Confidence: High
- Source: `docs/decisions/trainer-student-classroom-threads-realtime-20260731-technical-decisions.md`
  Used for: architecture constraints
  Evidence: server-authorized APIs, private Supabase Storage, opaque realtime invalidation, old problem threads legacy/inert.
  Confidence: High
- Source: `docs/tasks/trainer-student-classroom-threads-realtime-20260731-task-plan.md`
  Used for: task sequencing and verification list
  Evidence: serial implementation in current workspace and review gate before final integration.
  Confidence: High
- Source: `docs/adr/0008-classroom-student-thread-realtime-model.md`
  Used for: durable student-thread model
  Evidence: new visible conversation surface is student-scoped, not problem-scoped.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: classroom communication entry points
  Evidence: Updates/problem-thread files and controller/routes were already dirty feature files.
  Confidence: High
- Source: `docs/knowledge-base/patterns.md`
  Used for: no hidden polling and read-receipt preservation
  Evidence: update keys remain server-owned and refreshes remain action/realtime driven.
  Confidence: High
- Source: `docs/knowledge-base/quality-rules.md`
  Used for: role-clean student-only paths and server-owned authorization
  Evidence: thread list/access filters trainer/admin/pre-enrolled/link-pending identities server-side.
  Confidence: High
- Source: `references/hci-design-rules.md`
  Used for: visible state, feedback, error recovery, and mental-model checks
  Evidence: new UI separates Updates, Threads, and Settings; shows realtime/upload/error state near the chat.
  Confidence: High
- Source: `references/code-quality-rules.md`
  Used for: focused modules and no drive-by churn
  Evidence: new server schema/storage/realtime helper and focused client hook/component instead of broader dashboard rewrite.
  Confidence: High
- Source: Supabase Broadcast docs
  Used for: REST broadcast endpoint shape
  Evidence: broadcast endpoint embeds topic and event path; payload stays opaque.
  Confidence: High
- Source: Supabase Storage docs
  Used for: private bucket and signed URL behavior
  Evidence: private buckets require access control; signed URLs are time-limited access.
  Confidence: High

## Implementation Summary

Server:
- Added `server/src/utils/classroomStudentThreadsSchema.ts`.
- Added runtime additive tables for `classroom_student_threads`, `classroom_student_thread_messages`, and `classroom_student_thread_attachments`.
- Added safe attachment validation, private Supabase Storage upload, signed URL creation, and opaque Supabase Realtime broadcast helpers.
- Added classroom routes:
  - `GET /classroom/:id/student-threads`
  - `GET /classroom/:id/student-threads/:studentId`
  - `POST /classroom/:id/student-threads/:studentId/messages`
  - `POST /classroom/:id/student-threads/:studentId/attachments`
  - `GET /classroom/:id/student-threads/:studentId/attachments/:attachmentId`
- Added server-side access checks for classroom managers and active real students only.
- Mirrored live problem assignments, live submissions, trainer feedback/status changes, topic assignments, topic/resource/problem changes, and topic submissions/reviews into student-thread system bubbles.
- Updated classroom email copy away from old problem-card thread language.

Client:
- Added `client/src/components/ClassroomThreadsTab.js`.
- Added `client/src/hooks/useClassroomThreadRealtime.js`.
- Added `post_form_with_token` for authenticated multipart forwarding.
- Hardened shared authenticated action fetch helpers so backend network failures return `{ error }` instead of crashing root server render.
- Added `Threads` and `Settings` tabs to trainer and student classroom views while keeping `Updates` first/default.
- Moved `PrioritySettings` out of `Updates` into `Settings`.
- Gated legacy problem-thread buttons and floating docks off in `ClassroomLiveClient.js` and `TeamMatrixClient.js`.

## Requirement Traceability

- Updates first/default: satisfied for trainer and student tabs.
- Dedicated Threads tab: satisfied for trainer and student views.
- One classroom chat per student: satisfied through `(classroom_id, student_id)` unique thread rows.
- Student own-thread only: server checks active real student identity before thread access.
- Trainer/admin/manager student list: server lists only active real classroom students.
- System event bubbles: implemented for required problem, topic, submission, feedback, and status events.
- Latest top area plus normal chat flow: `LatestUpdates` strip above the chronological timeline.
- Supabase Realtime: client subscribes to server-returned opaque channel and refetches via MCC API.
- No hidden polling: no interval or visibility refetch was added to the new thread hook/component.
- Safe file sharing: server validates extension, MIME category, size, classroom/thread access, and uses private storage metadata plus signed URLs.
- Settings tab: priority/email settings are rendered in `Settings`.
- Old problem-thread UI inactive: old buttons and floating dock are gated off, with old routes/tables left intact.
- Final verdict ownership: existing submission/status endpoints remain authoritative; thread messages do not update verdicts.

## Security Review

Passed:
- Thread reads/writes are JWT-secured classroom APIs.
- Trainer/admin/approved manager access still uses `canManageClassroom`.
- Student access requires active classroom enrollment, non-trainer, non-admin, and non-pre-enrolled user state.
- Attachment access rechecks thread authorization before signed URL creation.
- Storage paths are scoped by classroom/thread but are not treated as authorization.
- Realtime broadcast payloads exclude message bodies, filenames, storage paths, solution code, student profile data, and private notes.
- Client-supplied role and ownership are not trusted.
- Unsafe file categories and oversized files are rejected server-side.

Residual risk:
- `SUPABASE_CLASSROOM_ATTACHMENTS_BUCKET` / `CLASSROOM_THREAD_ATTACHMENTS_BUCKET` is not set in local env files, so runtime uses the default `classroom-thread-attachments`; that private bucket must exist in Supabase.
- Live Supabase upload/realtime behavior was not browser-tested with real trainer/student sessions in this turn.

## HCI Review

Passed:
- `Updates`, `Threads`, and `Settings` communicate distinct user mental models.
- Trainer thread picker is searchable and bounded.
- Student view opens to the student's own thread.
- System bubbles use badges and centered shape, not only color.
- Human messages use left/right chat bubbles with sender/time metadata.
- Realtime state is visible as connected, offline, reconnecting, or unavailable.
- Upload file chip, removal, send progress, and error states are visible near the composer.
- Off-screen realtime activity shows a `Latest` jump control rather than forcing scroll.
- Keyboard users can tab to student search, thread rows, refresh, attach, composer, send, and latest controls.

Residual risk:
- Authenticated desktop/mobile visual QA was not run, so exact classroom data density and attachment bucket behavior still need a live pass.

## Code-Quality Review

Passed:
- New schema/storage/realtime concerns are isolated in `classroomStudentThreadsSchema.ts`.
- Realtime setup/cleanup is isolated in `useClassroomThreadRealtime`.
- The main classroom file receives small tab integration and a legacy gate instead of a broader rewrite.
- File validation rules are centralized server-side and mirrored only as client hints.
- Event mirroring uses shared student-thread helper functions rather than repeated raw message-table inserts at every mutation point.
- No destructive DDL or old problem-thread table deletion was added.

Residual complexity:
- `server/src/controllers/classroomController.ts` remains large and now owns both legacy problem-thread compatibility and new student-thread APIs. A future approved refactor could move classroom thread controllers into a focused module.

## Verification

Passed:
- `server`: `bun build src/index.ts --target=bun --outdir ..\build-check-student-threads`
- `server`: repeated bundle smoke after client/server integration with `..\build-check-student-threads-2`
- `client`: targeted ESLint for `ClassroomThreadsTab.js`, `useClassroomThreadRealtime.js`, `ClassroomLiveClient.js`, `TeamMatrixClient.js`, and `action.js`
- `client`: targeted ESLint for the runtime fetch hardening path: `action.js`, `Navbar.js`, and `theme-provider.js`
- `client`: `npm run build`
- `client`: `npm run lint`
- `repo`: `git diff --check`
- `repo`: `rg -n "setInterval|visibilitychange|refetchInterval|poll" ...` found only existing non-polling comments in `ClassroomLiveClient.js`.
- Env-name check: server/client env files contain Supabase URL/anon/service key names, but no explicit classroom attachment bucket name.

Client lint warnings:
- 10 pre-existing warnings remain in unrelated files: landing admin/useEffect, ICPC admin/useEffect, several `<img>` warnings, LiveReportTable dependencies, typing waiting-lobby memo dependency, and TextGenEffect dependencies.

Not run:
- Authenticated trainer/student browser QA.
- Live Supabase attachment upload/download.
- Two-browser realtime delivery.

Reason:
- This turn does not have trainer/student credentials or confirmation that the private classroom attachment bucket exists.

## Changed Files In Scope

- `server/src/utils/classroomStudentThreadsSchema.ts`
- `server/src/controllers/classroomController.ts`
- `server/src/routes/classroomRoute.ts`
- `client/src/components/ClassroomThreadsTab.js`
- `client/src/hooks/useClassroomThreadRealtime.js`
- `client/src/lib/action.js`
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `client/src/app/classroom/live/[id]/teams/[teamId]/TeamMatrixClient.js`
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`
- `docs/knowledge-base/*` entries updated for this implementation review

Existing dirty/untracked files from prior approved Updates/problem-thread work remain present and were not destructively reverted.

## Gate Request

Manual-mode implementation-review gate is ready. User approval is required before final merge, staging, commit, push, or further integration actions.
