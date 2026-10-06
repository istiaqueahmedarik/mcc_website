# Classroom Codeforces EDU Lesson Standings Technical Decisions

Date: 2026-09-01

## Source Identity

EDU lessons use stable internal source keys: `edu:<courseId>:<lessonId>`, optionally followed by `:friends` or `:list:<readKey>`. Regular Codeforces sources remain numeric. Report keys remain provider-prefixed, for example `codeforces:edu:2:6`.

## Session Transport

The trainer pastes only `JSESSIONID`. MCC stores it in a 12-hour, HTTP-only, SameSite=Lax browser cookie. Next route handlers forward it through `X-Codeforces-Session` only on explicit snapshot fetch requests; direct-Hono production routing resolves the root-scoped `cf_session` cookie as a fallback. The session is not persisted in Postgres and is never returned in snapshot/report data.

## Crawling And Privacy

The Codeforces adapter requests the fixed `codeforces.com` EDU standings path, follows pagination with concurrency capped at six by default, caps sources at 250 pages, and limits each HTML response to 4 MiB. It parses text and fixed attributes with Cheerio; it does not render provider HTML. Only verified classroom Codeforces handles and explicit Codeforces override handles survive parsing and persistence.

## Scoring

The EDU `=` value is solved count. Each accepted problem contributes its configured problem weight or one point. Penalty is the sum of rejected attempts shown in problem cells (`+N` and `-N`). This preserves the existing solved/penalty report contract without inventing contest-time penalty for a self-paced course.

## Failure Contract

Missing and invalid/expired sessions return distinct 428 errors. Cloudflare/provider blocking returns a retryable 503. Non-standings HTML is rejected before snapshot persistence. Regular Codeforces API fetching remains unchanged.
