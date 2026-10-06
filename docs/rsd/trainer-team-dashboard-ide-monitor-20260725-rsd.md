# Trainer Team Dashboard IDE Monitor RSD

Status: Approved
Task ID: trainer-team-dashboard-ide-monitor-20260725
Owner: Codex
Last updated: 2026-07-25
Delivery mode: Auto

## Mode and Gate Policy

Auto mode selected by user with `mode:auto`.

Gates waited on: none. Gates skipped: RSD approval, technical decision approval, task-plan approval, implementation-review approval. Waiver: user explicitly requested auto mode, so this task records assumptions and proceeds without waiting unless credentials, external production systems, or user-only facts block progress.

## Grill Mode Summary

Task restatement:
Improve trainer classroom/topic work by using the proper markdown editor for topic team resources, hiding which team received which topic in the topic assignment display, adding a proper whole-team dashboard, and adding a student coding IDE with trainer monitoring for focus, blur, paste/large insert, and code activity. Running code is out of scope for now; the run button must show coming-soon state.

Answers received:
- Topic resource markdown content should use an editor.
- Topic assignment UI should not show which team got assigned to which topic.
- Whole teams need a proper dashboard.
- Students need IDE access.
- Trainers need near-real-time monitoring and logs for tab focus, tab blur, and copied/pasted code indicators.
- Runner is not available now; intellisense is required; run button should be coming soon.

Assumptions:
- "Copied a code instead of write it" means the browser can log paste events and unusually large editor inserts as likely pasted code; it cannot prove the external source of code.
- "Real time" can be near-real-time polling from trainer UI plus frequent student event writes; a WebSocket monitor is not required for this first slice.
- Monitoring must be visible to students inside the IDE to preserve trust and avoid hidden surveillance.
- IDE activity is classroom-scoped, trainer/admin readable, and student writable only for the signed-in student's own session.
- No code execution, judging, compilation, terminal, filesystem, or runner backend will be added.
- Existing classroom/topic/team routes remain stable.

Important unresolved questions:
- Exact IDE language set is not specified. Proceed with JavaScript-focused CodeMirror intellisense and language selector labels that can evolve.
- Exact retention policy for IDE logs is not specified. Proceed with append-only classroom database logs and no automatic deletion in this task.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: process and verification constraints.
  Evidence: repository requires RSD-first artifacts, knowledge-base updates, and scoped verification.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: subsystem entry points.
  Evidence: classroom topics, resources, board, analytics, and live classroom UI are centered on `ClassroomLiveClient.js`, `classroomController.ts`, and `dbInit.ts`.
  Confidence: High
- Source: `docs/adr/0002-markdown-source-classroom-resources.md`
  Used for: markdown storage/rendering.
  Evidence: markdown source text is stored and rendered with raw HTML disabled.
  Confidence: High
- Source: `docs/adr/0003-classroom-topic-team-assignment-model.md`
  Used for: topic/team assignment model.
  Evidence: team-topic assignments are separate from `class_problems` and derive progress from assignment/progress tables.
  Confidence: High
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: current UI behavior.
  Evidence: topic resource content is a plain `Textarea`; topic library renders `Team {assignment.team_name}: {assignment.status}`.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: current APIs and access helpers.
  Evidence: topic, team, analytics, board, resource, and chat controllers already gate classroom access.
  Confidence: High
- Source: `server/src/utils/dbInit.ts`
  Used for: schema extension path.
  Evidence: classroom topic/team/board tables are initialized with `CREATE TABLE IF NOT EXISTS` and indexes.
  Confidence: High
- Source: `rsd-orchestrator-agent/references/hci-design-rules.md`
  Used for: HCI expectations.
  Evidence: monitoring state must be visible, controls must have clear feedback, and unsafe mode confusion must be avoided.
  Confidence: High
- Source: `rsd-orchestrator-agent/references/code-quality-rules.md`
  Used for: code-quality expectations.
  Evidence: add smallest cohesive interfaces, avoid shotgun changes, keep policy checks server-side.
  Confidence: High

## Goal

Trainer classroom work gains a clearer team dashboard and safer topic assignment display. Students get an in-browser IDE with autocomplete/intellisense, a disabled coming-soon run action, and transparent activity logging. Trainers can monitor current student code/session state and inspect recent IDE events.

