# Trainer Feature Futureproof CRUD, Schedule, and Submission Decisions

- **Author**: OpenCode
- **Date**: 2026-07-27
- **Status**: APPROVED
- **RSD**: `docs/rsd/trainer-feature-futureproof-crud-schedule-submission-20260727-rsd.md`

## Decision 1: Bounded Member Previews Instead of Virtualization

Use bounded member previews for People and Groups tab cards: show member count, show only the first few member labels inline, and provide an explicit overflow affordance for the full member list. Keep action buttons in a separate shrink-free toolbar.

Rationale:
- The current bug is hidden actions caused by unbounded inline names, not a full-table rendering bottleneck.
- Bounded previews are smaller and safer than adding virtualization or new shared components.
- Existing scroll/batch patterns in `ClassroomLiveClient.js` already fit this approach.

## Decision 2: Session End Time Is Derived Client-Side

Keep persisted session data unchanged. In the session edit dialog, calculate `endTime` from `scheduled_time + duration_minutes` when opening the dialog. On save, convert start/end `datetime-local` values to local `Date` objects and submit only existing fields: `scheduledTime`, `sessionType`, and computed positive `durationMinutes`.

Rationale:
- User explicitly asked to keep DB unchanged.
- Existing server API already validates and stores `durationMinutes`.
- This avoids adding new server/database concepts for end time.

## Decision 3: Topics CRUD Uses Existing Topic Update Plus Focused New Endpoints

Use the existing `PATCH /classroom/:id/topics/:topicId` endpoint for topic edit/archive. Add focused authenticated server endpoints for safe CRUD gaps:

- `POST /classroom/:id/topics/:topicId/resources/:resourceId/update`
- `DELETE /classroom/:id/topics/:topicId/resources/:resourceId`
- `POST /classroom/:id/topics/:topicId/problems/:problemId/update`
- `DELETE /classroom/:id/topics/:topicId/problems/:problemId`
- `POST /classroom/:id/topic-assignments/:assignmentId/unassign`

Topic removal should prefer archive when deletion could cascade through existing learning/progress records. Resource/problem delete endpoints must validate topic and classroom ownership before deleting.

Rationale:
- Existing client helper supports `POST` and `DELETE`, not `PATCH`; adding a generic patch helper is optional, but using server `POST` for new update operations matches existing project action style.
- Server must own classroom boundary validation; UI checks are not sufficient.
- Archive protects existing assignments/progress from accidental destructive topic deletion.

## Decision 4: Submission Code Language Stored in Existing Text Field

Do not add `solution_language`. Store code submissions in existing `solution_code`. When a selected language is present, encode as fenced Markdown, for example:

````text
```cpp
// code
```
````

Render submitted code through `MarkdownRenderer` with raw HTML disabled so existing syntax-highlighter integration handles language highlighting. Existing unfenced `solution_code` values still render in a plain code block.

Rationale:
- User required unchanged DB.
- `MarkdownRenderer` already uses `react-syntax-highlighter` and is already available in the changed file.
- This preserves trainer readability without introducing another editor dependency or schema guard.

## Decision 5: Code-Or-Link Proof Keeps Trainer-Owned Verdicts

For live challenge submissions, student UI validates that either a valid URL or non-empty code exists before sending `pending_approval`. Server validation should accept code-only submissions for students while still preserving existing trainer-owned final verdict enforcement.

Rationale:
- Private/non-public submissions need code as proof.
- Current server rule requiring a URL for student review requests must be widened without allowing student final approval.
- Existing `solution_code` and `submission_notes` columns are already used in topic progress and live class problems.

## No ADR

No ADR is proposed for this change. The decisions reuse existing classroom topic/proof contracts and avoid new architecture, schema, dependencies, or external integrations.
