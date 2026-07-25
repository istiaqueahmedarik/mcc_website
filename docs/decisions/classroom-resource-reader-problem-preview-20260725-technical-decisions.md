# Classroom Resource Reader and Problem Preview Technical Decisions

Status: Approved for auto execution
Task ID: classroom-resource-reader-problem-preview-20260725
Last updated: 2026-07-25
Delivery mode: Auto

## Documentation and Knowledge Used

- Source: `docs/rsd/classroom-resource-reader-problem-preview-20260725-rsd.md`
  Used for: requirements and acceptance criteria.
  Evidence: remove AI, add resource reader page, make lists scalable, add problem preview.
  Confidence: High

- Source: `docs/adr/0002-markdown-source-classroom-resources.md`
  Used for: resource persistence decision.
  Evidence: resources already support `content` and optional `url`.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: security/rendering constraints.
  Evidence: classroom markdown resources should render with raw HTML disabled.
  Confidence: High

- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: UI integration.
  Evidence: single client component owns resource dialog/list and problem assignment/student cards.
  Confidence: High

- Source: `server/src/controllers/classroomController.ts`
  Used for: API implementation.
  Evidence: existing `fetchProblemMetadata` can serve preview; resource rows already come from classroom APIs.
  Confidence: High

## Context

The previous resource-writing task added browser-side AI writing and markdown resources. The user now prefers no AI and wants a more immersive resource/learning experience plus richer problem previews. Existing code already has markdown storage and server-side problem metadata scraping, so the safest path is to remove AI and deepen the resource/problem surfaces.

## Decisions

### TD-001: Remove Trainer Writing AI From Classroom Authoring

Decision: Delete the trainer writing assistant UI/helper and remove `@huggingface/transformers` from `client/package.json` and `package-lock.json`.

Options considered:

- Option A: Hide AI controls but keep dependency/helper.
- Option B: Fully remove the classroom/trainer writing AI feature.

Rationale:

The user explicitly said the AI feature is not needed. Full removal avoids dead dependency weight, unsupported-browser complexity, and stale UI.

Tradeoffs:

Prior ADR-0001 becomes superseded for this scope. Manual authoring remains.

Security and privacy impact:

Removes model asset fetching and prompt-processing concerns from this workflow.

Testing impact:

Build/lint must catch stale imports.

HCI impact:

Fewer disabled/error/unsupported states; resource authoring focuses on content and preview.

Code-quality impact:

Deletes unused abstraction and dependency.

Rollback or migration:

Re-add dependency/helper only under a future approved AI RSD.

ADR required: No

### TD-002: Add Server-Authorized Resource Reader Route

Decision: Add a dedicated Next.js route under `/classroom/live/[classroomId]/resources/[resourceId]` backed by a Hono resource-detail endpoint that verifies classroom access.

Options considered:

- Option A: Keep resources expanded inline only.
- Option B: Use URL query state on live page.
- Option C: Add a dedicated reader route.

Rationale:

A route gives students a focused reading page, supports links from notifications/cards, and keeps the dashboard from becoming a document viewer.

Tradeoffs:

Adds one server endpoint and one route. No schema change.

Security and privacy impact:

Resource detail endpoint must verify current user is classroom creator/admin/trainer or enrolled student before returning content.

Testing impact:

Review authorization query and route fetch behavior.

HCI impact:

Dedicated page reduces reading clutter and gives a better mental model: dashboard for activity, reader for study material.

Code-quality impact:

Resource detail access stays server-side; reader component is presentational.

Rollback or migration:

Remove links/route/endpoint; existing resource cards still render inline excerpts.

ADR required: No

### TD-003: Make List Scalability Client-Side First

Decision: Add bounded scroll areas and incremental display counts in classroom live lists before introducing API pagination.

Options considered:

- Option A: Full server pagination across classroom details, resources, problems, students, teams, history.
- Option B: Client-side bounded list rendering and "show more" controls.

Rationale:

The current classroom details API returns a dashboard payload. Full pagination would change several data contracts. Client-side batching addresses immediate UX future-proofing with less risk.

Tradeoffs:

Very large classrooms may still need server pagination later.

Security and privacy impact:

No new data exposure; existing payload scope unchanged.

Testing impact:

Check list counts, empty states, and "show more" behavior.

HCI impact:

Scrolling lists protect page scanability and keep controls near context.

Code-quality impact:

Use small local helpers/constants. Avoid global virtualization abstraction until multiple pages need it.

Rollback or migration:

Remove slice/count logic and scroll wrappers.

ADR required: No

### TD-004: Expose Problem Metadata Preview Before Assignment

Decision: Add a `POST /classroom/problem-preview` endpoint that reuses `fetchProblemMetadata` after validating trainer access to the class, and display preview in the assign form.

Options considered:

- Option A: Only fetch metadata during assignment.
- Option B: Fetch on every URL keystroke.
- Option C: Explicit preview action.

Rationale:

Explicit preview gives trainer control, avoids noisy scraping, and surfaces errors before assignment.

Tradeoffs:

Assignment still fetches metadata server-side for source of truth. Preview is advisory.

Security and privacy impact:

Endpoint validates trainer access to the class before scraping. No secrets or user data logged.

Testing impact:

Check preview success, fallback, loading, error, and assign reset behavior.

HCI impact:

Preview closes evaluation gulf: trainer sees what students will receive before assigning.

Code-quality impact:

Reuses existing metadata function; no duplicate scraper in client.

Rollback or migration:

Remove preview UI/endpoint; assignment remains unchanged.

ADR required: No