## Non-Goals

- Code execution, judging, container runners, terminal access, filesystem access, or submissions.
- Perfect plagiarism detection or external clipboard provenance.
- WebSocket monitor infrastructure.
- Global IDE outside classroom live pages.
- Changing the accepted classroom topic assignment data model.

## Users and Use Cases

- Trainer/admin: manage topics/resources, assign topics, inspect team health, inspect current IDE activity.
- Student: open classroom IDE, write code with editor assistance, know monitoring is active, see run as unavailable.

## User-Visible Behavior

- Topic resource form uses the same proper markdown editor style as classroom resource authoring.
- Topic library no longer lists team names beside a topic's assignments; it may show aggregate assignment count/status only.
- Trainer analytics/team area shows a team dashboard with members, solve stats, topic assignment counts, and IDE activity snapshots.
- Student page shows an IDE panel with language selector, code editor, autocomplete, focus/log status, and a run button marked coming soon.
- Trainer monitor shows current code snapshot, language, last activity, focus state, paste/large-insert flags, and event log.

## Acceptance Criteria

- [ ] Topic resource markdown content uses `EditorWrapper`, not a raw `Textarea`.
- [ ] Topic library does not render `assignment.team_name` or equivalent team identity inside topic cards.
- [ ] Trainer sees a team dashboard combining roster, solve analytics, assignment counts, IDE snapshots, and per-member problem work.
- [ ] Trainer can see which live/topic problems each team member is solving or has open/solved inside the team section.
- [ ] Student sees a coding IDE with autocomplete/intellisense and can edit code.
- [ ] IDE run button is visible but disabled/coming soon and does not attempt execution.
- [ ] Student IDE logs focus, blur, visibility, paste, large insert, language change, and code update events.
- [ ] Trainer/admin can read IDE sessions/events for the classroom; students cannot read other students' IDE logs.
- [ ] Student monitoring state is visible in the IDE.
- [ ] Server stores IDE session snapshots and event history with classroom/user authorization.
- [ ] Relevant client/server verification passes or blockers are recorded.

## Constraints

- Preserve existing classroom route paths and topic/team data model.
- Render markdown with raw HTML disabled.
- Use current Tailwind/shadcn/lucide patterns.
- Keep monitoring scoped and transparent because it captures student code and behavior telemetry.
- Avoid adding a runner backend.

## Dependencies

- Existing classroom JWT middleware.
- Existing `canAccessClassroom` and `canManageClassroom` helpers.
- Existing topic/team/analytics data.
- CodeMirror packages available through the current client dependency graph.

## Risks and Open Questions

- Risk: hidden or overbroad monitoring harms student trust. Mitigation: visible IDE status and trainer-only server reads.
- Risk: paste logging is mistaken for proof of cheating. Mitigation: label paste/large insert as activity evidence, not cheating verdict.
- Risk: polling feels less real-time than WebSockets. Mitigation: short poll interval and session `updated_at` display.
- Risk: direct transitive CodeMirror imports may be brittle. Mitigation: use minimal imports already present in lockfile; record as follow-up if package manager prunes them.

## Test Expectations

- Targeted ESLint for changed client files.
- Client build if feasible because dynamic editor imports can affect SSR/build.
- Server Bun bundle check because routes/controllers/schema changed.
- `git diff --check`.
- Manual code review for auth, logging scope, and UI traceability.

## HCI Expectations

The IDE must make monitoring visible. The run control must clearly explain unavailable state. Team dashboards should use dense operational layout, stable card dimensions, visible empty states, and status feedback that does not rely on color alone.

## Code Quality Expectations

Keep IDE editor logic cohesive in a small client component, keep server policy checks inside controller endpoints, use schema init patterns already in `dbInit.ts`, and avoid refactoring unrelated classroom flows.

## Definition of Done

- [ ] Mandatory Grill Mode completed
- [ ] RSD gate satisfied by auto-mode waiver
- [ ] Technical decision gate satisfied by auto-mode waiver
- [ ] Full task plan gate satisfied by auto-mode waiver
- [ ] Implementation passes verification or records blockers
- [ ] Implementation review gate satisfied by auto-mode waiver
- [ ] Main workspace contains final integrated changes
- [ ] Knowledge base and mistake note updated
