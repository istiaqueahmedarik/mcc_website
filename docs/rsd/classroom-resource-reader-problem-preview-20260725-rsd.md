# Classroom Resource Reader and Problem Preview RSD

Status: Complete
Task ID: classroom-resource-reader-problem-preview-20260725
Owner: Codex
Last updated: 2026-07-25
Delivery mode: Auto

## Mode and Gate Policy

The user changed delivery mode to `auto` and asked Codex to choose the best implementation. This run creates the RSD, technical decisions, task plan, implementation review, and knowledge-base updates without waiting at each gate. The prior repository gate policy is recorded as overridden for this task by the latest user instruction.

## Grill Mode Summary

Task restatement:
Improve classroom resource and problem-assignment UX: remove the previously added AI writing feature, make adding resources immersive, make saved resources open as dedicated readable pages for students, future-proof list-heavy areas with scrolling/incremental display, add dropdown/cleaner secondary controls, and add fetched problem metadata previews/cards when assigning problems.

Answers received:
- "Do what is the best" for open UX choices.
- Move to auto mode.

Assumptions:
- Remove AI from trainer classroom/resource authoring, including `TrainerWritingAssistant`, its helper, and the `@huggingface/transformers` dependency.
- Keep markdown resources because the user still wants students to read resources, and ADR-0002 already established markdown source storage.
- Dedicated resource route should live under the classroom live route: `/classroom/live/[classroomId]/resources/[resourceId]`.
- Scalable lists can start with client-side scroll windows and incremental "show more" controls; server pagination is not required unless data volume later proves it.
- Problem preview should be explicit through a review/preview action before assign, so the trainer controls network fetch timing.

Important unresolved questions:
- None blocking under auto mode. API pagination and deep filtering remain future follow-up candidates if classroom data grows beyond client-side handling.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: workflow and entry point constraints.
  Evidence: classroom UI lives under `client/src/app/classroom/`, API under `server/src/routes/classroomRoute.ts` and `server/src/controllers/classroomController.ts`.
  Confidence: High

- Source: `docs/knowledge-base/project-index.md`
  Used for: affected classroom/trainer surfaces.
  Evidence: `/classroom/live/[id]` owns live classroom, resources, problems, chat, and history.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: markdown safety and scoped verification.
  Evidence: classroom resource markdown should render with raw HTML disabled; narrow checks are acceptable when full lint has unrelated failures.
  Confidence: High

- Source: `docs/adr/0002-markdown-source-classroom-resources.md`
  Used for: resource data model.
  Evidence: resources store nullable markdown `content` and nullable `url`.
  Confidence: High

- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: UI scope.
  Evidence: file owns resource dialog/list, problem assign form, student problem cards, class history, and chat.
  Confidence: High

- Source: `server/src/controllers/classroomController.ts`
  Used for: API scope.
  Evidence: `fetchProblemMetadata`, `assignProblem`, `addResource`, and `getClassResources` already exist.
  Confidence: High

## Goal

Make classroom resources feel like readable learning material and problem assignment feel trustworthy and motivating, while reducing UI clutter and removing AI writing from this workflow.

## Non-Goals

- Do not add a new AI system, model, or API dependency.
- Do not replace markdown resource storage.
- Do not create a full content-management system, comments, ratings, or resource editing workflow.
- Do not introduce database pagination in this task unless required by verification.
- Do not broadly refactor classroom authorization beyond the new resource reader/preview endpoints.

## Users and Use Cases

- Trainers add a resource with title, optional link, markdown content, scope, and preview before sharing.
- Students open a resource as a dedicated page and read it without being trapped in a dense dashboard card.
- Trainers preview fetched problem metadata before assigning a problem.
- Students see richer challenge cards with title, platform, difficulty/details, timer, tags, and clear actions.
- Trainers and students can use long classroom/resource/problem/history lists without the page becoming unwieldy.

## User-Visible Behavior

