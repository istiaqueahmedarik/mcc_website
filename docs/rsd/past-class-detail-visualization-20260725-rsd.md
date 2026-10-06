# Past Class Detail Visualization RSD

Status: Approved by auto-mode waiver
Task ID: past-class-detail-visualization-20260725
Owner: Codex
Last updated: 2026-07-25
Delivery mode: Auto

## Mode and Gate Policy

The user requested `mode:auto`. Repository `AGENTS.md` normally requires human approval after RSD, technical decisions, task plan, and implementation review. This run records those approvals as skipped by explicit current user instruction.

Gates waited on:
- None.

Gates skipped:
- Primary RSD approval.
- Technical decision package approval.
- Full task plan approval.
- Implementation review approval before final integration.

Waivers:
- Human approval gates waived because the user requested Auto mode.
- Waiver is limited to reversible classroom detail visualization and small internal API response shaping. No destructive Git operation, external production change, dependency change, authorization reduction, or database migration is approved by this waiver.

## Grill Mode Summary

Task restatement:
Add a way to visualize past class detail. The classroom UI currently emphasizes live and scheduled classes, but completed classes are only status rows. The new work should make completed session detail visible with stronger design and curved/progress-style visual treatment.

Answers received:
- Use `rsd-orchestrator-agent`.
- Use `caveman` ultra communication.
- Use `mode:auto`.
- Missing system: visualize past class detail.
- Improve design with more curved visual presentation.

Assumptions:
- "Past class detail" means completed class sessions inside `/classroom/live/[id]`.
- Trainers and enrolled students should both be able to inspect completed class summaries from the classroom page.
- Detail should use existing data first: class schedule/start/status, assigned problems, per-student statuses, tags, timers, and resources.
- "More curve design" means rounded, readable progress bars and a timeline-style history, not decorative blobs or a new visual dependency.
- Class-specific resources saved with `class_id` should be visible in the completed class detail.
- No new database columns are required for this first version.
- Existing route paths, live-session behavior, polling cadence, chat behavior, and authorization-bearing guards should remain unchanged.

