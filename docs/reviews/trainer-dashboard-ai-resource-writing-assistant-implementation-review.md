# Trainer Dashboard AI Resource Writing Assistant Implementation Review

Status: Draft
Task ID: trainer-dashboard-ai-resource-writing-assistant
Last updated: 2026-07-25
Delivery mode: Auto requested; repository approval gates still required

## Mode and Gate Results

- Gates waited on: RSD approval, technical decision package approval, full task plan approval.
- Gates skipped: none.
- Waivers: auto-mode gate skipping waived because repository `AGENTS.md` requires approval gates.
- User approvals: RSD, technical decisions/ADRs, and task plan approved in chat.

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-dashboard-ai-resource-writing-assistant-rsd.md`
  Used for: requirement traceability.
  Evidence: AI draft assistance must cover classroom name/description and resource title/markdown content while preserving manual fallback.
  Confidence: High

- Source: `docs/decisions/trainer-dashboard-ai-resource-writing-assistant-technical-decisions.md`
  Used for: implementation review scope.
  Evidence: approved choices include npm `@huggingface/transformers`, a focused AI helper/component, markdown source storage, and raw-HTML-disabled resource rendering.
  Confidence: High

- Source: `docs/adr/0001-browser-side-gemma-webgpu-writing-assistant.md`
  Used for: AI architecture review.
  Evidence: browser-only Gemma WebGPU helper, no server AI secret, draft-only behavior.
  Confidence: High

- Source: `docs/adr/0002-markdown-source-classroom-resources.md`
  Used for: resource schema review.
  Evidence: nullable `content`, nullable `url`, title plus URL-or-content validation.
  Confidence: High

- Source: `docs/knowledge-base/project-index.md`
  Used for: entry-point review.
  Evidence: trainer/classroom client and server entry points match changed files.
  Confidence: High

- Source: `docs/knowledge-base/decisions.md`
  Used for: durable decision compliance.
  Evidence: implementation follows the browser-side Gemma and markdown resource storage decisions.
  Confidence: High

- Source: `docs/knowledge-base/patterns.md`
  Used for: code-shape review.
  Evidence: WebGPU/model lifecycle is hidden behind a focused helper/component boundary.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: security/rendering review.
  Evidence: classroom resource markdown must render with raw HTML disabled.
  Confidence: High

## Changed Files

- `client/package.json`, `client/package-lock.json`: added `@huggingface/transformers`.
- `client/src/lib/trainer-writing-ai.js`: added lazy browser-side Gemma WebGPU draft helper.
- `client/src/components/trainer/TrainerWritingAssistant.jsx`: added reusable trainer draft UI.
- `client/src/app/trainer/dashboard/TrainerDashboardClient.js`: added classroom name/description AI draft control.
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`: added resource markdown content state, resource AI draft control, optional URL submission, and markdown rendering.
- `client/src/components/Editor.js`, `client/src/components/EditorWrapper.js`, `client/src/components/MarkdownEditor.js`: added compact editor sizing props while preserving existing defaults.
- `client/src/components/MarkdownRenderer.js`: added opt-in raw HTML disabling and width control for resource rendering.
- `server/src/controllers/classroomController.ts`: added resource content validation, insert, and notification fallback link.
- `server/src/utils/dbInit.ts`: added `classroom_resources.content` and relaxed `url` not-null in create/init path.
- Planning artifacts under `docs/rsd/`, `docs/decisions/`, `docs/adr/`, `docs/tasks/`, and this review.
- Knowledge base files updated with requirement, decision, task-shape, and quality facts.

## Requirement Traceability

- Acceptance criterion: trainer/admin can generate draft classroom name and description.
  Evidence: `TrainerDashboardClient.js` renders `TrainerWritingAssistant` with `kind="classroom"` and applies `name`/`description` drafts to editable state.

- Acceptance criterion: generated classroom text can be edited and never auto-submits.
  Evidence: assistant button is `type="button"` and only calls `setNewClassName`/`setNewClassDesc`; existing submit handler remains on the form.

- Acceptance criterion: trainer/admin can generate resource title and markdown body.
  Evidence: `ClassroomLiveClient.js` renders `TrainerWritingAssistant` with `kind="resource"` and applies `title`/`content` drafts to editable resource state.

- Acceptance criterion: resource markdown body uses proper markdown editor.
  Evidence: resource dialog uses existing `EditorWrapper`/Gravity UI markdown editor with compact sizing props.

- Acceptance criterion: saved markdown persists through classroom API and reloads.
  Evidence: server adds/inserts `classroom_resources.content`; existing classroom detail query selects `*` resources.

- Acceptance criterion: resource markdown renders with existing conventions.
  Evidence: resource cards use `MarkdownRender` with GFM/math rendering and resource-specific width.

- Acceptance criterion: existing URL-only resources continue to render and link.
  Evidence: URL remains supported and resource cards render URL links when `res.url` exists, with fallback URL text if no content exists.

- Acceptance criterion: title plus URL or markdown content validation.
  Evidence: client checks `title && (url || content)` before submit; server returns `400` unless normalized title and URL-or-content exist.

- Acceptance criterion: browser-side Gemma/WebGPU and no server AI secret.
  Evidence: helper lazy-imports `@huggingface/transformers` in client code and uses `navigator.gpu`, `device: "webgpu"`, and `onnx-community/gemma-3-270m-it-ONNX`.

