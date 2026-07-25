# Swiss Minimal Learning UI Refresh Technical Decisions

Status: Approved
Task ID: swiss-minimal-learning-ui-refresh-20260725
Last updated: 2026-07-25
Delivery mode: Manual

## Mode and Gate Results

Gates waited on:
- RSD approval: approved by user on 2026-07-25.
- Technical decision approval: approved by user on 2026-07-25.

Gates still required:
- Full task plan and dependency graph approval.
- Implementation review approval before final integration.

Gates skipped:
- None.

Waivers:
- None.

## Documentation and Knowledge Used

- Source: `docs/rsd/swiss-minimal-learning-ui-refresh-20260725-rsd.md`
  Used for: decision scope and non-goals.
  Evidence: redesign `/trainer/dashboard`, `/classroom/list`, `/classroom/live/[id]`, and `/my_dashboard` presentation while preserving logic and paths.
  Confidence: High

- Source: `AGENTS.md`
  Used for: repository shape, approval gates, verification expectations, and quality checklist.
  Evidence: trainer/classroom UI entry points live mainly under `client/src/app/trainer/`, `client/src/app/classroom/`, and `client/src/components/Navbar.js`.
  Confidence: High

- Source: `client/package.json`
  Used for: available UI tooling and dependency policy.
  Evidence: Tailwind, shadcn/Radix UI, and `lucide-react` are already installed.
  Confidence: High

- Source: `docs/knowledge-base/project-index.md`
  Used for: approved scope facts and prior trainer/classroom work.
  Evidence: this task is approved for trainer dashboard, classroom list/live classroom, and student dashboard, with behavior preservation.
  Confidence: High

- Source: `docs/knowledge-base/patterns.md`
  Used for: local helper strategy.
  Evidence: prior trainer UI work allows small local helpers when they reduce repeated JSX without creating global abstractions.
  Confidence: High

- Source: `docs/knowledge-base/decisions.md`
  Used for: dependency and route/process restraint.
  Evidence: trainer UI refreshes should use existing Tailwind, shadcn/Radix components, and lucide icons instead of adding dependencies or changing routes/process.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: code-quality constraints and Swiss minimal UI rule.
  Evidence: UI-only diffs must preserve endpoint strings, route targets, state keys, submit handlers, validation branches, and authorization-bearing guards.
  Confidence: High

- Source: `docs/knowledge-base/mistakes.md`
  Used for: verification risk planning.
  Evidence: full lint may fail from unrelated existing files; broad scans can hit `server/NUL`.
  Confidence: High

- Source: `docs/adr/0001-browser-side-gemma-webgpu-writing-assistant.md`
  Used for: AI assistant preservation.
  Evidence: trainer writing assistance is browser-only, draft-only, and should remain isolated from page components.
  Confidence: High

- Source: `docs/adr/0002-markdown-source-classroom-resources.md`
  Used for: classroom resource rendering preservation.
  Evidence: classroom resources can be URL-only, markdown-only, or both, and markdown should render with raw HTML disabled.
  Confidence: High

