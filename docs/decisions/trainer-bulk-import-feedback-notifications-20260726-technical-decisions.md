# Trainer Bulk Import, Feedback, and Notification Removal Technical Decisions

Status: Approved
Task ID: trainer-bulk-import-feedback-notifications-20260726
Last updated: 2026-07-26
Delivery mode: Auto

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-bulk-import-feedback-notifications-20260726-rsd.md`
  Used for: approved scope and acceptance criteria
  Evidence: trainer workflows need CSV bulk import, lookup choice, feedback, and classroom notification removal.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: trainer/classroom entry points
  Evidence: trainer/classroom UI centers on `ClassroomLiveClient.js` and classroom APIs center on `classroomController.ts`.
  Confidence: High
- Source: `docs/knowledge-base/quality-rules.md`
  Used for: narrow verification and UI constraints
  Evidence: scoped trainer/classroom changes should avoid broad redesign and use targeted verification when full lint has unrelated blockers.
  Confidence: High
- Source: `client/src/components/NotificationBell.js`
  Used for: notification client behavior
  Evidence: bell fetches `/api/classroom/notifications/list`, listens to Supabase broadcasts, and posts read status.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: notification server behavior and trainer workflow APIs
  Evidence: controller creates in-app notifications, broadcasts `new_notification`, sends notification emails, and handles student/problem mutations.
  Confidence: High

## Decisions

### TD-001: Local Browser CSV Parsing and Mapping

Decision: Parse CSV files in the browser, show a mapping dialog, and only submit mapped/confirmed rows to the server.

Options considered:
- Upload raw CSV to server and map there.
- Parse locally and send structured rows.

Rationale:
The user asked for local processing and mapping before adding records. Local parsing prevents accidental server mutations before trainer review.

Tradeoffs:
Client code grows, but server payloads become structured and easier to validate.

ADR required: No

### TD-002: No New CSV Dependency

Decision: Implement a small local CSV parser that supports quoted fields, escaped quotes, CRLF, and simple headers.

Options considered:
- Add `papaparse` or another dependency.
- Implement minimal parser for this workflow.

Rationale:
The repository does not already depend on a CSV parser. The required parsing behavior is bounded and previewed before mutation.

Tradeoffs:
The parser will not cover every spreadsheet edge case. `.xlsx` remains out of scope.

ADR required: No

### TD-003: Student Lookup Method is Explicit

Decision: Add an explicit lookup method selector for manual and bulk student enrollment: `email` or `mist_id`.

Options considered:
- Auto-detect identifier type.
- Require trainer to choose lookup method.

Rationale:
Explicit mapping avoids mistaking numeric email local-parts or malformed IDs for the wrong identifier type.

Tradeoffs:
Trainer makes one extra choice, but errors are clearer.

ADR required: No

### TD-004: Bulk Student API Uses One Batch Request

Decision: Add `POST /classroom/:id/add-students` for mapped student identifiers.

Options considered:
- Reuse `add-student` in a client loop.
- Add a batch endpoint.

Rationale:
One batch endpoint avoids per-row network overhead and validates all identifiers consistently.

Tradeoffs:
Server controller gains another handler.

ADR required: No

### TD-005: Bulk Problem API Uses Structured Rows

Decision: Add `POST /classroom/assign-problems/bulk` accepting structured rows with target type/id, platform, link, timer, difficulty, and tags.

Options considered:
- Client loops over the existing single assign endpoint.
- Server batch endpoint with shared validation/insert logic.

Rationale:
Batch assignment avoids repeated metadata fetches and repeated notification overhead. Server still revalidates classroom access and targets.

Tradeoffs:
Some shared assignment logic must be extracted locally inside the controller.

ADR required: No

### TD-006: Feedback Uses Existing Sonner and Button State

Decision: Use `toast.loading`, `toast.success`, `toast.error`, plus disabled/spinner button state for touched actions.

Options considered:
- Inline messages only.
- New feedback abstraction.
- Existing Sonner plus local state.

Rationale:
Sonner is already installed and mounted. Local state is enough for this scoped work.

Tradeoffs:
Feedback calls are local rather than centralized.

ADR required: No

### TD-007: Remove Classroom In-App Notification Feature

Decision: Remove classroom notification bell usage, client notification route handlers, server notification routes, and classroom notification creation/broadcast/email side effects.

Options considered:
- Remove SMTP email dispatch only.
- Keep bell and reduce fetch frequency.
- Remove the classroom notification feature path entirely.

Rationale:
The user clarified that polling/notification behavior causes performance issues and asked to remove all such notifications while keeping email data. Removing the full classroom notification path eliminates DB writes, broadcasts, navbar fetches, and notification email side effects.

Tradeoffs:
Users no longer get classroom in-app bell notifications for adds, assignments, hints, notes, or status updates. Action feedback remains in the trainer UI.

ADR required: No

## Security and Privacy Notes

- Bulk APIs must preserve existing trainer/admin/substitute authorization checks.
- Bulk student enrollment must continue blocking trainer/admin accounts as classroom students.
- CSV data must not be logged.
- Email fields remain visible only where already visible.

## Verification Impact

- Client targeted lint for `ClassroomLiveClient.js` and `Navbar.js`.
- Server build/type check for route/controller changes.
- `git diff --check`.
