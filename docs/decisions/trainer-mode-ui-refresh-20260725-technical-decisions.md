# Trainer Mode UI Refresh Technical Decisions

Status: Approved by auto-mode waiver
Task ID: trainer-mode-ui-refresh-20260725
Last updated: 2026-07-25
Delivery mode: Auto

## Mode and Gate Results

Gates waited on:
- None.

Gates skipped:
- RSD approval, technical decision approval, task plan approval, implementation-review approval.

Waivers:
- Human gate approvals skipped because the user requested full autonomous mode.
- Waiver limited to reversible client UI edits and docs. No route, process, API, schema, auth, dependency, or destructive Git action is covered.

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-mode-ui-refresh-20260725-rsd.md`
  Used for: requirement scope and non-goals.
  Evidence: UI refresh must preserve routes, process, server endpoints, data model, and authorization behavior.
  Confidence: High

- Source: `AGENTS.md`
  Used for: project shape and verification commands.
  Evidence: trainer UI entry points live mainly under `client/src/app/trainer/`.
  Confidence: High

- Source: `docs/knowledge-base/patterns.md`
  Used for: AI helper boundary to preserve.
  Evidence: `TrainerWritingAssistant` and `trainer-writing-ai.js` own AI draft behavior and volatility.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: verification strategy.
  Evidence: targeted lint can be used when unrelated full lint failures exist.
  Confidence: High

- Source: `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
  Used for: dashboard behavior preservation.
  Evidence: existing handlers fetch profile/classrooms, create classrooms, and apply AI drafts.
  Confidence: High

- Source: `client/src/app/trainer/forms/TrainerFormsClient.js`
  Used for: form-builder behavior preservation.
  Evidence: existing handlers own form state, field operations, share-link copy, and create-form submit.
  Confidence: High

- Source: `client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js`
  Used for: form-detail behavior preservation.
  Evidence: existing component owns analytics loading, tab state, query filtering, and share-link copy.
  Confidence: High

- Source: `client/package.json`
  Used for: available design tools.
  Evidence: Tailwind, Radix/shadcn UI components, and lucide icons are already available.
  Confidence: High

## Context

The trainer-mode UI is functional but visually inconsistent and card-heavy. Existing pages mix large hero-like blocks, decorative effects, and dense form controls. The user wants a whole-UI design refresh while preserving current process and routes.

## Decisions

### TD-001: Redesign Only Trainer Route Client Components

Decision:
Limit implementation edits to `TrainerDashboardClient`, `TrainerFormsClient`, `TrainerFormDetailClient`, and optional trainer component styling. Do not edit route files, API endpoints, server code, auth guards, or data models.

Options considered:

- Option A: Redesign all trainer-adjacent classroom pages too.
- Option B: Redesign only client components under `/trainer` and visually connected trainer helper components.
- Option C: Add new trainer routes or split workflows.

Rationale:

Option B best matches "trainer mode" and "not the process or route." It gives a full trainer UI refresh without changing classroom live behavior, server contracts, or navigation paths.

Tradeoffs:

Classroom live pages may still have a different visual language. That is acceptable because they are outside the requested route/process boundary.

Security and privacy impact:

No auth, data exposure, logging, secret, or permission behavior changes.

Testing impact:

Verify changed trainer client files with targeted lint and manual diff review for route/API stability.

Code-quality impact:

Smallest reversible scope. Avoids shotgun surgery across classroom/server modules.

Rollback or migration:

Revert the touched trainer client files and docs. No migration needed.

ADR required: No

### TD-002: Use Operational Workspace Layout, Not Marketing Hero Treatment

Decision:
Replace decorative hero/orb-heavy visuals with operational workspace patterns: compact command headers, metric tiles, segmented controls, table-like rows, semantic status lanes, and responsive grids.

Options considered:

- Option A: Continue current decorative gradient hero/card direction.
- Option B: Use a restrained operational SaaS layout with semantic accents.
- Option C: Introduce a new brand/theme system.

Rationale:

Trainer mode is a repeated-use operational tool. Option B improves scanning and action speed while staying within existing Tailwind/shadcn/lucide tooling.

Tradeoffs:

Less decorative flair. More emphasis on hierarchy, density, and predictable controls.

Security and privacy impact:

None.

Testing impact:

Manual responsive review through code and targeted lint; no business behavior tests are changed.

Code-quality impact:

Avoids global theming churn. Uses local constants and small helper components only where they reduce repetitive UI markup.

Rollback or migration:

Revert UI class and helper changes.

ADR required: No

### TD-003: Preserve Existing State and Handler Shape

Decision:
Keep current data fetching, state keys, submit handlers, field operations, tab state, and link targets. Change JSX structure/classes around them, not workflow logic.

Options considered:

- Option A: Refactor form-builder state into a reducer while redesigning.
- Option B: Keep behavior logic stable and focus on presentation.
- Option C: Replace field editing with a new wizard.

Rationale:

The user explicitly excluded process and route changes. Option B reduces regression risk and keeps the diff reviewable despite a broad UI update.

Tradeoffs:

Some component files remain large. A later task can extract behavior or panels if requirements expand.

Security and privacy impact:

No new data path or authorization surface.

Testing impact:

Review that endpoint strings, redirects, and state transitions are unchanged.

Code-quality impact:

Avoids accidental behavior coupling during a design-only change. Local presentation helpers are acceptable; broad state refactors are out of scope.

Rollback or migration:

Revert UI changes.

ADR required: No

### TD-004: Keep Existing Dependencies

Decision:
Use existing Tailwind, shadcn/Radix components, and `lucide-react` icons. Do not add UI dependencies.

Options considered:

- Option A: Add a dashboard or table UI library.
- Option B: Build the refresh with existing local tools.

Rationale:

The project already has enough UI primitives. Adding dependencies for a visual refresh would increase maintenance and lockfile churn without changing capability.

Tradeoffs:

Some markup remains custom Tailwind.

Security and privacy impact:

No new dependency risk.

Testing impact:

No dependency install required.

Code-quality impact:

Keeps toolchain stable and avoids unrelated package changes in an already dirty worktree.

Rollback or migration:

Revert UI files only.

ADR required: No
