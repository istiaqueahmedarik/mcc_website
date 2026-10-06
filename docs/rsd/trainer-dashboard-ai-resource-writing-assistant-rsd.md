# Trainer Dashboard AI Resource Writing Assistant RSD

Status: Approved
Task ID: trainer-dashboard-ai-resource-writing-assistant
Owner: Codex
Last updated: 2026-07-25
Delivery mode: Auto requested; repository approval gates still required

## Mode and Gate Policy

The user requested `mode:auto` through the RSD orchestrator. Repository `AGENTS.md` is stricter and requires pausing for approval after the Primary RSD, technical decisions, full task plan, and implementation review. This run follows the stricter repository gates.

Gates waited on:
- Primary RSD approval: received from user in chat.

Gates skipped:
- None.

Waivers:
- Auto-mode gate skipping is not used because `AGENTS.md` requires approval gates.

## Grill Mode Summary

Task restatement:
Add an AI-assisted writing workflow to trainer-owned classroom/resource authoring so trainers can quickly draft classroom names/titles, descriptions, and resource content. Use the browser-side Gemma 3 270M WebGPU approach from `rhulha/Gemma3-270m-WebGPU`. Upgrade classroom resources so trainers author resource content with a proper markdown editor and students/trainers read resources as rendered markdown.

Answers received:
- Use this AI reference: `https://github.com/rhulha/Gemma3-270m-WebGPU`.
- Add AI help for fast writing of title/name/description style fields.
- Add the same AI writing help to resources.
- Use a proper editor.
- Use markdown for resources.

Assumptions:
- "Add them to resource as well" means the AI writing helper should also support classroom resource authoring; it does not mean automatically inserting the Gemma GitHub repo as a classroom resource item.
- The trainer dashboard classroom-create dialog should get AI help for classroom name and description.
- The classroom resource share dialog under `/classroom/live/[id]` is the resource UI to upgrade.
- Resource content should support markdown body text in addition to the existing title and URL behavior.
- Existing URL-only resources must remain readable after the change.
- AI generation should be browser-side/local using WebGPU when available, with manual writing still working when WebGPU or model loading is unavailable.
- No new paid/cloud LLM provider, API key, or server-side model inference is required for this task.
- Generated text is a draft only; trainers review and edit before saving.

Scope boundaries:
- Included: trainer/admin classroom create UI, classroom resource share UI, resource display UI, resource persistence/API/schema init, WebGPU AI writing helper integration, markdown editor/rendering for resources.
- Excluded: student-side AI generation, grading/feedback AI, live chat AI, production database migration runner beyond existing schema-init patterns unless technical decisions require it, replacing all existing textareas across the site.

Acceptance criteria candidates:
- Trainers/admins can generate or refine a classroom name and description from the trainer dashboard create-classroom dialog.
- Trainers/admins can generate or refine resource title and markdown body from the classroom resource dialog.
- Resource authoring uses a rich markdown editor, not a plain textarea for markdown body.
- Resource display renders markdown content safely and readably.
- Existing resources that only have `title` and `url` continue to show and link correctly.
- Manual save flow works when WebGPU/model loading fails.
- No secret key is required for the Gemma WebGPU helper.

Important unresolved questions:
- Whether resources should require markdown content, URL, or either one. Work can proceed with conservative compatibility assumption: require title plus at least one of URL or markdown content.
- Whether AI should offer rewrite styles such as "short", "formal", and "student friendly". Work can proceed with a compact default style plus a small tone selector if low-risk.

Decisions requiring user approval under repository gates:
- Whether to proceed from this RSD into technical decisions.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: delivery workflow and gate constraints.
  Evidence: repository requires RSD-first work and pauses after RSD, technical decisions, task plan, and implementation review.
  Confidence: High

- Source: `docs/knowledge-base/project-index.md`
  Used for: trainer/classroom entry point context.
  Evidence: repository has Next.js client, Bun/Hono server, and trainer/classroom entry points.
  Confidence: High

- Source: `docs/knowledge-base/patterns.md`
  Used for: local role/navigation context.
  Evidence: trainer/admin access to Trainer Dashboard is a known local role pattern.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: verification and scope discipline.
  Evidence: narrow client changes should prefer targeted checks when full lint has unrelated failures.
  Confidence: High

