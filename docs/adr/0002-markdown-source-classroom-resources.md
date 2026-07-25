# ADR-0002: Store Classroom Resource Markdown as Source Text

Status: Accepted
Date: 2026-07-25
Task ID: trainer-dashboard-ai-resource-writing-assistant

## Context

Classroom resources currently store `title` and a required `url`. The approved RSD requires markdown resources with a proper editor, while existing URL-only resources must keep working. Trainer-authored resource markdown will be displayed to classroom users, so rendering needs safer handling than the existing raw-HTML-enabled default renderer.

## Decision

Add nullable `content text` to `classroom_resources`, relax `url` to nullable, and validate new resources as `title` plus at least one of `url` or markdown `content`. Store markdown source text, not rendered HTML. Render resource markdown with raw HTML disabled.

## Consequences

- Existing URL resources remain valid.
- New resources can be URL-only, markdown-only, or both.
- Resource rendering must handle multiple display states.
- Schema initialization must include `ALTER TABLE ... ADD COLUMN IF NOT EXISTS content text` and relax the URL not-null constraint for existing databases.
- Disabling raw HTML for resources reduces embed flexibility but improves safety.

## Alternatives Considered

- Put markdown into the URL field: rejected because it corrupts field meaning and breaks link behavior.
- Add a separate resource documents table: rejected because the current requirements do not justify the extra relationship and query complexity.
- Store rendered HTML: rejected because markdown source is easier to edit, diff, sanitize, and re-render.

## References

- `docs/rsd/trainer-dashboard-ai-resource-writing-assistant-rsd.md`
- `docs/decisions/trainer-dashboard-ai-resource-writing-assistant-technical-decisions.md`
- `server/src/controllers/classroomController.ts`
- `server/src/utils/dbInit.ts`
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `client/src/components/MarkdownRenderer.js`
