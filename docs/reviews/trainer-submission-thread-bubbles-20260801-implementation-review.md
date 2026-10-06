# Trainer Submission Thread Bubbles Implementation Review

Status: Ready for user implementation-review gate
Task ID: trainer-submission-thread-bubbles-20260801
Last updated: 2026-08-01
Delivery mode: Manual

## Gate State

Satisfied gates:
- Grill Mode answers received on 2026-08-01.
- RSD approved on 2026-08-01.
- Technical decisions and ADR-0009 approved on 2026-08-01.
- Full task plan and dependency graph approved on 2026-08-01.

Pending gate:
- User approval of this implementation review before final merge, staging, commit, push, or cleanup actions.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: manual gate policy, artifact locations, verification, and security checklist.
  Confidence: High
- Source: `docs/rsd/trainer-submission-thread-bubbles-20260801-rsd.md`
  Used for: acceptance criteria and non-goals.
  Confidence: High
- Source: `docs/decisions/trainer-submission-thread-bubbles-20260801-technical-decisions.md`
  Used for: student-thread bubble model, metadata shape, and server validation rules.
  Confidence: High
- Source: `docs/adr/0009-student-thread-submission-reference-metadata.md`
  Used for: durable submission-reference metadata contract.
  Confidence: High
- Source: `docs/knowledge-base/*`
  Used for: active student-thread model, no-hidden-polling rule, server-owned policy, and trainer UX patterns.
  Confidence: High
- Source: `client/src/components/ClassroomThreadsTab.js`
  Used for: shared thread panel, composer, attachment, realtime, and message rendering behavior.
  Confidence: High
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: live and topic pending-submission entry points.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: student-thread message/attachment endpoints and authoritative live/topic submission rows.
  Confidence: High

## Implementation Summary

Server:
- Added optional `submissionReference` handling to student-thread text and attachment endpoints.
- Added server-side parsing, validation, and canonicalization for live `class_problems` references and topic `classroom_topic_problem_progress` references.
- Persisted validated context as `metadata.submission_reference` on student-thread messages.
- Rejected invalid, stale, cross-student, or cross-classroom references before message insertion; attachments validate the reference before upload.
- Preserved normal student-thread sends without requiring a submission reference.
- Included `student_mist_id` on trainer live problem rows so bubble headers can keep the existing `Name [ID]` display convention.

Client:
- Added `client/src/components/StudentThreadBubbleDock.js` for normal student-thread bubbles and submission-context bubbles.
- Reused `ClassroomThreadsTab` in bubble mode instead of rendering legacy `ProblemThread`.
- Added visible submission-reference chips on referenced messages for trainer and student.
- Added `Open bubble` from the normal `Threads` panel.
- Added live pending submission and topic pending submission `Thread` actions that open the submitted student's bubble with context.
- Added duplicate bubble keys by classroom, student, and optional submission identity.
- Reset the composer when either the selected student or submission reference changes.
- Replaced the inline horizontal event strip with an `Events` modal so activity history no longer consumes the chat pane.
- Bounded the trainer/student thread panel, thread list, bubble panel, and composer so long chat histories scroll inside the component instead of expanding the whole page.

Follow-up design and scale pass:
- Removed flashing/pulsing treatment from pending-submission and verification badges.
- Removed visible item/count badges from thread rows, pending-submission entry points, event triggers, and the Updates tab header.
- Removed the trainer tab-header pending-submissions shortcut entirely; pending review remains available from the Topics workflow.
- Removed the visible realtime status tag while preserving the existing event-driven refresh hook.
- Changed student-thread message loading to fetch the newest page first, with explicit `Load older messages` pagination.
- Changed thread event history to lazy-load in the modal with explicit `Load older events` pagination.
- Changed the Updates tab to lazy-load only when the tab is active, fetch a bounded page, and expose `Load more updates`.
- Changed the Updates card to a fixed-height flex container with an internal scroll viewport.
- Removed thread-list message counting from the summary query because the UI no longer displays item counts.

## Requirement Traceability

