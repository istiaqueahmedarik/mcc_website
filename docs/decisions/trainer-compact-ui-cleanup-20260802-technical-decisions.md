# Trainer Compact UI Cleanup Technical Decisions

Status: Approved
Task ID: trainer-compact-ui-cleanup-20260802
Last updated: 2026-08-02
Approved: 2026-08-02 by user

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-compact-ui-cleanup-20260802-rsd.md`
  Used for: approved scope, non-goals, acceptance criteria, and mini-laptop density requirement.
  Confidence: High

- Source: `AGENTS.md`
  Used for: approval gates, trainer entry points, verification expectations, and project memory updates.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: operational trainer UI direction, bounded dense member/list rules, and targeted lint fallback.
  Confidence: High

- Source: `docs/knowledge-base/hci-rules.md`
  Used for: calm controls, avoiding flashing/count-heavy controls, and keeping response/thread-like surfaces bounded.
  Confidence: High

- Source: `docs/knowledge-base/mistakes.md`
  Used for: known layout overflow failure modes and mini-laptop/sidebar protection patterns.
  Confidence: High

- Source: `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
  Used for: dashboard UI structure, classroom actions, substitute trainer modal, live-session lane, and tour hooks.
  Confidence: High

- Source: `client/src/app/trainer/forms/TrainerFormsClient.js`
  Used for: form-builder layout, field queue behavior, form library, draft summary, and create-form workflow.
  Confidence: High

- Source: `client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js`
  Used for: form detail header, share/toggle actions, analytics, explore table, JSON panel, and response filtering.
  Confidence: High

- Source: `client/src/app/globals.css`, `client/tailwind.config.js`, `client/src/components/ui/*`
  Used for: existing semantic tokens, Tailwind/shadcn setup, radius scale, and control conventions.
  Confidence: High

## TD-001: UI-Only, Existing-Route Scope

Decision:
Limit implementation changes to the trainer route client components and required documentation. Do not change server code, API route handlers, database schema, authorization checks, navigation paths, endpoint strings, or form/classroom workflow semantics.

Rationale:
The approved RSD asks for a cleaner trainer feature design, especially for mini laptops, while preserving existing process and route behavior. Keeping logic and contracts stable reduces regression risk.

Implementation impact:
- `TrainerDashboardClient.js`, `TrainerFormsClient.js`, and `TrainerFormDetailClient.js` may receive JSX/class/helper changes.
- Existing state keys, handlers, fetch calls, mutation calls, redirects, and `ProgressLink` destinations remain intact unless a purely presentational wrapper is needed.

ADR required: No.

## TD-002: Dashboard Becomes A Compact Operations Index

Decision:
Redesign the trainer dashboard around a compact command header, a calm live-session strip, and a classroom operations list/card hybrid instead of tall repeated classroom cards and large always-visible descriptions.

Rationale:
The trainer’s dashboard job is to open the right classroom, continue a live session, create a classroom, or jump to forms/admin tools. Tall cards repeat trainer/date/description information and crowd mini-laptop screens before the trainer can scan the available classrooms.

Implementation impact:
- Demote role/count summary information into compact chips or inline metrics.
- Remove pulsing live animation in favor of a static semantic live accent.
- Prefer one primary classroom entry button per item plus a compact icon action for co-trainers.
- Clamp or truncate descriptions and secondary metadata.
- Use deliberate responsive tracks, `min-w-0`, and stable button sizes so rows do not overlap around 1280-1366px widths.

ADR required: No.

## TD-003: Form Builder Uses A Two-Zone Workbench

Decision:
Keep the existing form-builder workflow, but reorganize presentation into a clearer workbench: compact setup/type/target controls in the main work area, field construction and field queue as the primary center of gravity, and existing forms/draft summary as bounded supporting panels.

Rationale:
The current page exposes every setup, preset, field, library, and payload detail with similar visual weight. Trainers need the field queue and create action to lead, while setup/library context stays available without dominating the viewport.

Implementation impact:
- Keep form type selection, primary key mapping, classroom/session selection, preset add buttons, field operations, validation, and submit unchanged.
- Reduce explanatory copy, repeated borders, and oversized panel padding.
- Keep right-side panels bounded and responsive; on smaller widths they stack naturally without sticky overflow.
- Keep field editing complete and visible, but tighten labels, row headers, icon buttons, and control spacing.

ADR required: No.

## TD-004: Form Detail Prioritizes Response Inspection

Decision:
Restructure form detail so response inspection is the focal workflow: compact title/status/action header, slim share/metric strip, clear tab controls, and bounded analytics/explore/JSON panels.

Rationale:
After a form exists, the trainer is mostly checking response count, toggling acceptance, copying/opening the form, and inspecting response data. Oversized title/status/share/metric treatment pushes that work down the page.

Implementation impact:
- Preserve accepting-responses toggle, share copy, public form open link, active tab state, response search, analytics display, dynamic metrics, and JSON details.
- Use compact status pills with semantic accents.
- Keep the response table horizontally scrollable and avoid squeezing columns into unreadable widths.
- Keep empty states near the panel they describe.

ADR required: No.

## TD-005: Existing Tokens, Restrained Semantic Accents

Decision:
Use existing Tailwind semantic tokens, shadcn/Radix controls already in the codebase, and lucide icons. Do not add dependencies or create a new global design system in this task.

Rationale:
The repo already has suitable UI primitives and theme tokens. The cleanup should improve hierarchy, density, and consistency without package churn or unrelated global style changes.

Implementation impact:
- Use `bg-background`, `bg-card`, `bg-muted`, `text-muted-foreground`, `border`, `primary`, `destructive`, and semantic Tailwind color accents where status meaning is explicit.
- Prefer stable icon buttons for secondary actions.
- Keep radius small/medium and avoid decorative hero/orb/gradient treatments.
- Add local helper components only when they reduce repeated markup inside a touched file.

ADR required: No.

## TD-006: Verification Targets Mini-Laptop And Mobile Layout Risk

Decision:
Verify with targeted lint on changed trainer files and visual checks at a mini-laptop-like viewport plus one mobile viewport when the local app can run.

Rationale:
The user’s primary complaint is visual crowding on mini-laptop screens. Code-only review is not enough for this type of UI work.

Implementation impact:
- Run targeted ESLint for changed trainer UI files.
- Attempt local browser verification after implementation.
- Record any unrelated full-suite lint blockers or local app blockers.

ADR required: No.

## Approval Gate

Technical decision package approved by user on 2026-08-02.
