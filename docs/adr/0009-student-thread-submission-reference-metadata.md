# ADR-0009: Student Thread Submission Reference Metadata

Status: Accepted
Date: 2026-08-01
Task ID: trainer-submission-thread-bubbles-20260801

## Context

MCC now uses student-scoped classroom threads as the active conversation model. Trainers need to open a thread bubble from pending live and topic submissions, then send messages that clearly reference the submission being discussed. The reference must be visible to both trainer and student, but thread messages must not become a second grading system or leak private solution details.

The existing student-thread message table already includes `metadata jsonb`, and message/attachment writes already pass through classroom-scoped server endpoints. This makes a metadata extension safer and smaller than adding a new table or reviving legacy problem-thread records.

## Decision

Store submission context on human student-thread messages under a canonical `metadata.submission_reference` object.

The server accepts an optional `submissionReference` payload on student-thread message and attachment endpoints, then resolves it from authoritative classroom submission rows before insertion.

For live submissions, the server validates:
- `class_problems.id` matches the provided live reference.
- The joined class belongs to the route classroom.
- The problem row belongs to the selected thread student.
- The status is still `pending_approval`.

For topic submissions, the server validates:
- `classroom_topic_problem_progress.id` matches the provided topic reference.
- The progress row belongs to an active assignment in the route classroom.
- The progress row belongs to the selected thread student.
- The status is still `pending_approval`.

The persisted reference stores identifiers and display summary only: source type, relevant ids, student id, problem title, optional topic/class label, submitted time, and pending status. It must not store solution code, private attachment paths, broad user profile data, hidden trainer notes, or final verdict authority.

## Consequences

Positive:
- Trainers can discuss a pending submission without losing review context.
- Students can see exactly which submission a trainer message refers to.
- Existing student-thread APIs and tables remain the active communication model.
- Server validation prevents cross-student, cross-classroom, invalid, or stale references.
- No schema migration is needed beyond using existing message metadata.
- Existing approve/reject/status endpoints remain authoritative.

Negative:
- Referenced messages are less relationally queryable than a dedicated link table.
- A trainer who keeps a submission-context bubble open after approving or rejecting must send later chat as a normal message or reopen a current context.
- Client code needs a shared student-thread panel/dock boundary to avoid duplicating chat behavior.

## Alternatives Considered

- Use legacy problem-thread bubbles: rejected because it conflicts with the approved student-scoped communication model.
- Add a dedicated reference table: rejected for v1 because this is display context and audit metadata, not a new workflow authority.
- Trust client-provided problem/student labels: rejected because references could be forged or stale.
- Let chat messages approve or reject submissions: rejected because trainer verdict ownership belongs to existing review endpoints.

## References

- `docs/rsd/trainer-submission-thread-bubbles-20260801-rsd.md`
- `docs/decisions/trainer-submission-thread-bubbles-20260801-technical-decisions.md`
- `docs/adr/0008-classroom-student-thread-realtime-model.md`
- `docs/knowledge-base/project-index.md`
- `docs/knowledge-base/decisions.md`
- `docs/knowledge-base/quality-rules.md`
- `client/src/components/ClassroomThreadsTab.js`
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `server/src/controllers/classroomController.ts`
- `server/src/utils/classroomStudentThreadsSchema.ts`