- Live class pending submissions expose a thread action: satisfied in live problem pending rows.
- Topic pending submissions expose a thread action: satisfied in pending topic submission cards.
- Bubble uses student-thread APIs, not `ProblemThread`: satisfied through `StudentThreadBubbleDock` and `ClassroomThreadsTab` bubble mode.
- Live submission messages persist validated metadata: satisfied through `resolveStudentThreadSubmissionReference`.
- Topic submission messages persist validated metadata: satisfied through `resolveStudentThreadSubmissionReference`.
- Invalid/stale/cross-scope references are rejected: satisfied before message insert and before attachment upload.
- Reference UI visible to trainer and student: satisfied through message `SubmissionReferenceChip`.
- Normal messages continue without references: satisfied by optional payload behavior and normal `Open bubble`.
- Bubble deduplication: satisfied by `getStudentThreadBubbleKey`.
- Event list is modal-based instead of inline: satisfied through `ThreadEventsModal`.
- High-volume trainer/student chat stays bounded: satisfied through fixed panel heights and internal scroll viewports.
- High-volume trainer/student chat avoids initial full-history fetches: satisfied through paged student-thread messages and explicit older-message loading.
- Thread summaries avoid full count aggregation: satisfied by using last-message previews without `COUNT(*)` item totals.
- Thread events avoid initial full-history fetches: satisfied through events-only paged API loading from the modal.
- Updates tab avoids eager full-list fetches: satisfied through active-tab lazy loading and paged updates.
- Flashing/count-heavy notification UI is removed: satisfied through static pending labels and label-only events/updates controls.
- The trainer tab-header pending notification is removed: satisfied by deleting the header shortcut button.
- No hidden polling: no interval, visibility, or refetch polling was added.
- Attachments inherit submission reference: satisfied by multipart `submissionReference` handling.
- Verdict ownership unchanged: no approval/rejection/status endpoint was changed by chat sends.

## Security Review

Passed:
- Student-thread access still goes through JWT-authenticated classroom APIs.
- The server validates the route classroom, selected thread student, source type, authoritative row id, and current `pending_approval` status.
- Client-supplied labels are not persisted as authority; canonical metadata is built from database rows.
- Referenced metadata excludes solution code, private storage paths, hidden trainer notes, and broad user profile data.
- Attachment upload runs only after reference validation succeeds.
- Bubble keys are UI state only and are not used for authorization.
- Existing private attachment access and signed URL checks remain server-owned.

Residual risk:
- Negative reference cases were reviewed statically and covered by build/lint, but not exercised against a live database in this turn.
- Authenticated trainer/student browser QA was not run because no live credentials/session were provided.

## HCI Review

Passed:
- Pending submission `Thread` actions sit beside review actions without replacing approve/reject controls.
- Bubble headers show the student scope and, when present, the referenced submission context.
- Referenced messages use a file icon, type label, status label, title, context, and time instead of color-only meaning.
- Normal thread bubbles omit the reference chip, keeping normal chat distinct.
- Thread events open from a compact header button and are shown in a scrollable modal, avoiding horizontal scrollbars in the main chat.
- Message history and composer growth are constrained so trainer and student pages remain usable when a thread has many messages.
- Event and pending controls avoid count badges and pulsing states so the header remains calm during normal trainer work.
- Updates content scrolls inside its card instead of relying on page-level growth.
- The visible realtime badge was removed to reduce low-value status clutter; refresh remains available as an explicit action.
- Draft text is cleared when switching to a different submission context for the same student.
- Close and minimize controls have accessible labels.

Residual risk:
- The floating bubble was validated through build/lint, not a real viewport screenshot with classroom data. A live visual pass should still check overlap on small screens.

## Code-Quality Review

Passed:
- No new dependency was added.
- Submission-reference parsing and validation are centralized near student-thread message insertion.
- The full `Threads` tab and bubble surface share the same panel/composer/realtime code.
- Legacy problem-thread code remains gated and untouched as compatibility code.
- Client helpers build compact reference requests; server owns canonical metadata.
- No status side effects were added to chat message or attachment sends.
- Message, event, and update history now use bounded server pages instead of returning complete history on every open.
- Updates lazy loading is controlled by active tab state from trainer and student tab containers.