Scope boundaries:
- Included: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`, `server/src/controllers/classroomController.ts`, and planning/review/knowledge-base artifacts.
- Included: small local helpers/constants inside `ClassroomLiveClient.js`.
- Excluded: new routes, new dependencies, schema migrations, deletion/editing of completed classes, exporting reports, changing problem status semantics, chat archival, notification changes, and broad classroom authorization refactor.

Acceptance criteria candidates:
- Completed classes are discoverable from the classroom live page.
- Selecting a completed class shows scheduled/start metadata, problem counts, solve/tried/not-solved distribution, progress bars, assigned student rows, tags/timers, and class resources.
- The history view has a clear curved/progress visual treatment while staying consistent with the current Swiss minimal classroom UI.
- Existing live, schedule, people, resources, and chat workflows continue to work.

Important unresolved questions:
- Whether a separate `/classroom/history` route is desired. Work proceeds with an in-page history view because route changes are out of scope.
- Whether chat history should be grouped per completed class. Work proceeds without chat grouping because current chat is classroom-level, not class-level.

Decisions requiring user approval under selected mode:
- None. Auto mode allows conservative reversible UI and internal response-shape decisions with rationale recorded.

## Requirement Review and Auditor Pass

Reviewer result:
- No material contradiction found.
- Acceptance criteria are observable in the classroom UI and can be verified by code review plus targeted lint/build.
- The requested "curve design" is translated into rounded progress/history visuals to avoid adding decorative or dependency-heavy design work.

Auditor result:
- RSD is satisfiable with current tables and routes.
- Hidden dependency identified: class-specific resources are currently filtered out of `getClassroomDetails`; this requires an additive response-shape change or a separate resource fetch.
- Hidden data gap identified: `classes` has no `completed_at`, so duration/completion timestamp are out of scope.
- Auto-mode waiver is acceptable for this reversible scoped change, but authorization broadness in existing classroom details remains a residual risk to review.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: repository shape, RSD workflow, verification expectations.
  Evidence: trainer/classroom UI entry points live under `client/src/app/classroom/`; client navigation/UI changes prefer targeted lint then build when risk justifies.
  Confidence: High

- Source: `docs/knowledge-base/project-index.md`
  Used for: classroom entry-point context.
  Evidence: `/classroom/live/[id]` is a known trainer/student live classroom surface; prior refresh preserved route paths and APIs.
  Confidence: High

- Source: `docs/knowledge-base/patterns.md`
  Used for: implementation boundary.
  Evidence: UI-only classroom changes should use small local helpers and avoid broad abstractions unless reuse is meaningful.
  Confidence: High

- Source: `docs/knowledge-base/decisions.md`
  Used for: dependency and scope discipline.
  Evidence: Swiss UI refresh used existing Tailwind, shadcn/Radix, and lucide icons without adding dependencies.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: behavior preservation.
  Evidence: classroom live UI refreshes should preserve polling intervals, endpoint strings, chat/resource/problem handlers unless a behavior RSD approves change.
  Confidence: High

- Source: `docs/knowledge-base/mistakes.md`
  Used for: verification planning.
  Evidence: full client lint may fail on unrelated existing errors; targeted lint should still cover changed files.
  Confidence: High

- Source: `docs/adr/0002-markdown-source-classroom-resources.md`
  Used for: resource security and display.
  Evidence: classroom resource markdown must render as source text with raw HTML disabled.
  Confidence: High

- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: current classroom UI behavior.
  Evidence: component loads classroom details, derives `activeClass`, fetches problems only for the started class, renders schedules/resources/chat, and adds resources with `classId: activeClass?.id || null`.
  Confidence: High

- Source: `server/src/controllers/classroomController.ts`
  Used for: available classroom data.
  Evidence: `getClassroomDetails` returns `classes`; `getClassProblems` returns trainer or student problem rows; `getClassResources` exists but current details query filters `class_id IS NULL`.
  Confidence: High

- Source: `server/src/utils/dbInit.ts`
  Used for: data model.
  Evidence: `classes` has `scheduled_time`, `status`, and `started_at`; `class_problems` stores status/timer/tags; `classroom_resources` stores optional `class_id`.
  Confidence: High

## Goal

Make completed classroom sessions inspectable and easy to understand from the existing classroom live page, with a compact history visual, selected-session detail, progress distribution, assigned problem rows, and related class resources.

## Non-Goals

- Do not create a new route or navigation item.
- Do not add a charting/design dependency.
- Do not add database columns or migrations.
- Do not change live class start/complete behavior.
- Do not change problem assignment/status semantics.
- Do not change chat delivery or make chat per-class.
- Do not change trainer/admin/student authorization policy.

## Users and Use Cases

- Trainers review a completed class after ending it to see solve distribution, assigned problems, and shared class materials.
- Students revisit prior classes to review assigned challenges, statuses, hints/notes access, and resources.
- Maintainers inspect the UI with current API/data shapes without needing a new reporting subsystem.

## User-Visible Behavior

- Classroom page shows a "Class history" surface when completed classes exist.
- The history surface lists completed sessions with date, status, and a rounded solve-progress bar.
- Selecting a completed class opens a detail panel in the same page.
- The detail panel shows a summary curve/bar, problem distribution, assigned rows, resource cards, and a clear empty state when no past data exists.
- Live-session panels remain first when a class is active; history is available without interrupting live workflows.

## Acceptance Criteria

- [ ] Completed classes are visible on `/classroom/live/[id]` for trainers and students.
- [ ] A completed class can be selected without route change.
- [ ] Selected past class detail fetches and displays that class's problem rows through the existing problems API.
- [ ] Past class detail shows solve/tried/not-solved counts and a rounded progress visualization.
- [ ] Past class detail shows class-specific resources whose `class_id` matches the selected class.
- [ ] Classroom-level resources still show only resources with no `class_id`.
- [ ] Existing active class problem fetching, polling, schedule/start/complete, add resource, chat, and people management behavior remains intact.
- [ ] Markdown resources in past detail render with raw HTML disabled.
- [ ] UI avoids text overlap on mobile and desktop.
- [ ] Verification runs targeted ESLint for changed files and `git diff --check`; full lint/build status is recorded when feasible.

## Constraints

- Work in the current dirty worktree without reverting user or prior generated changes.
- Keep design consistent with the current Swiss minimal operational classroom UI.
- Use existing Tailwind, shadcn/Radix UI components, and lucide icons.
- Keep helpers local to `ClassroomLiveClient.js` unless broader reuse becomes necessary.
- Keep API change additive and internal: return all classroom resources from existing detail response, then filter in client.

## Dependencies

- Existing Next.js classroom live client component.
- Existing Hono classroom controller and `getClassProblems` route.
- Existing classroom data tables: `classes`, `class_problems`, `classroom_resources`.
- Existing markdown renderer security rule from ADR-0002.

## Assumptions

- Existing `getClassProblems` authorization is sufficient for past class problem rows.
- The classroom detail endpoint can safely include all classroom resources already associated with the requested classroom because it already returns classroom resource data.
- First useful visualization can be built with DOM/CSS progress bars rather than Recharts.
- Completed classes with zero assigned problems should still be visible with an empty detail state.

## Risks and Open Questions

- Risk: `ClassroomLiveClient.js` is large and UI edits can accidentally touch behavior. Mitigation: add local helpers and review endpoint strings/handlers after patch.
- Risk: Returning class-specific resources in the details payload changes client response shape. Mitigation: additive only; filter classroom-level resources in the existing resource panel.
- Risk: Existing endpoint-level classroom authorization appears broader than ideal. Mitigation: do not widen route access; record as residual security risk/follow-up if not fixed under this scoped task.
- Question: Should completed class detail include `completed_at` duration? Owner: future task. Current schema has no completed timestamp, so this task will not invent duration.

## Test Expectations

- Run targeted ESLint for `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`.
- Run a server TypeScript or syntax check if a scoped command exists; otherwise run best available verification and record limits.
- Run `git diff --check`.
- Run `npm run lint` and/or `npm run build` in `client/` if feasible; record unrelated blockers separately.
- Manual review for unchanged route paths, endpoint strings, polling intervals, and handlers.

## HCI Expectations

- Make class history discoverable without hiding live work.
- Use clear signifiers: status badges, selected session state, progress labels, empty states.
- Give feedback for loading past detail.
- Keep mapping natural: selecting a completed class changes the adjacent detail panel.
- Avoid hidden modes; selected past class should be visibly selected.
- Use text plus color for status; do not rely on color alone.
- Keep mobile layout stacked with no clipped action text.

## Code Quality Expectations

- Prefer small local helper functions for status labels, metric counts, and progress math.
- Avoid new dependencies and global design-system extraction.
- Keep API response change additive and easy to rollback.
- Keep resource filtering explicit so classroom-level and class-specific resources do not leak into the wrong visual section.
- Avoid refactoring unrelated live-class polling or chat code.

## Definition of Done

- [x] Mandatory Grill Mode completed through auto-mode internal assumptions.
- [x] RSD gate satisfied by auto-mode waiver.
- [x] Requirement review and auditor pass completed.
- [x] Technical decision gate satisfied by auto-mode waiver.
- [x] Full task plan gate satisfied by auto-mode waiver.
- [x] Implementation passes verification.
- [x] Implementation review gate satisfied by auto-mode waiver.
- [x] Knowledge base and mistake note updated.
