# Classroom Contest Report Scroll And EDU Friends Fetch

## Request

1. Give wide classroom contest reports an explicit horizontal scrollbar.
2. Fetch ordinary Codeforces EDU lesson standings through the authenticated friends-only view instead of crawling the full standings.
3. If no fetched friend matches a verified or explicitly mapped classroom Codeforces handle, notify the trainer that the students are not in their Codeforces friends list yet.

## Scope

- Keep the existing classroom contest routes, authorization, snapshot shape, provider-session transport, and database schema unchanged.
- Preserve explicit `list=<readKey>` EDU sources as an already-bounded alternative.
- Treat plain EDU URLs and legacy `edu:<course>:<lesson>` identifiers as friends-only sources.
- Fail before snapshot persistence when friends-only standings contain no classroom target.
- Keep report content readable at its intrinsic width and expose the horizontal overflow through the shared Radix scroll-area primitive.

## Acceptance Criteria

- A wide report table has a visible horizontal scrollbar and remains keyboard-focusable as a labelled region.
- Plain and legacy EDU sources request every crawled page with `friends=true`.
- A friends-only fetch with no classroom match returns a distinct provider error and the trainer sees actionable notification text.
- Existing numeric Codeforces contests and explicit EDU list sources retain their current behavior.
- Focused service tests, targeted client lint, server bundle/type-compatible checks, and diff checks pass.

## Exclusions

- No global contest-report redesign.
- No changes to Codeforces credentials or JSESSIONID persistence.
- No automatic mutation of the trainer's Codeforces friends list.
- No database migration or production deployment.
