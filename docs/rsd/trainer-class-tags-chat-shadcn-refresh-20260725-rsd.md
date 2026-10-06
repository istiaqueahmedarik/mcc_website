# Trainer Class Tags Chat Shadcn Refresh RSD

Status: Approved by Auto mode
Task ID: trainer-class-tags-chat-shadcn-refresh-20260725
Owner: Codex
Last updated: 2026-07-25
Delivery mode: Auto

## Mode and Gate Policy

The user changed delivery to Auto mode and approved defaults. RSD, technical decision, task plan, and implementation-review gates are recorded but not paused. Irreversible production deployment and destructive data deletion remain out of scope.

## Grill Mode Summary

Task restatement:
Improve trainer/classroom usability by replacing comma-separated problem tags with a multi-select combobox backed by a tag dictionary, making chat specific to class sessions, adding persistent message reactions, using shadcn Bubble and Message composition, customizing shadcn styling so it does not read as stock defaults, and switching the app font to Inter.

Answers received:
- User said "use defaults and use auto mode from now on."

Assumptions:
- Tag dictionary is global, because problem topic tags are reusable across instructors and classrooms.
- The requested "multiple combobox" means one multi-select combobox with selected chips, searchable options, and create-new affordance.
- Dictionary should seed from existing `class_problems.tags` and keep `class_problems.tags text[]` for compatibility.
- Chat messages should be bound to `classes.id`. Active class chat is writable; completed class chat is readable history.
- Reactions should persist per user in the database.
- Inter and theme-token changes can be global; deeper visual changes are scoped to trainer/classroom surfaces.

Important unresolved questions:
- None blocking under Auto mode.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: workflow, file ownership, verification
  Evidence: trainer/classroom UI entry points and API entry points are listed; RSD-first workflow is required.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: scope boundaries
  Evidence: recent classroom live work touched resources, problems, history, and chat surfaces.
  Confidence: High
- Source: `docs/knowledge-base/quality-rules.md`
  Used for: implementation constraints
  Evidence: preserve polling/endpoint behavior unless behavior change is approved; this task explicitly approves chat/tag behavior changes only.
  Confidence: High
- Source: `server/src/utils/dbInit.ts`
  Used for: data model
  Evidence: `class_problems.tags text[]` and `classroom_messages` keyed by `classroom_id`.
  Confidence: High
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: current UI behavior
  Evidence: problem tags are edited as comma-separated input and chat renders a common classroom thread.
  Confidence: High
- Source: `https://ui.shadcn.com/docs/components/base/bubble`
  Used for: chat bubble/reaction component expectations
  Evidence: Bubble supports variants, alignment, grouping, reactions, and max-width behavior.
  Confidence: High
- Source: `https://ui.shadcn.com/docs/components/base/message`
  Used for: chat row component expectations
  Evidence: Message owns row, avatar/content/header/footer/actions composition.
  Confidence: High

## Goal

Trainer problem assignment uses a discoverable dictionary-backed tag picker, chat is scoped to the selected class session with persistent reactions, and trainer/classroom UI feels polished, professional, and custom rather than stock shadcn.

## Non-Goals

- No public route redesign.
- No chat realtime transport replacement; polling remains.
- No migration of ambiguous old common classroom messages into class-specific threads.
- No broad authorization refactor outside touched chat/tag endpoints.
- No production deployment.

## Users and Use Cases

- Instructors assign CP problems and create/reuse topic tags quickly.
- Instructors and students chat in the context of a specific class session.
- Instructors and students react to chat messages with lightweight persistent feedback.
- Users read the app in Inter with a more professional operational visual tone.

## User-Visible Behavior

- Problem assignment shows a searchable multi-select tag combobox with chips and a create-new option.
- New tags are added to the dictionary and appear for future assignments.
- Chat header shows the class session scope. Active class chat allows sending. Completed class chat is read-only history.
- Chat messages render with Message/Bubble composition, aligned by sender, with sender metadata and reaction buttons.
- Theme tokens and component classes use restrained borders, professional contrast, and non-stock shadcn styling.

## Acceptance Criteria

- [ ] Comma-separated tag input is replaced by a multi-select combobox with chips and create-new behavior.
- [ ] Global problem tag dictionary exists, is seeded from existing class problem tags, and stores new instructor-created tags.
- [ ] Problem assignment sends normalized tag arrays and keeps existing problem display compatible.
- [ ] Chat send/history endpoints require `classId` and only return messages for that class.
- [ ] Completed class chat can be viewed as history and cannot be sent to from the UI.
- [ ] Message reactions persist per user and show aggregate counts plus current-user state.
- [ ] Chat UI uses local shadcn-compatible `Bubble` and `Message` primitives.
- [ ] App font changes to Inter.
- [ ] shadcn theme/classes are customized beyond default neutral stock styling.
- [ ] Relevant client lint/build checks are run or blockers recorded.

## Constraints

- Keep existing Next.js, Tailwind, Radix/shadcn, lucide, Bun/Hono, and PostgreSQL stack.
- Keep polling for chat.
- Preserve existing `class_problems.tags text[]` reads.
- Use migration-safe `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE IF EXISTS`.
- Avoid unrelated dirty-worktree reversions.

## Dependencies

- PostgreSQL tables initialized by `server/src/utils/dbInit.ts`.
- Existing classroom auth/JWT middleware in `server/src/routes/classroomRoute.ts`.
- Existing classroom live client component.
- shadcn docs for Bubble and Message composition.

## Risks and Open Questions

- Risk: old common classroom chat has no `class_id`, so it cannot be safely mapped to sessions. Mitigation: preserve rows, show only class-specific messages going forward.
- Risk: broad UI polish could become churn. Mitigation: limit code edits to global tokens/font and classroom live surfaces needed by tags/chat.
- Risk: reaction endpoint could allow reacting to inaccessible messages. Mitigation: verify message class and classroom access before toggling.

## Test Expectations

- Run targeted ESLint on changed client files.
- Run TypeScript/Bun syntax check where practical for server files.
- Run client build if lint passes far enough or record known unrelated blocker.
- Manually inspect code paths for auth, migration safety, and input validation.

## HCI Expectations

Users can discover tag creation without remembering comma syntax; selected tags remain visible as chips; invalid states are constrained. Chat scope is visible in the header so users do not send to the wrong class. Completed chat uses read-only state with clear disabled feedback. Reactions use labeled buttons and do not rely on color alone.

## Code Quality Expectations

Keep tag normalization on the server as source of truth. Keep UI helpers local unless reuse is clear. Add small shadcn-compatible primitives for Bubble/Message rather than pulling broad new dependencies. Preserve existing polling and classroom state shape except for approved `classId` chat scope.

## Definition of Done

- [ ] Mandatory Grill Mode completed
- [ ] RSD recorded under Auto mode
- [ ] Technical decisions recorded under Auto mode
- [ ] Full task plan recorded under Auto mode
- [ ] Implementation passes relevant verification or blockers are recorded
- [ ] Implementation review recorded under Auto mode
- [ ] Knowledge base and mistake note updated