- Source: `client/package.json`
  Used for: editor and markdown dependency context.
  Evidence: project already includes `@gravity-ui/markdown-editor`, Plate markdown packages, `react-markdown`, `remark-gfm`, and `rehype-raw`.
  Confidence: High

- Source: `client/src/app/trainer/dashboard/TrainerDashboardClient.js`
  Used for: trainer dashboard classroom-create UI.
  Evidence: current dialog stores `newClassName` and `newClassDesc`, submits `name` and `description` to `classroom/create`.
  Confidence: High

- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: resource authoring and display UI.
  Evidence: current resource dialog stores `resourceTitle` and `resourceUrl`, posts to `classroom/:id/add-resource`, and renders resources as external links.
  Confidence: High

- Source: `server/src/controllers/classroomController.ts`
  Used for: resource and classroom API behavior.
  Evidence: `addResource` currently requires `title` and `url`; `getClassroomDetails` returns classroom-level resources.
  Confidence: High

- Source: `server/src/utils/dbInit.ts`
  Used for: database shape.
  Evidence: `classroom_resources` currently has `title` and non-null `url`, but no markdown content column.
  Confidence: High

- Source: `client/src/components/EditorWrapper.js`, `client/src/components/Editor.js`, `client/src/components/MarkdownRenderer.js`
  Used for: existing markdown editor/rendering patterns.
  Evidence: Gravity UI editor wrapper and ReactMarkdown renderer already exist.
  Confidence: High

- Source: `https://github.com/rhulha/Gemma3-270m-WebGPU`
  Used for: requested AI implementation reference.
  Evidence: repository describes a minimal web chat UI using Gemma 270M through Hugging Face Transformers in-browser with WebGPU/ONNX, no backend required, and WebGPU browser requirement.
  Confidence: Medium

## Goal

Make trainer content creation faster without changing who can create classrooms or resources. Trainers/admins should be able to draft classroom names, classroom descriptions, resource titles, and resource markdown content using an in-browser Gemma WebGPU assistant, then edit and save the final text themselves.

## Non-Goals

- Do not introduce server-side AI inference or store third-party AI secrets.
- Do not make AI generation required for classroom/resource creation.
- Do not change trainer/admin authorization rules.
- Do not remove support for existing URL resources.
- Do not build a general AI copilot for all forms in the application.
- Do not rewrite existing course, achievement, or form editors unless directly needed for reusable editor compatibility.

## Users and Use Cases

- Trainers create classrooms faster by generating a concise classroom name and useful description from a short prompt.
- Trainers share richer study materials as markdown resources with headings, lists, links, and code blocks.
- Trainers use AI to draft resource titles and markdown content, then review/edit before publishing.
- Students read resource content as rendered markdown and can still open linked resources.
- Admins with trainer dashboard access get the same authoring tools.

## User-Visible Behavior

- Trainer dashboard create-classroom dialog includes an AI writing action near classroom name/description fields.
- The AI action can draft missing fields or improve existing text without submitting the form.
- AI loading, ready, unsupported, and error states are visible but compact.
- If WebGPU/model support is missing, the UI explains that AI assist is unavailable and leaves manual fields fully usable.
- Classroom resource dialog includes title, optional URL, and markdown content authoring.
- Resource markdown body uses a proper editor and stores markdown text.
- Resource list/cards show title, optional URL, and rendered markdown excerpt/body.
- Existing URL-only resources remain visible as link resources.

## Acceptance Criteria

- [ ] Trainer/admin can open the trainer dashboard create-classroom dialog and generate a draft classroom name and description.
- [ ] Generated classroom text can be edited before saving and never auto-submits.
- [ ] Trainer/admin can open the classroom resource dialog and generate a draft resource title and markdown body.
- [ ] Resource markdown body uses an existing proper markdown editor component or a justified local wrapper around it.
- [ ] Saved resource markdown persists through the classroom API and reloads with classroom details.
- [ ] Resource markdown renders with existing markdown rendering conventions.
- [ ] Existing resources with only `title` and `url` continue to render and link.
- [ ] Resource creation requires `title` plus at least one of `url` or markdown content.
- [ ] AI assist uses browser-side Gemma/WebGPU behavior inspired by the requested repository and requires no server AI secret.
- [ ] AI assist failure does not block manual classroom or resource creation.
- [ ] Trainer/admin authorization remains enforced by existing trainer/classroom checks.
- [ ] Relevant lint/build or targeted verification is run and recorded.

