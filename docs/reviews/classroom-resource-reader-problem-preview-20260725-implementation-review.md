# Classroom Resource Reader and Problem Preview Implementation Review

Status: Approved by auto-mode execution
Task ID: classroom-resource-reader-problem-preview-20260725
Last updated: 2026-07-25
Delivery mode: Auto

## Mode and Gate Results

- Gates waited on: none after the user switched to auto mode.
- Gates skipped: RSD, technical decisions, task plan, implementation review wait gates.
- Waivers: latest user instruction explicitly requested auto mode and best-judgment execution.
- User approvals: auto-mode approval in chat.

## Documentation and Knowledge Used

- Source: `docs/rsd/classroom-resource-reader-problem-preview-20260725-rsd.md`
  Used for: requirement traceability.
  Evidence: no AI, resource reader pages, scalable lists, dropdown cleanup, and problem preview were required.
  Confidence: High

- Source: `docs/decisions/classroom-resource-reader-problem-preview-20260725-technical-decisions.md`
  Used for: architecture review.
  Evidence: approved choices were removal of trainer AI, resource detail endpoint, client-side list batching, and explicit problem preview.
  Confidence: High

- Source: `docs/adr/0002-markdown-source-classroom-resources.md`
  Used for: resource rendering/storage review.
  Evidence: resources store markdown source and render with raw HTML disabled.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: security and verification.
  Evidence: resource detail endpoints require access checks, and classroom markdown remains raw-HTML-disabled.
  Confidence: High