- AI writing controls disappear from classroom creation and resource creation.
- Resource share dialog becomes a resource studio with scope dropdown, markdown editor, live preview, and clear submit state.
- Resource cards link to a dedicated reader page; URL resources also keep external link affordances.
- Resource and problem/history lists are scrollable and render initial batches with "show more" controls.
- Problem assign form includes a preview/review button that fetches title/difficulty/details and displays a polished card.
- Assigning after preview still uses existing assign flow; failed preview does not block assignment if the trainer chooses to continue.

## Acceptance Criteria

- [ ] No `TrainerWritingAssistant` appears in trainer dashboard or classroom resource authoring.
- [ ] `@huggingface/transformers` is removed from client dependencies and lockfile.
- [ ] Trainer can add a resource through an immersive dialog with title, optional URL, markdown content, scope, and preview.
- [ ] Saved resource cards open a dedicated reader page under `/classroom/live/[classroomId]/resources/[resourceId]`.
- [ ] Students and trainers can read markdown resources on the reader page with raw HTML disabled.
- [ ] Long classroom resource, problem, history, student, or team lists are constrained with scroll windows and/or incremental display.
- [ ] Secondary actions are moved into dropdowns where they reduce clutter without hiding the primary path.
- [ ] Trainer can preview problem metadata from platform/link before assigning.
- [ ] Student assigned problem cards show richer metadata and clear motivation/signifiers.
- [ ] Existing URL-only and markdown-only resources remain supported.
- [ ] Authorization prevents reading a resource outside an accessible classroom.
- [ ] Focused verification is run and recorded.

## Constraints

- Keep route paths and existing classroom live behavior stable except for adding resource reader route and preview endpoint.
- Preserve existing classroom resource schema from ADR-0002.
- Avoid broad server pagination or schema changes.
- Keep markdown resource rendering raw-HTML-disabled.
- Do not remove unrelated AI routes elsewhere in the app unless they are part of this trainer writing feature.

## Dependencies

- Existing markdown editor/renderer components.
- Existing classroom resource table with `content` and nullable `url`.
- Existing server-side problem metadata scraper.
- Existing shadcn/Radix dropdown, select, scroll-area, and button components.

## Risks and Open Questions

- Risk: problem metadata scraping can fail or be slow. Mitigation: explicit preview button, loading/error state, and fallback metadata.
- Risk: client-side list batching does not solve extreme data volumes. Mitigation: design accepts future server pagination without changing visible concepts.
- Risk: new reader route could expose resource data if authorization is weak. Mitigation: add server-side classroom access check for resource detail.
- Risk: removing AI may leave stale docs. Mitigation: mark ADR-0001 superseded for this scope and update knowledge base.

## Test Expectations

- Targeted ESLint on changed client files.
- Client build when feasible because route shape changes.
- Server bundle/type-adjacent check where feasible.
- Manual code review for resource detail authorization and raw-HTML-disabled markdown rendering.
- `git diff --check`.

## HCI Expectations

Resource authoring must show a clear conceptual model: write material, preview it, choose where it belongs, share it. Resource reading must feel like a page, not a cramped card. Problem preview must reduce uncertainty before assigning. Lists must not overwhelm scan paths; primary actions stay visible, secondary actions go into dropdowns. Loading, errors, empty states, and disabled states must be close to the affected control.

## Code Quality Expectations

Keep changes local to classroom resource/problem UI and classroom controller/routes. Reuse existing markdown, dropdown, select, and scroll components. Add small local helper components only where they reduce repeated JSX. Avoid broad classroom state-management refactors. Keep preview endpoint validation close to existing problem assignment logic.

## Definition of Done

- [x] Mandatory Grill Mode completed through auto assumptions.
- [x] RSD gate satisfied by auto-mode waiver.
- [x] Technical decision gate satisfied by auto-mode waiver.
- [x] Full task plan gate satisfied by auto-mode waiver.
- [x] Implementation passes verification.
- [x] Implementation review completed.
- [x] Knowledge base and mistake note updated.
