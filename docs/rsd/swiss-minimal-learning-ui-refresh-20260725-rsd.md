# Swiss Minimal Learning UI Refresh RSD

Status: Approved
Task ID: swiss-minimal-learning-ui-refresh-20260725
Owner: Codex
Last updated: 2026-07-25
Delivery mode: Manual

## Mode and Gate Policy

Manual mode is selected because the user did not request `semi-auto` or `auto`.

Gates waited on:
- Primary RSD approval: approved by user on 2026-07-25.

Gates still required:
- Technical decision package approval.
- Full task plan and dependency graph approval.
- Implementation review approval before final integration.

Gates skipped:
- None.

Waivers:
- None.

## Grill Mode Summary

Task restatement:
Redesign the trainer dashboard, trainer classroom experience, and student dashboard using a minimalist Swiss design direction while preserving existing logic and route paths.

Answers received:
- Use the `rsd-orchestrator-agent`.
- Use caveman ultra communication for chat responses.
- Trainer dashboard, trainer classroom, and student dashboard need to be rethought visually.
- Do not change logic or paths.
- Make the UI minimalist, remove unnecessary information, and improve presentation.
- Use best judgment for open scope details.
- Use Swiss design philosophy.

Assumptions:
- "Trainer dashboard" means `/trainer/dashboard`, implemented mainly in `client/src/app/trainer/dashboard/TrainerDashboardClient.js`.
- "Trainer classroom" means the trainer-facing portions of `/classroom/live/[id]`, implemented in `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`.
- "Student dashboard" means `/my_dashboard`, implemented in `client/src/app/my_dashboard/MyDashboardClient.js`.
- `/classroom/list` should be included for visual continuity because it is the shared classroom entry point and currently uses the same decorative visual language as the classroom surface.
- Existing trainer forms pages were already refreshed by `trainer-mode-ui-refresh-20260725`; they are out of scope unless a tiny shared consistency issue appears during review.
- "Not logic or path" means keep route URLs, endpoint strings, data fetches, state keys, handlers, submit behavior, validation branches, polling cadence, role checks, and authorization-bearing page guards unchanged.
- Swiss design means grid-first layout, strong alignment, restrained typography, generous but purposeful whitespace, high contrast, semantic accents, minimal decoration, and clear information hierarchy.
- Existing dirty worktree changes belong to the user or prior approved work and must be preserved.

Scope boundaries:
- Included: client presentation changes in `TrainerDashboardClient.js`, `ClassroomLiveClient.js`, `ClassroomListClient.js`, and `MyDashboardClient.js`.
- Included: small local presentational helpers/constants inside those files when they reduce repeated JSX.
- Excluded: server code, database/schema changes, API route changes, route file behavior changes, auth/authorization logic, polling behavior, chat delivery behavior, trainer form builder/detail pages, package dependency changes, and global design-system extraction.

Acceptance criteria candidates:
- Trainer dashboard becomes a Swiss-inspired operational overview with cleaner hierarchy, less duplicate metadata, clearer classroom status, and restrained action placement.
- Trainer classroom becomes a compact command workspace where live practice, schedule/setup, students/teams, resources, and chat are easier to scan without changing tab values or actions.
- Student classroom view inside `/classroom/live/[id]` becomes less card-heavy and more focused on active challenges, status, resources, and chat.
- Student dashboard becomes a minimal account/workspace page focused on platform verification and current useful status, with empty or future sections reduced or removed from first-order attention.
- Classroom list visually matches the same minimal system and avoids decorative hero/glow treatment.
- Existing route paths and behavior remain unchanged.

Important unresolved questions:
- None blocking. User explicitly delegated open UX decisions to Codex best judgment.

Decisions requiring user approval under selected mode:
- RSD approval received on 2026-07-25. Technical decisions require the next approval gate.

## Requirement Review and Auditor Pass

Reviewer result:
- No material contradictions found.
- Acceptance criteria are user-visible and testable.
- Scope is broad but bounded to four client presentation files and documentation.

Auditor result:
- RSD is satisfiable with existing dependencies and no server/API/schema change.
- Hidden dependency risk is `ClassroomLiveClient.js` size and current dirty-worktree overlap; both are recorded under risks.
- Bookkeeping issue fixed after approval: definition of done now marks the RSD gate as satisfied.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: repository shape, RSD-first workflow, scope constraints, and verification expectations.
  Evidence: trainer/classroom UI entry points live mainly under `client/src/app/trainer/`, `client/src/app/classroom/`, and `client/src/components/Navbar.js`; client UI changes should run narrow verification first.
  Confidence: High

- Source: `client/README.md`
  Used for: client app runtime context.
  Evidence: client is a Next.js app run with `npm run dev`.
  Confidence: High

- Source: `server/README.md`
  Used for: server runtime context and exclusion.
  Evidence: server runs with `bun run dev`; this UI-only task should not require server edits.
  Confidence: Medium

