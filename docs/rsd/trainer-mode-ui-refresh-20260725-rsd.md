# Trainer Mode UI Refresh RSD

Status: Approved by auto-mode waiver
Task ID: trainer-mode-ui-refresh-20260725
Owner: Codex
Last updated: 2026-07-25
Delivery mode: Auto

## Mode and Gate Policy

The user requested `mode: full autonomous`, treated as Auto mode under the RSD orchestrator delivery rules. Repository `AGENTS.md` normally requires human approval after RSD, technical decisions, task plan, and implementation review. This run records those human approvals as skipped by explicit current user instruction.

Gates waited on:
- None.

Gates skipped:
- Primary RSD approval.
- Technical decision package approval.
- Full task plan approval.
- Implementation review approval before final integration.

Waivers:
- Human approval gates waived because the user requested full autonomous mode.
- Waiver is limited to this reversible UI-only trainer-mode redesign. No route, server API, database, authorization, or destructive Git operation is approved by this waiver.

## Grill Mode Summary

Task restatement:
Redesign the trainer-mode UI across the currently provided trainer system while keeping the existing process and routes unchanged.

Answers received:
- Caveman ultra communication should be active.
- RSD orchestrator should be used.
- Mode is full autonomous.
- Improve design and change the whole UI of the current trainer system.
- Do not change the process or route.

Assumptions:
- "Trainer mode" means trainer dashboard plus trainer form management pages under `client/src/app/trainer/`.
- Classroom live pages and server classroom/resource APIs are not included unless needed by route behavior; this task can complete without touching them.
- "Not the process or route" means keep existing URLs, data fetches, mutations, state transitions, validation rules, and authorization checks intact.
- A full UI refresh should be visual/layout/interaction polish only, not a new workflow or data model.
- Existing dirty worktree changes belong to the user or prior work and must be preserved.

Scope boundaries:
- Included: `TrainerDashboardClient`, `TrainerFormsClient`, `TrainerFormDetailClient`, and the trainer writing assistant presentation if needed for visual consistency.
- Excluded: route files except read-only verification, server controllers, API route handlers, database/schema work, auth logic, new dependencies, URL changes, feature process changes, and unrelated global redesign.

Acceptance criteria candidates:
- Trainer dashboard has a new, cohesive operational layout with improved hierarchy, responsive spacing, action placement, live state visibility, and classroom cards/listing.
- Trainer form builder has a redesigned layout that keeps form creation, field mapping, presets, status, validation, and submission behavior unchanged.
- Trainer form detail has a redesigned analytics/explore/JSON interface that keeps existing tabs, search, copy, open, and data display behavior unchanged.
- Trainer writing assistant remains draft-only and manual fallback remains usable.
- Existing trainer routes remain `/trainer/dashboard`, `/trainer/forms`, and `/trainer/forms/[id]`.

Important unresolved questions:
- Exact visual brand preference is not specified. Proceed with conservative operational UI: quiet surfaces, restrained borders, semantic accents, dense scanning, no route/process changes.

Decisions requiring user approval under selected mode:
- None. Auto mode allows conservative reversible UI decisions with rationale recorded.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: repository shape, trainer entry points, verification expectations, and normal approval gates.
  Evidence: trainer/classroom UI entry points live mainly under `client/src/app/trainer/`, `client/src/app/classroom/`, and `client/src/components/Navbar.js`.
  Confidence: High

- Source: `docs/knowledge-base/project-index.md`
  Used for: trainer dashboard and classroom context.
  Evidence: trainer dashboard classroom creation uses `TrainerWritingAssistant`; trainer/admin classroom creation and resource authoring have AI draft assistance from prior work.
  Confidence: High

- Source: `docs/knowledge-base/patterns.md`
  Used for: reusable trainer AI boundary.
  Evidence: `TrainerWritingAssistant` owns reusable UI status and draft application; model lifecycle stays in `trainer-writing-ai.js`.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: verification strategy and UI safety.
  Evidence: scoped component changes may use targeted lint when full lint has unrelated existing failures.
  Confidence: High

- Source: `docs/rsd/trainer-dashboard-ai-resource-writing-assistant-rsd.md`
  Used for: trainer dashboard AI writing requirements to preserve.
  Evidence: generated text is draft-only and must not replace manual authoring or authorization.
  Confidence: High

