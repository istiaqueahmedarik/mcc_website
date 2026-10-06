# Past Class Detail Visualization Technical Decisions

Status: Approved by auto-mode waiver
Task ID: past-class-detail-visualization-20260725
Last updated: 2026-07-25
Delivery mode: Auto

## Mode and Gate Results

- Gates waited on: none.
- Gates skipped: RSD approval, technical decision approval.
- Waivers: human approval gates skipped because the user requested Auto mode. Waiver limited to reversible classroom history UI and additive internal response shaping.
- User approvals: current user request selected `mode:auto`.

## Documentation and Knowledge Used

- Source: `docs/rsd/past-class-detail-visualization-20260725-rsd.md`
  Used for: decision scope and acceptance criteria.
  Evidence: completed classes should be visible in-page, with selected detail, rounded progress visualization, problem rows, and class-specific resources.
  Confidence: High

- Source: `AGENTS.md`
  Used for: stack and verification constraints.
  Evidence: classroom UI entry point is under `client/src/app/classroom/`; client UI changes should use narrow verification.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: behavior-preservation rules.
  Evidence: classroom live UI refreshes should preserve polling intervals, endpoint strings, and chat/resource/problem handlers unless explicitly approved.
  Confidence: High

- Source: `docs/adr/0002-markdown-source-classroom-resources.md`
  Used for: markdown rendering decision.
  Evidence: classroom resource markdown must render with raw HTML disabled.
  Confidence: High

- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: UI and local state decisions.
  Evidence: active class is derived from detail payload; problems are fetched through `/api/classroom/class/${active.id}/problems`; resources are rendered from `resources`.
  Confidence: High

- Source: `server/src/controllers/classroomController.ts`
  Used for: response-shape decision.
  Evidence: details currently fetches only `class_id IS NULL` resources, while `addResource` can store `classId: activeClass?.id || null`.
  Confidence: High

## Context

Completed classes exist in the `classes` payload, but the classroom page only renders them as schedule rows. Problem detail can already be loaded by class id through the existing problems API. Class-specific resources are stored, but current detail loading filters them out, so a past class cannot show resources attached during that session.

## Decisions

### TD-001: Add In-Page Class History Instead of a New Route

Decision: Render completed-class history and selected detail inside `ClassroomLiveClient.js`.

Options considered:

- Option A: Add a new `/classroom/history/[id]` route.
- Option B: Add an in-page history panel on `/classroom/live/[id]`.
- Option C: Put completed detail only inside the schedule tab rows.

Rationale:
Option B satisfies the missing visualization without route churn. It keeps the user's existing mental model: classroom page contains live, scheduled, completed, resources, and chat context.

Tradeoffs:
The existing component becomes slightly larger. This is acceptable because the detail uses local helpers and avoids new routing/API orchestration.

Security and privacy impact:
No new public route. Uses existing authenticated classroom page and existing class-problem authorization.

Testing impact:
Targeted lint and manual endpoint/handler review must confirm existing behavior remains.

HCI impact:
Selecting a completed class maps directly to an adjacent detail panel. Visible selected state and empty/loading states reduce hidden-mode confusion.

Code-quality impact:
Small local helpers are justified for progress math and repeated session visuals. No global design-system abstraction.

Rollback or migration:
Revert `ClassroomLiveClient.js` history UI changes.

ADR required: No

### TD-002: Use Existing Problem API for Past Class Detail

Decision: Fetch selected completed class problems from `/api/classroom/class/${classId}/problems`.

Options considered:

- Option A: Expand classroom details to include all problem rows for every class.
- Option B: Fetch selected class problems on demand through the existing problem proxy route.
- Option C: Add a new completed-class-summary endpoint.

Rationale:
Option B keeps payload size lower, preserves existing authorization logic, and avoids a new endpoint.

Tradeoffs:
Selecting a past class has an extra request and loading state.

Security and privacy impact:
Reuses existing `getClassProblems` authorization. No new problem data access path.

Testing impact:
Review fetch path and loading/empty states.

HCI impact:
On-demand loading gives clear feedback and avoids making the main classroom load heavier.

Code-quality impact:
Keeps problem-fetching logic close to existing `fetchProblems`, with separate state for selected past class to avoid mixing live and past rows.

Rollback or migration:
Revert client state/fetch changes.

ADR required: No

### TD-003: Return All Classroom Resources and Filter in Client

Decision: Change `getClassroomDetails` to return all resources for the classroom, then filter `class_id == null` for the classroom-level resource panel and `class_id == selectedClass.id` for past detail.

Options considered:

- Option A: Keep details response as classroom-level resources only.
- Option B: Add a client API route for `/classroom/:id/resources` and fetch all resources separately.
- Option C: Make existing details response include all classroom resources and filter at display sites.

Rationale:
Option C is the smallest additive change. The endpoint already returns classroom resource data, and display sites can explicitly separate classroom-level from class-specific resources.

Tradeoffs:
Details payload may contain more resource rows. This is acceptable for current classroom scale and avoids another request.

Security and privacy impact:
No new endpoint. Existing details endpoint authorization posture is not broadened, but existing broad classroom detail access remains a residual risk and should be handled under a dedicated authorization task.

Testing impact:
Review resource filtering so class resources do not appear in the general resource section.

HCI impact:
Class-specific materials appear in the class detail where users expect them, while general classroom resources stay separate.

Code-quality impact:
Resource filtering remains explicit and local. No schema or migration.

Rollback or migration:
Restore `class_id IS NULL` query and remove client filters.

ADR required: No

### TD-004: Use CSS Rounded Progress Visualization

Decision: Build solve/tried/not-solved distribution with Tailwind layout and rounded bars, not Recharts.

Options considered:

- Option A: Use Recharts.
- Option B: Use custom SVG.
- Option C: Use semantic DOM blocks with rounded percentage bars and counts.

Rationale:
Option C is sufficient, accessible, dependency-free, and consistent with the current operational UI.

Tradeoffs:
Less chart interactivity than a chart library, but lower complexity.

Security and privacy impact:
No external assets or dependencies.

Testing impact:
Manual review for no text overlap and zero-count behavior.

HCI impact:
Labels and counts accompany color bars, so users can evaluate status without relying on color alone.

Code-quality impact:
Simple helper functions keep calculations readable.

Rollback or migration:
Revert local JSX/helper changes.

ADR required: No