- Source: `client/package.json`
  Used for: available UI dependencies.
  Evidence: project already includes Tailwind, shadcn/Radix UI, and `lucide-react`; no new dependency is needed for this redesign.
  Confidence: High

- Source: `docs/knowledge-base/project-index.md`
  Used for: prior trainer/classroom scope facts.
  Evidence: trainer dashboard, classroom creation, and classroom resource authoring already have prior AI/resource work; trainer forms were refreshed separately.
  Confidence: High

- Source: `docs/knowledge-base/patterns.md`
  Used for: UI-only redesign boundary.
  Evidence: trainer UI-only refreshes should preserve existing handler/state/API shapes and use local presentation helpers when useful.
  Confidence: High

- Source: `docs/knowledge-base/decisions.md`
  Used for: design tooling decision.
  Evidence: trainer UI refreshes should use existing Tailwind, shadcn/Radix components, and lucide icons instead of adding dependencies or changing routes/process.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: quality bar and verification strategy.
  Evidence: trainer pages are operational surfaces; UI-only diffs must preserve endpoint strings, route targets, state keys, submit handlers, validation branches, and authorization-bearing guards.
  Confidence: High

- Source: `docs/knowledge-base/mistakes.md`
  Used for: risk planning.
  Evidence: full lint may fail on unrelated existing errors; broad searches can hit `server/NUL`; hydration risks can appear from browser-only capability checks.
  Confidence: High

- Source: `docs/rsd/trainer-mode-ui-refresh-20260725-rsd.md`
  Used for: prior related scope.
  Evidence: `/trainer/dashboard`, `/trainer/forms`, and `/trainer/forms/[id]` were previously refreshed while preserving process/routes; classroom live and student dashboard were not redesigned there.
  Confidence: High

- Source: `docs/reviews/trainer-mode-ui-refresh-20260725-implementation-review.md`
  Used for: residual risk and current dirty-worktree context.
  Evidence: prior trainer refresh touched `TrainerDashboardClient`, trainer form clients, and `TrainerWritingAssistant`; full lint had unrelated existing failures.
  Confidence: High

