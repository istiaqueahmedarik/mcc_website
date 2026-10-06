# Classroom Codeforces EDU Browser Import Implementation Review

## Review Flow

1. Read-only inspection identified the failing item as Codeforces source `edu:2:6`, not a numeric contest or Gym. The classroom has an explicit Codeforces target handle, but no successful snapshot for this item.
2. Safe unauthenticated network probes reproduced a Cloudflare browser challenge on the lesson standings route while the EDU course index remained reachable. The official contest API cannot address a course/lesson source key.
3. `server/src/services/codeforcesContestService.ts` adds a synchronous saved-page adapter that reuses the existing EDU parser and normalized snapshot contract. It accepts only an EDU source, caps UTF-8 input at 4 MiB, requires an accessible standings table, validates every problem link against the exact course and lesson, requires requested classroom handles, and rejects an incomplete paginated view.
4. `server/src/controllers/classroomContestController.ts` detects the optional `standingsHtml` field on the existing manager-authorized fetch endpoint. A VJudge or non-EDU item fails closed; a valid EDU import continues through existing classroom mapping, snapshot persistence, and item timestamp updates. The provider credential loader and outbound Codeforces request are not invoked for an import.
5. `client/src/components/ClassroomContestPanel.jsx` keeps normal Fetch as the primary action, adds a discoverable import control only for EDU rows, and opens the same recovery dialog automatically after `CODEFORCES_WEB_BLOCKED`. The dialog builds a fixed Codeforces URL from validated source components, explains the browser save flow, accepts one HTML file, reports filename/size, and maps validation failures to recovery guidance.
6. The EDU-specific `CODEFORCES_WEB_BLOCKED` response now points raw API callers to the saved-HTML recovery instead of suggesting another session retry.
7. Focused fixtures cover normalization without raw-document retention, wrong-lesson rejection, challenge-page rejection, incomplete pagination, non-EDU rejection, the byte limit, and the revised blocked-response guidance.

## Why

Cloudflare is challenging the server network rather than merely rejecting the JSESSIONID. Reconnecting the same session or adding API credentials cannot make an EDU course/lesson available through the official contest API. A trainer browser can complete the provider challenge, so importing that browser-rendered standings document is the narrow recovery mechanism that preserves server-side validation and the existing report pipeline.

## Security and Privacy

- Classroom-manager authorization still runs before the item or request body is processed.
- The server parses HTML as data with Cheerio; it does not render or execute scripts, styles, forms, or links.
- Only parsed text, validated Codeforces problem links, and normalized standings fields enter the snapshot. The raw document is not written to Postgres, logs, response payloads, or project files.
- Course and lesson identity come from the already validated contest item, not from a client-provided destination URL.
- The import cannot be used for VJudge, numeric Codeforces contests, arbitrary origins, or third-party scraping.
- No pasted application token, provider session, API credential, or Cloudflare clearance cookie was replayed.

## Interface Audit

| Before | After | Why |
| --- | --- | --- |
| A blocked EDU fetch ended with retry/reconnect guidance | The failure opens a focused saved-page recovery dialog | Makes the next viable action immediate without claiming the server can bypass the challenge |
| No manual recovery was discoverable | EDU rows have a labelled, tooltip-backed import icon beside Fetch | Keeps normal fetch primary while making the fallback available before an error |
| Trainers had to reconstruct a provider URL | The dialog opens the exact friends/read-list standings URL | Prevents wrong-filter and wrong-lesson mistakes |
| Provider HTML had no accepted input path | A visible native file control shows filename, size, limits, and privacy behavior | Preserves keyboard access and clear trust boundaries using existing UI primitives |

The existing Radix dialog supplies focus trapping, focus return, Escape behavior, and reduced-motion-aware primitives. Controls retain visible labels/focus styles and existing press feedback. Content scrolls within the viewport and wraps/stacks on narrow screens; no decorative animation or layout-shifting asset was added.

## Verification

- `bun test src/services/codeforcesContestService.test.ts` — 29 passed, 0 failed.
- `bun build src/index.ts --outdir <temporary-directory> --target bun` — passed, 804 modules bundled.
- `npx eslint src/components/ClassroomContestPanel.jsx` — passed.
- `npm run build` in `client/` — passed, including compilation, TypeScript, and 43 static pages.
- `git diff --check` — passed.

Production deployment, process restart, authenticated trainer-browser interaction, a real saved Codeforces page import, and hosted request-size/proxy verification remain pending.
