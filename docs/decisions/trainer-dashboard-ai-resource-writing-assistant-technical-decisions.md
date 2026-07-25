# Trainer Dashboard AI Resource Writing Assistant Technical Decisions

Status: Approved
Task ID: trainer-dashboard-ai-resource-writing-assistant
Last updated: 2026-07-25
Delivery mode: Auto requested; repository approval gates still required

## Mode and Gate Results

Gates waited on:
- Primary RSD approval: received from user in chat.
- Technical decision package approval: received from user in chat.

Gates skipped:
- None. Repository `AGENTS.md` requires approval gates even though the user requested auto mode.

Waivers:
- Auto-mode gate skipping waived in favor of repository gate policy.

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-dashboard-ai-resource-writing-assistant-rsd.md`
  Used for: requirements and acceptance criteria.
  Evidence: AI draft assistance must cover trainer classroom names/descriptions and resource titles/markdown content, with manual fallback.
  Confidence: High

- Source: `AGENTS.md`
  Used for: gate policy and write-scope discipline.
  Evidence: repository requires approval after technical decisions and any ADRs.
  Confidence: High

- Source: `docs/knowledge-base/project-index.md`
  Used for: existing trainer/classroom capability boundaries.
  Evidence: trainer and classroom entry points live in `client/src/app/trainer/`, `client/src/app/classroom/`, and classroom server routes/controllers.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: verification expectations.
  Evidence: narrow UI changes may record unrelated full-lint blockers and use targeted lint for changed files.
  Confidence: High

- Source: `client/package.json`
  Used for: dependency and editor choices.
  Evidence: project already includes Gravity UI markdown editor, Plate markdown packages, `react-markdown`, `remark-gfm`, and `rehype-raw`, but not `@huggingface/transformers`.
  Confidence: High

- Source: `npm view @huggingface/transformers version`
  Used for: dependency version check.
  Evidence: latest npm version returned `4.2.0` on 2026-07-25.
  Confidence: Medium

- Source: `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
  Used for: classroom-create integration point.
  Evidence: create-classroom dialog owns `newClassName`, `newClassDesc`, and posts `name` and `description`.
  Confidence: High

- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: resource UI integration point.
  Evidence: resource dialog currently submits `resourceTitle`, `resourceUrl`, and renders each resource as an external link.
  Confidence: High

- Source: `server/src/controllers/classroomController.ts`
  Used for: API and authorization behavior.
  Evidence: `addResource` currently requires `title` and `url`, uses `canManageClassroom`, inserts into `classroom_resources`, and notifies students.
  Confidence: High

- Source: `server/src/utils/dbInit.ts`
  Used for: schema update pattern.
  Evidence: `classroom_resources` currently has non-null `url` and no markdown content field.
  Confidence: High

- Source: `client/src/components/EditorWrapper.js`, `client/src/components/Editor.js`, `client/src/components/MarkdownRenderer.js`
  Used for: markdown authoring/rendering decisions.
  Evidence: existing editor is Gravity UI based; existing renderer supports GFM/math/raw HTML.
  Confidence: High

- Source: `https://github.com/rhulha/Gemma3-270m-WebGPU`
  Used for: requested AI reference.
  Evidence: repo demonstrates browser-only Gemma 270M chat with Hugging Face Transformers, WebGPU, ONNX, and no backend.
  Confidence: Medium

- Source: `https://raw.githubusercontent.com/rhulha/Gemma3-270m-WebGPU/main/js/gemma-chat.js`
  Used for: requested model and pipeline details.
  Evidence: sample uses `@huggingface/transformers`, text-generation, `onnx-community/gemma-3-270m-it-ONNX`, `dtype: "fp32"`, and `device: "webgpu"`.
  Confidence: Medium

- Source: `https://huggingface.co/docs/transformers.js/index`
  Used for: official Transformers.js capability check.
  Evidence: official docs state Transformers.js runs in the browser without a server, uses ONNX Runtime, supports pipeline API, and enables WebGPU with `device: "webgpu"`.
  Confidence: High

- Source: `https://huggingface.co/docs/transformers.js/en/guides/webgpu`
  Used for: WebGPU support and fallback risk.
  Evidence: official guide notes WebGPU is browser GPU compute and not available for all users/browsers.
  Confidence: High

- Source: `https://huggingface.co/onnx-community/gemma-3-270m-it-ONNX`
  Used for: model compatibility.
  Evidence: model page is tagged for Text Generation, Transformers.js, and ONNX and shows `pipeline("text-generation", "onnx-community/gemma-3-270m-it-ONNX")`.
  Confidence: High

## Requirement Review and Auditor Pass

- Clarity: The approved RSD defines affected users, fields, resource markdown behavior, AI fallback behavior, and non-goals.
- Testability: Acceptance criteria are observable through trainer dashboard form behavior, resource save/reload behavior, markdown rendering, and AI unsupported state.
- Hidden dependency found: `@huggingface/transformers` is not installed and must be added intentionally.
- Hidden dependency found: existing `classroom_resources.url` is non-null, so markdown-only resources require a safe schema update.
- Hidden security issue found: existing `MarkdownRenderer` enables raw HTML. Resource rendering should disable raw HTML unless explicitly needed.
- Satisfiability: Requirements are satisfiable with scoped client/server changes and no production external-system change.

## Decisions

### TD-001: Use Browser-Side Transformers.js, Not CDN or Server AI

Decision:
Add `@huggingface/transformers` as an npm client dependency and create a lazy-loaded, browser-only writing assistant module using `pipeline("text-generation", "onnx-community/gemma-3-270m-it-ONNX", { device: "webgpu", dtype: "fp32" })`.

