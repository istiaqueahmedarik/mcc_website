# Trainer Compact UI Cleanup RSD

Status: Approved
Task ID: trainer-compact-ui-cleanup-20260802
Owner: Codex
Last updated: 2026-08-02
Approved: 2026-08-02 by user

## 1. Request

Improve the trainer feature design because the current UI feels clumsy, shows too much information at once, and becomes overwhelming on mini-laptop sized screens.

## 2. Source Context

- `AGENTS.md` requires RSD-first delivery and approval gates before implementation.
- `.interface-design/system.md` is not present, so this task needs a compact design direction.
- `docs/knowledge-base/quality-rules.md` says trainer pages should remain operational surfaces with dense, clear layouts, semantic status accents, stable icon buttons, clear tables/lists, and responsive panels.
- `docs/knowledge-base/hci-rules.md` and `docs/knowledge-base/mistakes.md` emphasize bounded dense surfaces, calm controls, avoiding visible count clutter, and protecting mini-laptop layouts with `min-w-0`, local scroll regions, and deliberate grid tracks.
- Current trainer entry points inspected:
  - `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
  - `client/src/app/trainer/forms/TrainerFormsClient.js`
  - `client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js`

## 3. Problem

The trainer UI has the right workflow, but the visual hierarchy is too loud and too flat:

- Dashboard cards are tall and repeat secondary metadata, which reduces scan speed.
- Header actions, live sessions, tour controls, badges, descriptions, counts, and card actions all compete at once.
- The form builder exposes setup, type selection, targeting, presets, full field editing, library, and draft summary in one long page, so trainers must scroll and visually parse too much.
- Form details show a large header, status badges, share strip, metrics, tabs, analytics, dynamic metrics, tables, and JSON panels without enough compression or priority.
- Mini-laptop screens have limited vertical space, so permanent panels and large cards make the product feel heavier than the work requires.

## 4. Design Exploration

Domain:
Class roster, session prep, live room, attendance sheet, response queue, assignment review, field cells, operations desk, quick handoff, classroom status.

Color world:
Whiteboard surface, notebook paper, low-ink dividers, marker blue, attendance green, review amber, live-session red, muted slate text, soft classroom daylight.

Signature:
A compact "teaching desk" layout: one command rail/header for primary actions, slim status strips for live/attention states, and dense list rows that reveal secondary details only where they help the next action.

Rejecting:
- Large dashboard cards for every classroom -> compact operational rows/cards with one primary action.
- Always-visible explanatory text everywhere -> terse labels, muted metadata, and details moved into bounded panels or collapsed summaries.
- Pulsing/count-heavy attention UI -> calm static live/review accents with action-focused buttons.

Direction:
Clean the trainer experience into a restrained operational workspace. The focal point on each screen should be the next trainer action: open a classroom, continue a live room, create a form, edit the field queue, inspect responses. Use existing shadcn/Tailwind/lucide components, small-radius surfaces, semantic status accents, tabular numbers, compact buttons, and responsive grids that stay readable around mini-laptop widths.

## 5. Scope

Included:

- Refresh `/trainer/dashboard` presentation in `TrainerDashboardClient.js`.
- Refresh `/trainer/forms` presentation in `TrainerFormsClient.js`.
- Refresh `/trainer/forms/[id]` presentation in `TrainerFormDetailClient.js`.
- Keep all existing data fetches, mutations, routes, state transitions, field behavior, copy/open actions, and admin/trainer affordances.
- Keep onboarding tour entry points functional, but make the permanent tour launcher less visually dominant.

Excluded:

- Server/API changes.
- Database/schema changes.
- Authorization changes.
- Route changes.
- Classroom live internals under `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`, except for future follow-up if the user approves a separate classroom-specific cleanup.
- New UI dependencies.
- New global design system extraction.

## 6. Requirements

- REQ-1: Trainer dashboard must reduce clutter by prioritizing live sessions, primary classroom entry, and create/manage actions over repeated descriptions and metadata.
- REQ-2: Dashboard classroom items must remain readable and actionable on mini-laptop widths without tall card bloat or overlapping controls.
- REQ-3: Trainer form builder must separate setup, field construction, existing forms, and draft summary into clearer compact regions.
- REQ-4: Field queue editing must remain complete, but individual field rows should scan cleaner and avoid unnecessary vertical bulk where possible.
- REQ-5: Form detail must make response inspection the focal workflow, with compact status/share/metric treatment and clear tab states.
- REQ-6: Loading, empty, error, live, draft/published, accepting/closed, mapped/custom, and copy-success states must stay visible.
- REQ-7: Existing route paths, API endpoints, handlers, validation logic, and auth-bearing behavior must remain unchanged.
- REQ-8: Use existing project styling conventions: Tailwind semantic tokens, shadcn/Radix controls where already used, and lucide icons.

## 7. Acceptance Criteria

- [ ] `/trainer/dashboard` feels materially cleaner and more scannable, with fewer always-visible details and a stronger primary action hierarchy.
- [ ] `/trainer/dashboard` works at mini-laptop width without text/control overlap or excessive vertical weight in the first viewport.
- [ ] `/trainer/forms` keeps the same form creation workflow while improving scan order, panel density, and sticky/sidebar behavior.
- [ ] `/trainer/forms/[id]` keeps share, toggle, analytics, explore, and JSON workflows intact while reducing header/metric clutter.
- [ ] No server, route, database, authorization, or endpoint strings are changed.
- [ ] No new dependencies are added.
- [ ] Targeted client lint covers changed trainer UI files.
- [ ] Visual verification is performed at a mini-laptop-like viewport and one mobile viewport, if the local app can be run.

## 8. Risks

- Risk: A UI cleanup could accidentally alter workflow behavior.
  Mitigation: Preserve existing state variables, handlers, API strings, and navigation targets; review diffs specifically for behavioral changes.

- Risk: Compacting too aggressively could hide useful trainer context.
  Mitigation: Keep essential status and ownership context visible; demote descriptions and repeated metadata rather than removing decision-critical controls.

- Risk: Existing lint failures outside this scope could block full verification.
  Mitigation: Run targeted lint for changed files and record unrelated full-suite blockers if present.

## 9. Approval Gate

This Primary RSD requires user approval before technical decisions, task planning, or implementation.