## Constraints

- Keep changes scoped to trainer dashboard, classroom live/resource UI, classroom resource API/schema, and any small shared AI/editor helper needed.
- Prefer existing local markdown editor/rendering dependencies over adding a new editor dependency.
- Prefer existing server schema-init style unless technical decisions identify a safer migration path.
- Avoid unrelated formatting churn.
- No user text should be sent to a new external AI service for this task.
- WebGPU support varies by browser; unsupported environments must degrade gracefully.
- Existing resources must remain backward compatible.

## Dependencies

- Browser WebGPU availability and model-loading support for the AI helper.
- Hugging Face Transformers/WebGPU package choice or browser module strategy decided in the technical decision package.
- Existing `classroom_resources` table and schema initialization in `server/src/utils/dbInit.ts`.
- Existing classroom API route proxy behavior under `client/src/app/api/classroom/`.
- Existing trainer/admin auth profile and classroom server authorization.
- Existing markdown editor and renderer components.

## Assumptions

- The application can accept one new nullable markdown/content field for resources without a destructive migration.
- URL should become optional for new markdown resources, but still supported.
- Markdown content should be stored as markdown source text, not pre-rendered HTML.
- Resource markdown rendering will use the project renderer and current sanitization/security posture unless technical review finds a blocking issue.
- AI prompt templates can be deterministic and domain-specific enough without storing extra user preferences.
- Model files may be fetched by the browser from a public model source or packaged according to the technical decision; either way, no server secret is needed.

## Risks and Open Questions

- Risk: WebGPU/model loading may be slow or unsupported in some browsers. Mitigation: lazy-load AI only when requested and keep manual authoring available.
- Risk: Adding markdown rendering can increase XSS exposure if raw HTML is allowed. Mitigation: review `MarkdownRenderer` behavior and either sanitize/disable raw HTML for resources or record a security decision.
- Risk: Schema changes may not apply to existing databases if `CREATE TABLE IF NOT EXISTS` alone is used. Mitigation: technical decisions must define `ALTER TABLE IF NOT EXISTS` or migration-safe update.
- Risk: Pulling AI model code from a public repository may add dependency or supply-chain risk. Mitigation: use official package paths where possible and record dependency rationale.
- Risk: Large in-browser model assets can affect page performance. Mitigation: load only in client, only on AI action, with status/cancel/error handling.
- Question: Should AI offer style/tone choices? Owner: Codex. Proceed with minimal, useful defaults unless user requests explicit tones.
- Question: Should markdown resource body be required when URL exists? Owner: Codex. Proceed with title plus at least one of URL or body.

## Test Expectations

- Run targeted lint on changed client files.
- Run server TypeScript/Bun check if an available script exists; otherwise run a narrow syntax/type verification command.
- Run `npm run lint` in `client/` when feasible and record unrelated pre-existing failures if they remain.
- Manually inspect resource creation paths for existing URL-only compatibility.
- Manually review AI fallback states for unsupported WebGPU.
- Security review markdown rendering for raw HTML and link behavior.

## Code Quality Expectations

- Keep AI model loading behind a small client-only module/component boundary so heavy browser-specific logic does not leak into page components.
- Keep resource persistence changes cohesive in classroom resource controller/schema code.
- Reuse existing editor and renderer patterns instead of creating another editor stack.
- Avoid shallow wrappers unless they hide real volatility: WebGPU/model lifecycle, prompt templates, and fallback states are valid boundaries.
- Keep common manual authoring path simple and obvious.
- Add comments only for non-obvious WebGPU/model-loading constraints or markdown security choices.
- Record durable patterns/quality lessons in the knowledge base after approved gates.

## Definition of Done

- [ ] Mandatory Grill Mode completed and assumptions recorded.
- [x] RSD gate satisfied under repository rules.
- [ ] Requirement review and auditor pass completed.
- [ ] Technical decision gate satisfied under repository rules.
- [ ] Full task plan gate satisfied under repository rules.
- [ ] Implementation passes verification.
- [ ] Implementation review gate satisfied under repository rules.
- [ ] Final integrated Git workflow complete if branching/worktrees are used.
- [ ] Knowledge base updated after approved gates.
- [ ] Mistake or near-miss note added.