- Acceptance criterion: AI failure does not block manual creation.
  Evidence: assistant errors render locally and do not disable manual fields or submit paths.

- Acceptance criterion: trainer/admin authorization remains.
  Evidence: `addResource` still calls `canManageClassroom`; trainer dashboard page guard unchanged.

## Reviewer Findings

- Severity: None
  Location: scoped changed files
  Finding: No blocking correctness or maintainability issue found in the implemented scope.
  Fix: None.

## Code Quality Review

- Complexity: Added one focused AI helper and one reusable UI component; avoided a site-wide copilot.
- Module/interface depth: Helper hides model loading, WebGPU support, prompt templates, generation parsing, and fallback parsing behind one generation function.
- Information hiding: Resource schema details remain in classroom controller/init code; page components only send resource fields.
- Duplication: Classroom and resource dialogs reuse `TrainerWritingAssistant` instead of duplicating AI loading/status UI.
- Code smells: No large cross-cutting refactor. `ClassroomLiveClient.js` remains large, but resource logic stayed localized; future broader classroom work should consider extraction.
- Pattern/abstraction fit: Compact editor props extend existing editor stack instead of adding a second markdown editor.
- Naming and comments: Domain names are clear; no decorative comments added.
- Refactoring safety: Existing editor defaults preserved for current callers.
- Waivers: None.

## Auditor Findings

The implementation follows the approved RSD, technical decisions, ADRs, and task plan. No unapproved public route or authorization changes were added. The planned untracked `server/NUL` file remains untouched and outside scope.

## Documentation Learning Audit

- Docs read: `AGENTS.md`, RSD, technical decisions, ADRs, task plan, knowledge-base files, changed source files, requested GitHub repo, official Transformers.js docs, WebGPU guide, and Gemma ONNX model page.
- Docs that changed implementation: official Transformers.js docs justified npm `@huggingface/transformers`; resource markdown security rule caused raw HTML to be disabled for resources.
- Stale or missing docs: no migration runner docs found beyond `dbInit.ts`; existing server `tsconfig.json` blocks `tsc --noEmit` with removed `moduleResolution=node10`.
- Knowledge-base entries fed into implementation: trainer/classroom entry points, browser AI helper boundary, markdown resource storage decision, resource raw HTML security rule.
- New durable lessons: browser support checks in client components should avoid render-time server/client mismatches; resource markdown should remain raw-HTML-disabled by default.
- Knowledge-base updates completed: project index, patterns, quality rules, and mistake/near-miss note.

## Security Review

- Auth and authorization: existing trainer/admin page guard and `canManageClassroom` resource authorization preserved.
- Data exposure: no prompts are sent to app server or cloud AI route for this feature. Browser may fetch model assets from Hugging Face.
- Input validation and injection: server trims title/URL/content and rejects empty title or empty URL/content pair. Resource markdown renders with raw HTML disabled.
- Secrets: no new secret or API key added.
- Logging: no prompt/content logging added.
- Dependencies: new `@huggingface/transformers` dependency added. `npm install` reported existing audit vulnerabilities and allow-scripts warnings including ONNX-related packages; no broad dependency remediation was attempted in this scoped task.
- Unsafe defaults: AI is optional and unavailable WebGPU state does not block manual authoring.

## Verification

- `npm install @huggingface/transformers@4.2.0` in `client/`: Passed. Reported 52 audit vulnerabilities and allow-scripts warnings; no audit fix run.
- Targeted lint: `npx eslint src/lib/trainer-writing-ai.js src/components/trainer/TrainerWritingAssistant.jsx src/components/Editor.js src/components/EditorWrapper.js src/components/MarkdownEditor.js src/components/MarkdownRenderer.js src/app/trainer/dashboard/TrainerDashboardClient.js 'src/app/classroom/live/[id]/ClassroomLiveClient.js'`: Passed with one existing `react-hooks/exhaustive-deps` warning in `ClassroomLiveClient.js`.
- Full client lint: `npm run lint`: Failed on pre-existing `react/no-unescaped-entities` errors in `client/src/app/admin/contests/combined/aliases/AliasesManagerClient.tsx`; also reported existing warnings.
- Client build: `npm run build`: Passed.
- Server type check: `bunx tsc --noEmit`: Blocked by existing `tsconfig.json` error `Option 'moduleResolution=node10' has been removed`.
- Server bundle check: `bun build src/index.ts --outdir .dist/check --target=bun`: Passed. Generated `.dist/check/index.js` was removed after verification.
- `git diff --check`: Passed with line-ending warnings only.

## Final Git Integration

- Base ref: current working branch.
- Merged branches/worktrees: none.
- Conflicts: none.
- Final integration ref: current working tree.
- Post-merge verification: not applicable because no task branch/worktree merge occurred.
- Worktrees removed: none.

## Residual Risk

- AI generation was build/lint verified but not exercised in a real WebGPU browser session.
- First AI use downloads model assets and may be slow or fail on unsupported browsers.
- Existing full lint failure outside task scope remains.
- Existing server `tsconfig.json` prevents `tsc --noEmit`.

## User Approval or Mode Waiver

Approval required before final gate completion.