- Source: `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
  Used for: dashboard UI and behavior.
  Evidence: component fetches profile and classrooms, creates classrooms through `classroom/create`, and links to trainer forms/admin trainers/classroom live routes.
  Confidence: High

- Source: `client/src/app/trainer/forms/TrainerFormsClient.js`
  Used for: form-builder UI and behavior.
  Evidence: component fetches forms, classrooms, user fields, creates forms through `trainer-forms/manage/forms`, and preserves dynamic form-field state.
  Confidence: High

- Source: `client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js`
  Used for: form analytics/details UI and behavior.
  Evidence: component loads form, responses, analytics, copies share links, switches tabs, searches responses, and renders JSON.
  Confidence: High

- Source: `client/package.json`
  Used for: available UI libraries.
  Evidence: project already includes Tailwind, shadcn/Radix components, and lucide icons.
  Confidence: High

## Goal

Make trainer mode feel like a polished operational workspace: clearer hierarchy, faster scanning, better responsive layout, consistent controls, and stronger live/form analytics visibility, while preserving existing routes and workflows.

## Non-Goals

- Do not change trainer route paths or navigation destinations.
- Do not change API calls, server routes, data model, permissions, classroom processes, or form creation process.
- Do not add a new design dependency.
- Do not redesign student-facing public forms or classroom live route in this task.
- Do not fix unrelated package, lint, server, or dirty-worktree issues.

## Users and Use Cases

- Trainers scan classroom health, live sessions, and quick actions from the dashboard.
- Trainers create classrooms using the same dialog and AI draft assistance as before.
- Trainers build invitation, attendance, and general forms with the same field mapping and presets.
- Trainers manage a form's share URL, analytics, searchable responses, and JSON exports from the same detail route.
- Admin trainers keep their existing admin-trainer management action.

## User-Visible Behavior

- Trainer dashboard uses a redesigned top command area, status metrics, live session lane, and classroom collection view.
- Form builder uses a clearer builder workspace with setup, identity mapping, dynamic target, field kit, field list, and existing forms surfaces.
- Form detail uses a tighter header, share URL strip, metric row, segmented tab controls, and redesigned analytics/explore/JSON panels.
- Buttons, inputs, tabs, badges, and repeated classroom/form/field cards use consistent radius, borders, icon placement, and responsive constraints.
- Empty, loading, error, live, published/draft, mapped/custom, and copy-success states remain visible.

## Acceptance Criteria

- [ ] `/trainer/dashboard` renders a materially redesigned UI while preserving data fetches, create-classroom submit behavior, trainer/admin guards, and links.
- [ ] `/trainer/forms` renders a materially redesigned form-builder UI while preserving form type selection, primary-key mapping, classroom/session selection, field add/remove/duplicate/reorder, validation, and form submission.
- [ ] `/trainer/forms/[id]` renders a materially redesigned form-management UI while preserving share-link copy, open-form link, analytics tab, explore tab, JSON tab, search, and loaded data shape.
- [ ] Trainer writing assistant remains draft-only and does not auto-submit.
- [ ] No route path, server endpoint, data model, or authorization logic is changed.
- [ ] UI is responsive and avoids overlapping text in common mobile and desktop layouts.
- [ ] Visual style is operational and restrained, with semantic accents instead of one-note decorative gradients.
- [ ] Targeted lint or equivalent verification covers changed client files, and any unrelated blockers are recorded.
- [ ] RSD, decisions, task plan, implementation review, and knowledge-base notes are updated.

## Constraints

- Keep edits inside approved trainer UI and documentation scope.
- Preserve existing imports and behavior unless a UI-only helper is justified.
- Use lucide icons already available in the project.
- Prefer shadcn/Radix and Tailwind patterns already in use.
- Avoid decorative gradient orbs, oversized landing-page hero treatment, nested card clutter, and route/process changes.
- Leave unrelated dirty files untouched.

## Dependencies

- Existing Next.js client app and Tailwind/shadcn setup.
- Existing trainer API endpoints consumed through `get_with_token`, `post_with_token`, and detail page `/api/trainer-forms/...` fetches.
- Existing `TrainerWritingAssistant` and `ProgressLink`.
- Existing UI components: `Button`, `Input`, `Textarea`, `Badge`, `Checkbox`, `Dialog`.

## Risks and Open Questions

- Risk: Large UI rewrite can accidentally change behavior. Mitigation: preserve handlers, state shape, endpoints, validation, and links; review diffs for non-UI changes.
- Risk: Dense form-builder UI can overflow on mobile. Mitigation: use responsive grids, stable icon-button sizes, truncation, and vertical stacking under smaller breakpoints.
- Risk: Existing dirty changes in same files can be overwritten. Mitigation: read current files and patch only against current content.
- Risk: Full lint may fail due unrelated repository issues. Mitigation: run targeted lint for changed trainer UI files and record full-lint blocker if present.

## Test Expectations

- Run targeted ESLint for changed trainer UI files.
- Run `npm run lint` in `client/` if feasible and record unrelated failures.
- Run `git diff --check`.
- Manual code review for unchanged routes, endpoints, state transitions, and submit handlers.

## Code Quality Expectations

- Keep UI helpers local unless reuse is clear inside a file.
- Avoid speculative design-system extraction.
- Keep behavior handlers readable and unchanged except for UI-only state needed by presentation.
- Use semantic names such as `statTiles`, `liveClassrooms`, `fieldTone`, and `TabButton`.
- Keep common workflow path obvious: create classroom, build form, manage form.
- Do not hide API or authorization details behind new abstractions.

## Definition of Done

- [x] Mandatory Grill Mode completed through auto-mode internal assumptions.
- [x] RSD gate satisfied by auto-mode waiver.
- [x] Technical decision gate satisfied by auto-mode waiver.
- [x] Full task plan gate satisfied by auto-mode waiver.
- [ ] Implementation passes verification.
- [ ] Implementation review gate satisfied by auto-mode waiver.
- [ ] Knowledge base and mistake note updated.