- Source: `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
  Used for: trainer dashboard behavior and presentation scope.
  Evidence: component fetches profile/classrooms, creates classrooms through `classroom/create`, links to forms/admin/classroom routes, and already contains operational card/list UI.
  Confidence: High

- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: trainer classroom and student classroom behavior.
  Evidence: one component owns trainer tabs, live practice, schedules, students/teams, resources, direct chat, student assigned challenges, and polling.
  Confidence: High

- Source: `client/src/app/classroom/list/ClassroomListClient.js`
  Used for: classroom entry scope.
  Evidence: component fetches classroom list/profile, optionally creates classrooms for trainers, and currently uses decorative hero/glow treatment.
  Confidence: High

- Source: `client/src/app/my_dashboard/MyDashboardClient.js`
  Used for: student dashboard scope.
  Evidence: component owns Codeforces/VJudge handle submission, verification status, and placeholder schedule/performance tabs.
  Confidence: High

## Goal

Create a cohesive Swiss-inspired learning workspace across trainer dashboard, classroom entry/live classroom, and student dashboard: minimal, aligned, readable, action-focused, and quieter, while preserving all existing routes and behavior.

## Non-Goals

- Do not change route paths, navigation destinations, page guards, API endpoints, payload shapes, database schema, or server controllers.
- Do not change classroom polling cadence, chat mechanics, trainer/student role detection, live-session state transitions, student/team management actions, resource submission behavior, or platform verification submission logic.
- Do not add dependencies, themes, global design-system abstractions, or broad CSS rewrites.
- Do not redesign trainer forms pages in this task.
- Do not clean unrelated dirty files or fix unrelated lint failures.

## Users and Use Cases

- Trainers need to scan classrooms, identify live sessions, create/open classrooms, and jump to form tools quickly.
- Trainers inside a classroom need to run live practice, schedule classes, manage students/teams, assign problems, add notes/hints, share resources, and chat.
- Students inside a classroom need to see active challenges, update challenge status, view notes/hints, read resources, and chat.
- Students on their dashboard need to verify Codeforces/VJudge handles and see useful account status without noise.

## User-Visible Behavior

- Layouts use clear grid alignment, compact headers, strong typographic hierarchy, restrained borders, and purposeful whitespace.
- Decorative gradient orbs, glow blobs, oversized hero treatment, duplicated stats, verbose process copy, and low-value placeholders are removed or demoted.
- Status accents remain semantic: live/error danger, verified success, pending warning/neutral, role/access informational.
- Buttons retain existing commands but become visually consistent and predictable.
- Empty/loading/error states remain visible, shorter, and less decorative.
- Tables/lists/cards become easier to scan, with stable dimensions and no text overlap on mobile or desktop.

## Acceptance Criteria

- [ ] `/trainer/dashboard` has a cleaner Swiss-inspired dashboard presentation while preserving profile/classroom fetches, create-classroom submit behavior, trainer/admin handling, AI draft application, and links.
- [ ] `/classroom/list` has a matching minimal classroom entry presentation while preserving classroom fetches, trainer-only create-classroom behavior, and links.
- [ ] `/classroom/live/[id]` trainer view has a simpler classroom command workspace while preserving tab values, forms, handlers, polling, endpoint strings, active-class logic, problem assignment, student/team management, schedule/start/complete actions, resources, and chat.
- [ ] `/classroom/live/[id]` student view is less cluttered and focuses on active challenges, challenge status, resources, hints/notes, and chat while preserving all existing student actions.
- [ ] `/my_dashboard` becomes a minimal student dashboard focused on account identity and platform verification while preserving Codeforces/VJudge submission behavior, toast handling, and external profile links.
- [ ] Existing paths remain `/trainer/dashboard`, `/classroom/list`, `/classroom/live/[id]`, and `/my_dashboard`.
- [ ] No server endpoint, database/schema, package dependency, route guard, authorization policy, or API payload contract changes.
- [ ] UI avoids overlapping text and awkward overflow in common mobile and desktop layouts.
- [ ] Verification runs targeted ESLint for changed client files, `git diff --check`, and broader client lint/build when feasible; unrelated blockers are recorded.
- [ ] RSD, technical decisions, task plan, implementation review, and knowledge-base notes are updated through required gates.

## Constraints

- Manual mode requires explicit approval before technical decisions, task plan, implementation, and final integration.
- Keep edits scoped to approved client UI files and artifacts.
- Use existing Tailwind, shadcn/Radix UI components, and lucide icons.
- Prefer local helpers over global abstractions.
- Preserve user/prior dirty work; patch current files, do not revert unrelated changes.
- Use Swiss design principles as implementation constraints, not as a new theme dependency.

## Dependencies

- Existing Next.js client app.
- Existing Hono/Bun server APIs consumed by client UI.
- Existing helper APIs: `get_with_token`, `post_with_token`, `ProgressLink`, `TrainerWritingAssistant`, `EditorWrapper`, `MarkdownRenderer`.
- Existing shadcn/Radix primitives and lucide icons.
- Existing Tailwind config/classes.

## Assumptions

- The best product choice is to include `/classroom/list` because it sits between trainer dashboard, classroom live pages, and student classroom access.
- The best minimalist choice is to remove decorative visuals and repeated explanatory text first, not to hide required workflow controls.
- Placeholder student dashboard sections should be demoted or reduced unless existing code has no other useful content to replace them with.
- Large `ClassroomLiveClient.js` can be improved with local presentational helpers without changing behavior; full architectural split is out of scope.

## Risks and Open Questions

- Risk: UI-only changes in `ClassroomLiveClient.js` could accidentally alter behavior because the file is large and owns many handlers. Mitigation: preserve handler/state/API shapes and diff-review endpoint strings and event handlers.
- Risk: Removing "unnecessary information" could hide useful context. Mitigation: remove decoration, duplicate metadata, and verbose copy first; keep statuses, errors, form labels, required counts, and action-critical fields.
- Risk: Existing dirty changes may overlap touched files. Mitigation: patch against current content and avoid reverting unrelated edits.
- Risk: Full lint may fail for unrelated existing files. Mitigation: run targeted lint for changed files and record full-suite blockers.
- Risk: Visual QA may be limited without authenticated live data. Mitigation: use code review, build/lint, and local rendering checks where available.

## Test Expectations

- Run targeted ESLint for:
  - `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
  - `client/src/app/classroom/list/ClassroomListClient.js`
  - `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  - `client/src/app/my_dashboard/MyDashboardClient.js`
- Run `git diff --check`.
- Run `npm run lint` in `client/` if feasible; record unrelated blockers.
- Run `npm run build` in `client/` if scope/risk justifies it.
- Manual diff review for unchanged routes, endpoint strings, state transitions, handlers, and authorization-bearing guards.

## Code Quality Expectations

- Keep the common path obvious: open classroom, manage live practice, verify platform accounts.
- Remove visual bloat before adding helpers.
- Add local helpers only when they reduce meaningful repeated JSX or clarify a repeated UI pattern.
- Avoid public API changes, new dependencies, global state, global theme abstractions, and broad refactors.
- Keep comments sparse and only for non-obvious constraints.
- Keep Swiss design rules concrete: grid, alignment, type scale, contrast, whitespace, semantic accent, no decorative blobs.

## Definition of Done

- [x] Mandatory Grill Mode completed.
- [x] RSD gate satisfied for Manual mode.
- [x] Technical decision gate satisfied for Manual mode.
- [x] Full task plan gate satisfied for Manual mode.
- [ ] Implementation passes verification.
- [ ] Implementation review gate satisfied for Manual mode.
- [ ] All approved task work integrated into final Git workflow.
- [ ] Knowledge base and mistake note updated.
