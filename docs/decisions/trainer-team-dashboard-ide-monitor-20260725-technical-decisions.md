# Trainer Team Dashboard IDE Monitor Technical Decisions

Status: Approved
Task ID: trainer-team-dashboard-ide-monitor-20260725
Last updated: 2026-07-25
Delivery mode: Auto

## Mode and Gate Policy

Gates waited on: none. Gates skipped: technical decision approval. Waiver: `mode:auto` allows autonomous architecture, security, data, API, and migration decisions with rationale and rollback recorded.

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-team-dashboard-ide-monitor-20260725-rsd.md`
  Used for: requirements and acceptance criteria.
  Evidence: IDE monitoring, topic editor, assignment visibility, and team dashboard are in scope.
  Confidence: High
- Source: `docs/adr/0002-markdown-source-classroom-resources.md`
  Used for: markdown approach.
  Evidence: store markdown as source text and render with raw HTML disabled.
  Confidence: High
- Source: `docs/adr/0003-classroom-topic-team-assignment-model.md`
  Used for: team-topic assignment limits.
  Evidence: topic assignments must stay separate from class problems.
  Confidence: High
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: UI integration.
  Evidence: trainer tabs, topic resource form, topic library, analytics, and student board are already in one page.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: endpoint policy.
  Evidence: existing helpers separate classroom access from trainer/admin management.
  Confidence: High
- Source: `server/src/utils/dbInit.ts`
  Used for: migration style.
  Evidence: classroom tables use init-time `CREATE TABLE IF NOT EXISTS` and indexes.
  Confidence: High
- Source: `rsd-orchestrator-agent/references/hci-design-rules.md`
  Used for: monitoring visibility and feedback.
  Evidence: visible state, clear disabled controls, and mode clarity are required.
  Confidence: High
- Source: `rsd-orchestrator-agent/references/code-quality-rules.md`
  Used for: implementation boundaries.
  Evidence: keep public interfaces small and avoid shotgun refactors.
  Confidence: High

## Context

The classroom live page already owns trainer topic authoring, team management, analytics, student assignments, resources, board, and chat. The new IDE monitor adds code snapshots and behavioral telemetry, so server-side authorization and transparent UI are material.

## Decisions

### TD-001: Use Existing Markdown Editor for Topic Resources

Decision: Replace the topic resource `Textarea` with `EditorWrapper`, matching classroom resource authoring.

Options considered:

- Keep `Textarea`: simple but misses requirement.
- Use `EditorWrapper`: matches existing editor and avoids another markdown editor dependency.

Rationale:

The component already exists and is used safely in the classroom resource studio.

Tradeoffs:

The existing editor reset behavior is keyed by React state changes rather than a dedicated imperative reset API.

Security and privacy impact:

No new data type; topic markdown continues to be stored as source text and rendered with raw HTML disabled.

Testing impact:

Client build/lint should cover import and JSX integration.

HCI impact:

Trainer gets the expected editor affordances instead of a plain field.

Code-quality impact:

Reuses local component instead of adding shallow wrapper.

Rollback or migration:

Revert JSX to `Textarea` if editor causes runtime issues.

ADR required: No

### TD-002: Hide Team Identity in Topic Library Assignment Badges

Decision: Replace per-assignment team-name badges with aggregate active/archived assignment counts in topic cards.

Options considered:

- Hide all assignment indicators: safest privacy but removes useful status.
- Aggregate counts only: preserves topic state without exposing team-topic mapping.

Rationale:

The requirement is about not showing which team got which topic, not hiding that a topic is assigned at all.

Tradeoffs:

Trainers lose quick per-topic team lookup in the topic library; monitor/analytics can still show team progress without rendering the topic-to-team mapping there.

Security and privacy impact:

This is primarily UI exposure reduction. Server responses remain manager-only and unchanged unless future policy requires data minimization.

Testing impact:

Static grep for `Team {assignment.team_name}` should no longer find UI output.

HCI impact:

Topic cards keep a simple assigned-state signal without leaking mapping detail.

Code-quality impact:

Small local rendering change, no API churn.

Rollback or migration:

Restore assignment badge map if user later wants team names visible.

ADR required: No

### TD-003: Add Classroom IDE Session and Event Tables

Decision: Store one latest IDE session snapshot per classroom/student plus append-only IDE events.

Options considered:

- Client-only monitor state: no trainer audit history and lost on refresh.
- Append-only events only: no quick current code snapshot.
- Session snapshot plus events: supports trainer dashboard and audit log with simple queries.

Rationale:

Trainer needs current monitoring and later inspection. A session row gives current state; events preserve focus/paste/activity history.

Tradeoffs:

Stores student code and behavior telemetry, increasing privacy and retention responsibility.

Security and privacy impact:

Student writes only their own IDE activity through classroom access. Trainer/admin reads only through management endpoint. Students cannot read peer logs. Monitoring is visible in UI.

Testing impact:

Server bundle check and endpoint policy review.

HCI impact:

Student sees a monitoring badge; trainer sees event labels and timestamps instead of hidden signals.

Code-quality impact:

Adds two cohesive tables and two controller endpoints, keeping monitor policy separate from topic/problem logic.

Rollback or migration:

Drop `classroom_ide_events` and `classroom_ide_sessions` if feature is removed.

ADR required: Yes

### TD-004: Use CodeMirror for Browser IDE Intellisense, No Runner

Decision: Add a client-only classroom IDE component using CodeMirror autocomplete and JavaScript language support. The Run button is disabled and marked coming soon.

Options considered:

- Plain textarea: fails intellisense requirement.
- Monaco: strong IDE but heavier dependency and build risk.
- CodeMirror: already present in dependency graph, smaller, and enough for autocomplete/editor affordances.

Rationale:

This task needs an IDE shell, not full VS Code semantics or execution.

Tradeoffs:

Language support starts strongest for JavaScript. Other language labels can still store code, but true semantic intellisense is limited until dedicated language packages are added.

Security and privacy impact:

No execution means no sandbox escape or runner secrets. Code is stored as text only.

Testing impact:

Client build must verify the editor imports remain SSR-safe through dynamic client component loading.

HCI impact:

Students see editor controls, language selection, saved state, and a clear unavailable runner state.

Code-quality impact:

Encapsulate editor internals in `ClassroomIdePanel.jsx` to avoid bloating `ClassroomLiveClient.js`.

Rollback or migration:

Remove IDE component and routes; schema tables can remain unused or be dropped.

ADR required: No

### TD-005: Team Dashboard Aggregates Existing Analytics and IDE Snapshots

Decision: Extend trainer analytics into a team dashboard that combines roster, solve counts, topic counts, and IDE activity snapshots.

Options considered:

- Add a separate route: more navigation churn.
- Extend existing analytics tab: preserves trainer workflow and reduces route/API churn.

Rationale:

The live classroom page already has team analytics and team rosters. A richer dashboard belongs there.

Tradeoffs:

The page remains large; IDE component is split out to reduce added complexity.

Security and privacy impact:

IDE snapshots appear only in trainer/admin view. Student UI has no peer monitor path.

Testing impact:

Client lint/build and review against auth assumptions.

HCI impact:

Team state becomes scannable with members, progress, and current IDE telemetry in one place.

Code-quality impact:

Keep aggregation helpers local and pure; avoid changing analytics endpoint shape except adding monitor data through a separate call.

Rollback or migration:

Revert analytics tab JSX changes and stop fetching IDE activity.

ADR required: No