## Changed Files

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`: removed resource AI UI, added resource studio, reader links, section dropdown, scroll/incremental lists, problem preview card, and richer student challenge cards.
- `client/src/app/classroom/live/[id]/resources/[resourceId]/page.js`: added dedicated resource reader page.
- `client/src/app/trainer/dashboard/TrainerDashboardClient.js`: removed classroom AI draft assistant.
- `server/src/controllers/classroomController.ts`: added classroom access helper, resource detail endpoint, problem preview endpoint, class-scope validation for resources, and reader-page notification link.
- `server/src/routes/classroomRoute.ts`: registered resource detail and problem preview routes.
- `docs/rsd/`, `docs/decisions/`, `docs/tasks/`, `docs/reviews/`, `docs/knowledge-base/`, `docs/adr/0001...`: added/updated planning, supersession, and learning artifacts.

## Requirement Traceability

- Acceptance criterion: no trainer AI in classroom/resource authoring.
  Evidence: targeted search found no `TrainerWritingAssistant`, `trainer-writing-ai`, or `@huggingface` references in changed runtime client files or `client/package.json`.

- Acceptance criterion: immersive add-resource flow.
  Evidence: resource dialog is now a two-column resource studio with scope dropdown, editor, source URL, preview, and "Share and create reader page" action.

- Acceptance criterion: resources open as student-readable pages.
  Evidence: new route `/classroom/live/[id]/resources/[resourceId]` renders resource title, metadata, optional source link, and safe markdown.

- Acceptance criterion: future-proof lists.
  Evidence: resources, live problems, history, schedules, students, and teams use bounded scroll areas and/or incremental "show more" controls.

- Acceptance criterion: dropdown cleanup.
  Evidence: page has a section-jump dropdown; resource cards use a secondary action dropdown for read/source actions.

- Acceptance criterion: problem preview before assign.
  Evidence: `POST /classroom/problem-preview` validates trainer access and returns scraped metadata shown in the assign form preview card.

- Acceptance criterion: student excitement/problem cards.
  Evidence: student challenge cards now show platform, title, details, difficulty, timer, tags, status, primary start CTA, and hints/notes action.

## Reviewer Findings

- Severity: P1
  Location: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Finding: Initial list/table sizing let class-history detail overflow under the sticky chat sidebar on wide screens.
  Fix: Changed the main grid to `minmax(0,1fr)_360px`, added `min-w-0`/overflow containment, and reduced past table minimum width.

- Severity: P1
  Location: `server/src/controllers/classroomController.ts`
  Finding: Codeforces title cleanup stripped the leading `C` from the fallback `Codeforces Problem`, and HTML scraping did not reliably fetch problemset titles.
  Fix: Replaced the broad regex with targeted contest-prefix cleanup and added Codeforces API lookup for contest/index URLs.

## Code Quality Review

- Complexity: Added focused endpoints and local UI helpers; no global pagination or new design-system abstraction.
- Module/interface depth: server owns access checks and scraping; client owns preview display and list batching.
- Information hiding: problem scraper remains server-side; resource reader fetches a single authorized resource.
- Duplication: `ResourceCard` centralizes classroom/live/history resource card behavior.
- Code smells: `ClassroomLiveClient.js` remains large from prior scope; new helpers reduce added JSX repetition but future extraction may help.
- Pattern/abstraction fit: client-side batching matches current all-in-one classroom payload; server pagination deferred.
- Refactoring safety: no broad route/auth rewrite.
- Waivers: none.

## HCI Review

- Discoverability: resource studio and preview button make next actions visible.
- Signifiers: reader-page badges, section dropdown, resource/read CTAs, and problem preview card communicate state.
- Feedback: preview loading/error states stay beside the assign form.
- Mapping: resource scope dropdown maps saved resource to live class or classroom library.
- Conceptual model: dashboard is for scanning/actions; reader page is for study.
- Constraints: resource submit still requires title plus URL/content; problem preview requires class/platform/link.
- Error prevention and recovery: preview failure does not destroy input; resource detail returns clear unavailable page.
- Accessibility: controls use buttons/links, labels, and keyboard-friendly Radix primitives.
- Mode/state clarity: chat/read-only and live/completed class scopes remain visible.
- Waivers: none.

## Auditor Findings

Implementation follows the auto-approved RSD, decisions, and task plan. Existing dirty workspace changes from prior classroom/trainer tasks were preserved.

## Documentation Learning Audit

- Docs read: `AGENTS.md`, RSD/decision/task artifacts, ADR-0001/0002, knowledge-base files, classroom client/server source, HCI and code-quality references.
- Docs that changed implementation: ADR-0002 kept markdown storage/rendering safe; knowledge-base resource detail rule required server access validation.
- Stale or missing docs: ADR-0001 and prior KB entries were stale after the user removed AI; they were marked superseded for this scope.
- Knowledge-base entries fed into implementation agents: none delegated.
- New durable lessons: classroom dashboards should summarize resources while reader pages carry full markdown; problem assignment benefits from explicit preview.
- Knowledge-base updates required: completed in project index, decisions, patterns, HCI rules, quality rules, doc usage, and mistakes.

## Security Review

- Auth and authorization: resource detail verifies classroom access; problem preview verifies trainer/class access; resource creation validates optional `classId` belongs to classroom.
- Data exposure: resource detail returns one resource from the requested classroom only.
- Input validation and injection: markdown rendering uses `allowRawHtml={false}` on reader and preview paths; resource title/url/content validation remains server-side.
- Secrets: no new secrets; AI dependency/helper removed.
- Logging: no prompt/resource/problem content logging added.
- Dependencies: `@huggingface/transformers` removed from current package state; no new dependency added.
- Unsafe defaults: preview is explicit, not keystroke scraping.

## Verification

- `npx eslint src/app/classroom/live/[id]/ClassroomLiveClient.js src/app/classroom/live/[id]/resources/[resourceId]/page.js src/app/trainer/dashboard/TrainerDashboardClient.js`: Passed with existing `react-hooks/exhaustive-deps` warning in `ClassroomLiveClient.js`.
- `bun build src/index.ts --outdir .dist/check --target=bun` in `server/`: Passed; generated bundle file removed after check.
- `npm run build` in `client/`: Passed; output includes `/classroom/live/[id]/resources/[resourceId]`.
- Follow-up bug fix verification: `npx eslint src/app/classroom/live/[id]/ClassroomLiveClient.js` passed with the known existing hook warning; `bun build src/index.ts --outdir .dist/check --target=bun` passed; Codeforces API sanity check for `2247/F` returned `Paths on a Grid`; `npm run build` passed again.
- `npm run lint` in `client/`: Failed on existing unrelated `react/no-unescaped-entities` errors in `src/app/admin/contests/combined/aliases/AliasesManagerClient.tsx`; changed files had no lint errors.
- `git diff --check`: Passed with line-ending warnings only.

## Final Git Integration

- Base ref: current working branch.
- Merged branches/worktrees: none.
- Conflicts: none.
- Final integration ref: current working tree.
- Post-merge verification: not applicable; no branch/worktree merge.
- Worktrees removed: none.

## Residual Risk

- Server pagination/virtualization remains future work if classrooms grow far beyond current payload expectations.
- Problem metadata scraping depends on external OJ HTML and can degrade; fallback metadata keeps assignment usable.
- `ClassroomLiveClient.js` is large and should be extracted if another classroom UI task adds major behavior.

## User Approval or Mode Waiver

Approved by: User auto-mode instruction
Date: 2026-07-25
Notes: "do what is the best, and move to auto mode"