- Source: `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
  Used for: trainer dashboard behavior preservation.
  Evidence: component uses `get_with_token("auth/user/profile")`, `get_with_token("classroom/list")`, `post_with_token("classroom/create")`, `TrainerWritingAssistant`, and links to trainer forms, admin trainers, classroom list, and live classroom routes.
  Confidence: High

- Source: `client/src/app/classroom/list/ClassroomListClient.js`
  Used for: classroom entry behavior preservation.
  Evidence: component fetches profile and classrooms, conditionally enables trainer classroom creation, and links classroom cards to `/classroom/live/${classroom.id}`.
  Confidence: High

- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: classroom live behavior preservation.
  Evidence: component owns polling, live/schedule/students tabs, student challenge view, resources, notes/hints, problem assignment/status, and direct chat.
  Confidence: High

- Source: `client/src/app/my_dashboard/MyDashboardClient.js`
  Used for: student dashboard behavior preservation.
  Evidence: component submits Codeforces/VJudge handles through `post_with_token`, shows verification status, and provides external profile links.
  Confidence: High

## Context

The approved RSD asks for a Swiss-inspired minimalist rethink of trainer dashboard, trainer classroom, and student dashboard UI. Existing behavior is broad and intertwined, especially inside `ClassroomLiveClient.js`. The main design problem is not missing data or broken workflow; it is visual hierarchy, decorative noise, repeated low-value information, card density, and scattered action priority.

Requirement review found no material contradictions. Auditor pass found the RSD satisfiable without server/API/schema work; the main risks are accidental behavior changes in the large classroom component and overlap with existing dirty worktree changes.

## Decisions

### TD-001: Keep This UI-Only and Presentation-Scoped

Decision:
Implement only client presentation changes in `TrainerDashboardClient.js`, `ClassroomListClient.js`, `ClassroomLiveClient.js`, and `MyDashboardClient.js`. Do not edit server code, route paths, route guards, endpoint strings, payload shapes, polling cadence, auth/authorization logic, package files, or database/schema files.

Options considered:

- Option A: Redesign UI and clean up classroom/server workflows together.
- Option B: Keep the task strictly UI-only and preserve behavior surfaces.
- Option C: Add new routes or a new classroom console flow.

Rationale:

Option B satisfies the user request while respecting "not logic or path." It reduces regression risk and keeps review traceable.

Tradeoffs:

Some large component structure remains. Behavior refactor can happen later under a separate RSD.

Security and privacy impact:

No auth, data exposure, logging, permission, secret, or API behavior changes.

Testing impact:

Diff review must verify endpoint strings, route targets, handlers, and state transitions remain unchanged. Targeted ESLint should cover all changed client files.

Code-quality impact:

Removes visual complexity without introducing new architectural complexity. Avoids shotgun surgery across server/client boundaries.

Rollback or migration:

Revert changed client files and docs. No migration.

ADR required: No

### TD-002: Use Swiss Design Constraints, Not a New Theme System

Decision:
Apply Swiss design through JSX/Tailwind structure: grid alignment, clear type scale, restrained borders, purposeful whitespace, high contrast, semantic status accents, compact headers, and direct labels. Do not add a theme package, global CSS reset, or broad design-system abstraction.

Options considered:

- Option A: Add a new theme/design-system layer.
- Option B: Apply Swiss design locally with existing Tailwind/shadcn/lucide tools.
- Option C: Keep the previous decorative gradient/glow style and only reduce copy.

Rationale:

Option B gives cohesive visual improvement with the least maintenance cost. The project already has enough primitives.

Tradeoffs:

Some style decisions repeat across files until a future design-system task justifies extraction.

Security and privacy impact:

None.

Testing impact:

Manual responsive review and targeted lint are sufficient for this decision; no data tests change.

Code-quality impact:

Keeps interfaces small and avoids speculative global abstractions. Removes decorative visual bloat and repeated low-value information.

Rollback or migration:

Revert UI class/markup changes.

ADR required: No

### TD-003: Demote Noise, Preserve Action-Critical Information

Decision:
Remove or demote decorative glows, oversized hero treatments, verbose process explanations, duplicate metadata, and first-order placeholder tabs/panels. Preserve statuses, errors, form labels, required counts, live state, student/team/resource/challenge data, and controls needed to complete existing workflows.

Options considered:

- Option A: Aggressively hide sparse or future sections.
- Option B: Demote low-value information while keeping action-critical state visible.
- Option C: Keep all current copy and only change colors/spacing.

Rationale:

Option B best matches "remove unnecessary information" without making the UI less useful.

Tradeoffs:

Some sparse states remain because they protect comprehension and workflow safety.

Security and privacy impact:

No data exposure changes. Hiding decorative or duplicate information does not alter permissions.

Testing impact:

Review empty, loading, error, live, verified, pending, and no-data states.

Code-quality impact:

Improves information hierarchy. Avoids accidental removal of required domain knowledge.

Rollback or migration:

Revert presentation changes.

ADR required: No

### TD-004: Improve `ClassroomLiveClient.js` In Place

Decision:
Keep `ClassroomLiveClient.js` as the owner of classroom live behavior for this task, but add small local presentational helpers/constants if they reduce repeated JSX or make Swiss layout easier to maintain. Do not split behavior into new modules or change tab values (`live`, `schedule`, `students`).

Options considered:

- Option A: Split classroom live into many new components while redesigning.
- Option B: Improve presentation in place with local helpers.
- Option C: Leave classroom live mostly unchanged because it is large.

Rationale:

Option B gives the requested UI improvement while avoiding a behavior refactor in a high-risk component.

Tradeoffs:

The file remains large. The review must check helpers stay presentational and do not hide workflow logic.

Security and privacy impact:

No new data boundaries or permission behavior.

Testing impact:

Targeted lint plus manual diff review of every handler and endpoint string.

Code-quality impact:

Allows duplication reduction where safe, but avoids a large architectural split with unowned behavior risk.

Rollback or migration:

Revert the file.

ADR required: No

### TD-005: Use Serial Implementation in the Main Workspace

Decision:
Implement serially in the current workspace rather than splitting parallel worktrees.

Options considered:

- Option A: Parallelize each surface into separate worktrees.
- Option B: Work serially in the main workspace.

Rationale:

Write scopes are not safely disjoint because `ClassroomLiveClient.js` contains trainer and student classroom views, shared resources, and chat. Existing dirty changes also overlap with approved files.

Tradeoffs:

Less parallel speed, lower merge/conflict risk.

Security and privacy impact:

None.

Testing impact:

Run one integrated targeted verification pass after edits.

Code-quality impact:

Keeps one coherent design system and avoids conflicting local helper patterns.

Rollback or migration:

Revert current-workspace changes; no branch/worktree merge needed.

ADR required: No

## ADR Summary

No new ADRs are required. Decisions are reversible, UI-only, and not expected to outlive the task as architectural policy beyond knowledge-base notes.