Options considered:

- Option A: Copy the requested repo's CDN import pattern directly.
- Option B: Add `@huggingface/transformers` through npm and lazy-load it in a client-only helper.
- Option C: Use existing server-side `/api/ai/*` routes with Gemini through `@ai-sdk/google`.

Rationale:

Option B best fits the Next.js app. It keeps dependency versions visible in `package.json` and lockfiles, avoids runtime CDN imports, uses the exact requested model family and WebGPU approach, and keeps prompts local in the browser after model load. Option C conflicts with the RSD because it introduces server-side/cloud AI behavior and secret management. Option A is useful as a reference but weaker for supply-chain review and version control.

Tradeoffs:

The first AI use downloads/caches model assets and may take time. The helper must expose loading/progress/error states and be invoked only when a trainer asks for AI assistance.

Security and privacy impact:

Trainer text is processed locally by the browser-side model. The browser may fetch model assets from Hugging Face unless model assets are later self-hosted. No prompt text should be sent to the app server or an AI provider for this feature.

Testing impact:

Test manual fallback without WebGPU, UI disabled/loading states, and one successful generation path where browser/device support is available. Static checks must ensure the module is only imported client-side/lazily.

Code-quality impact:

The model lifecycle, prompt templates, and browser capability checks are volatile details. Hide them in a small client helper so page components only ask for a draft.

Rollback or migration:

Remove the helper, package dependency, and AI UI controls. Manual classroom/resource authoring remains intact.

ADR required: Yes, `docs/adr/0001-browser-side-gemma-webgpu-writing-assistant.md`

### TD-002: Add a Small Reusable Trainer Writing Assistant UI

Decision:
Create one small client component for trainer writing assistance and use it in the classroom-create dialog and resource dialog. The component receives current field values/context and returns generated field updates through callbacks.

Options considered:

- Option A: Duplicate AI controls in each dialog.
- Option B: Create one focused trainer writing assistant component.
- Option C: Build a site-wide AI copilot framework.

Rationale:

Two dialogs need the same AI status, prompt, and apply-draft behavior. A focused component removes duplicate model-loading/UI state without inventing a global copilot system.

Tradeoffs:

The component must stay narrow: trainer classroom/resource writing only. Future fields can reuse it only when the same field-draft shape fits.

Security and privacy impact:

The component must never auto-save generated text. It applies drafts only to local form state for trainer review.

Testing impact:

Verify generated drafts populate fields but do not submit forms. Verify disabled/error states leave manual editing usable.

Code-quality impact:

This is a justified abstraction because it hides real WebGPU/model volatility and is reused in two places. Keep its public props small and domain-named.

Rollback or migration:

Remove component usage from both dialogs and delete the helper/component files.

ADR required: No

### TD-003: Store Classroom Resource Markdown as Source Text

Decision:
Extend `classroom_resources` with nullable `content text`, relax `url` to nullable, and validate resource creation as `title` plus at least one of `url` or non-empty markdown `content`.

Options considered:

- Option A: Keep URL-only resources and put markdown into the URL field.
- Option B: Add `content text` while keeping URL support.
- Option C: Create a separate `classroom_resource_documents` table.

Rationale:

Option B satisfies markdown resources while preserving existing URL resources and keeping the current resource API shape recognizable. Option A corrupts field meaning. Option C is more complexity than current requirements need.

Tradeoffs:

The resource card must handle three states: URL-only, markdown-only, and URL-plus-markdown. The server must handle older rows where `content` is null.

Security and privacy impact:

Markdown content is user-authored trainer data and visible to classroom users. Authorization remains in `addResource` and classroom detail access. Input validation should trim strings and reject empty resources.

Testing impact:

Verify existing URL-only resources still render. Verify markdown-only resources save, reload, and render.

Code-quality impact:

This keeps resource data cohesive and avoids a speculative document model. The storage detail stays inside classroom controller/schema code.

Rollback or migration:

Rollback UI/API to URL-only. The nullable `content` column can remain harmless or be dropped in a later migration if needed.

ADR required: Yes, `docs/adr/0002-markdown-source-classroom-resources.md`

### TD-004: Reuse Existing Markdown Editor, Add Compact/Safe Resource Rendering

Decision:
Reuse the existing Gravity UI markdown editor wrapper for resource content, but allow a compact height/class option for dialog use. Render resource markdown through the existing markdown renderer with raw HTML disabled for resources.

Options considered:

- Option A: Use the existing editor exactly as-is.
- Option B: Extend the existing editor wrapper with compact sizing props.
- Option C: Add another markdown editor package.

Rationale:

Option B keeps the project on its current editor stack while making the editor usable inside a modal. Existing editor defaults can remain for pages that need the current large editing surface. Raw HTML must be disabled for resources because resource markdown is trainer-authored content displayed to classroom users.

Tradeoffs:

The markdown renderer needs a small option or companion component to disable raw HTML while preserving existing pages that rely on raw HTML/iframe behavior.

Security and privacy impact:

Disabling raw HTML for resource markdown reduces XSS and unsafe embed risk. Links should use normal browser behavior; external URLs should retain `rel="noreferrer"` where rendered as explicit links.

Testing impact:

Verify resource markdown renders GFM/code/list content. Verify raw HTML is not rendered for resources.

Code-quality impact:

Extending existing editor/renderer APIs is smaller and less volatile than maintaining a second markdown stack.

Rollback or migration:

Restore resource dialog to basic inputs and stop passing compact/safe renderer options.

ADR required: No

## User Approval or Gate Waiver

Approved by: User
Date: 2026-07-25
Notes: Approved in chat.