Residual complexity:
- `ClassroomLiveClient.js` and `classroomController.ts` are still large shared files. This change kept edits local to existing surfaces, but future approved classroom communication work would benefit from extracting focused modules.

## Verification

Passed:
- `client`: `npx eslint "src/components/ClassroomThreadsTab.js" "src/components/StudentThreadBubbleDock.js" "src/app/classroom/live/[id]/ClassroomLiveClient.js"`
- `client`: `npm run lint`
- `client`: `npm run build`
- `server`: `bun build src/index.ts --target=bun --outdir ..\.codex-build\submission-thread-bubbles-server-20260801`
- `server`: repeated bundle smoke with `..\.codex-build\submission-thread-bubbles-server-20260801-rerun`.
- `server`: repeated bundle smoke after UI review fix with `..\.codex-build\submission-thread-bubbles-ui-fix-20260801`.
- `client`: `npx eslint "src/components/ClassroomThreadsTab.js" "src/components/UpdatesTab.js" "src/components/StudentThreadBubbleDock.js" "src/app/classroom/live/[id]/ClassroomLiveClient.js"`
- `client`: repeated `npm run lint` after lazy pagination and no-count/no-pulse follow-up.
- `client`: repeated `npm run build` after lazy pagination and no-count/no-pulse follow-up.
- `client`: repeated `npm run build` after the final thread-summary count removal.
- `client`: targeted ESLint and repeated `npm run build` after removing the trainer tab-header pending shortcut and fixing the Updates scroll viewport.
- `server`: repeated bundle smoke after lazy pagination with `..\.codex-build\submission-thread-bubbles-pagination-fix-20260801`.
- `server`: repeated bundle smoke after removing summary counts with `..\.codex-build\submission-thread-bubbles-pagination-final-20260801`.
- `repo`: `git diff --check`
- `repo`: `rg -n "setInterval|visibilitychange|refetchInterval|poll" client/src/components/ClassroomThreadsTab.js client/src/components/StudentThreadBubbleDock.js "client/src/app/classroom/live/[id]/ClassroomLiveClient.js" server/src/controllers/classroomController.ts`
- `repo`: repeated `rg -n "setInterval|visibilitychange|refetchInterval|poll" client/src/components/ClassroomThreadsTab.js client/src/components/UpdatesTab.js "client/src/app/classroom/live/[id]/ClassroomLiveClient.js" server/src/controllers/classroomController.ts`
- `dev`: existing Next dev server on `http://localhost:3000` returned `200` for `/classroom/list`.

Verification notes:
- Full client lint passed with 0 errors and 10 unrelated warnings in existing files.
- `git diff --check` produced line-ending warnings only.
- No new polling matches were found; the only matches were existing comments in `ClassroomLiveClient.js`.
- Temporary Bun bundle output files were removed after verification.
- Bun API was already listening on local port `5000`; root returned `404`, which is expected for a route-only API.

Not run:
- Authenticated trainer opens live pending submission bubble, sends referenced message, and verifies persisted chip after refresh.
- Authenticated trainer opens topic pending submission bubble, sends referenced text/attachment, and verifies persisted chip after refresh.
- Authenticated student reads referenced trainer message.
- Live negative API checks for cross-student, cross-classroom, stale, and invalid reference payloads.

Reason:
- This turn did not have trainer/student credentials, a known local database state, or an attachment bucket confirmation.

## Changed Files In Scope

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `client/src/components/ClassroomThreadsTab.js`
- `client/src/components/StudentThreadBubbleDock.js`
- `server/src/controllers/classroomController.ts`
- `docs/rsd/trainer-submission-thread-bubbles-20260801-rsd.md`
- `docs/decisions/trainer-submission-thread-bubbles-20260801-technical-decisions.md`
- `docs/adr/0009-student-thread-submission-reference-metadata.md`
- `docs/tasks/trainer-submission-thread-bubbles-20260801-task-plan.md`
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`
- `docs/knowledge-base/*` entries updated for this implementation review.

Existing dirty and untracked files from prior classroom thread/update work remain present and were not reverted.

## Gate Request

Manual-mode implementation-review gate is ready. User approval is required before final merge, staging, commit, push, or any additional integration cleanup.
