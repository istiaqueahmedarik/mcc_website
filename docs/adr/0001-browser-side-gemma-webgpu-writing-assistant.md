# ADR-0001: Browser-Side Gemma WebGPU Writing Assistant

Status: Superseded for classroom/resource authoring
Date: 2026-07-25
Task ID: trainer-dashboard-ai-resource-writing-assistant

## Context

Trainer dashboard and classroom resource authoring need draft assistance for names, titles, descriptions, and markdown content. The user requested `rhulha/Gemma3-270m-WebGPU`, which demonstrates a browser-only Gemma 270M chat using Hugging Face Transformers, WebGPU, ONNX, and no backend. The current app already has cloud AI route handlers, but the RSD requires no new server-side AI secret and manual fallback when local AI is unavailable.

## Decision

Use a browser-only, lazy-loaded `@huggingface/transformers` helper for trainer writing assistance. The helper will use the ONNX Gemma model `onnx-community/gemma-3-270m-it-ONNX` for `text-generation` with WebGPU when available. The UI will expose loading/error/unsupported states and will only apply generated drafts into editable form fields.

## Consequences

- Prompt text for this feature stays in the trainer's browser after model assets load.
- First use can be slow because model assets must download and initialize.
- Some browsers/devices will not support WebGPU; manual authoring remains the fallback.
- The model integration stays isolated from page components, making future model/dtype/cache changes lower-risk.
- A new npm dependency and lockfile update are required.

## Superseded Note

The 2026-07-25 task `classroom-resource-reader-problem-preview-20260725` removes the trainer writing assistant from classroom creation and resource authoring because the user later said the AI feature is not needed. Reintroduce AI only under a future approved RSD.

## Alternatives Considered

- CDN import copied from the reference repo: rejected because npm dependency tracking is better for this Next.js app.
- Existing server/cloud AI route handlers: rejected because they would change privacy/secret assumptions and conflict with the local WebGPU requirement.
- No AI helper: rejected because it misses the user goal.

## References

- `docs/rsd/trainer-dashboard-ai-resource-writing-assistant-rsd.md`
- `docs/decisions/trainer-dashboard-ai-resource-writing-assistant-technical-decisions.md`
- `https://github.com/rhulha/Gemma3-270m-WebGPU`
- `https://huggingface.co/docs/transformers.js/index`
- `https://huggingface.co/docs/transformers.js/en/guides/webgpu`
- `https://huggingface.co/onnx-community/gemma-3-270m-it-ONNX`
