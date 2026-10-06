# Classroom Codeforces API Upsolves Implementation Review

## Review Flow

1. The named classroom contest item was inspected read-only and confirmed as private Gym `708543` with `include_upsolves = true`; its anonymous official standings response is `Contest with id 708543 not found`.
2. `server/src/services/codeforcesContestService.ts` now owns one reusable bounded Codeforces API request path for both `contest.standings` and `contest.status`, preserving the required anonymous minimal standings request and Codeforces signing rules.
3. API-origin standings now collect opt-in post-contest submissions through bounded `contest.status` paging using the same anonymous or signed access mode that loaded the standings.
4. Status rows are filtered in memory to explicit classroom handles, stop once the contest-time boundary is reached, and are normalized into the existing upsolve application contract.
5. `applyCodeforcesWebUpsolves` now distinguishes submission lists that already exclude contest-time attempts, preserving official rejected attempts while adding only post-contest failures.
6. HTML-origin standings retain the existing fixed-origin, per-handle submission-history crawler; EDU and VJudge are unchanged.
7. `server/src/services/codeforcesContestService.test.ts` covers anonymous API upsolves, signed private-Gym API upsolves, absence of JSESSIONID transport, signature parameter safety, failure at the page bound, and the retained HTML fallback.

## Why

The prior implementation downgraded from a successful official API standings request to HTML for upsolves. Codeforces could block that HTML request with 403/503, causing the whole fetch to return `CODEFORCES_WEB_BLOCKED` even though signed API access was available. Keeping API-origin work on `contest.status` removes that unnecessary failure point.

## Security and Privacy

- No pasted website token, JSESSIONID, saved API secret, or decrypted credential was replayed.
- Signed request tests use fixtures only; API secrets remain absent from generated URLs.
- API status results are filtered to classroom handles before normalized snapshot data is returned.
- The API page size, page count, target-handle count, timeout, response size, and process-wide request rate remain bounded.
- One environment-presence diagnostic accidentally printed local secret values into the internal execution log. No secret was sent to external services; rotation is recommended if that log is not trusted, and the recurrence/prevention note is recorded in `docs/knowledge-base/mistakes.md`.

## Verification

- `bun test src/services/codeforcesContestService.test.ts src/utils/codeforcesSession.test.ts src/utils/codeforcesCredentialCrypto.test.ts` — 27 passed, 0 failed.
- `bun build src/index.ts --target=bun --outdir /tmp/mcc-codeforces-api-upsolve-check` — passed, 804 modules bundled.
- `git diff --check` — passed.
- Read-only live Postgres inspection confirmed the exact contest provider/source/upsolve state and credential presence without reading plaintext credentials.
- Anonymous live Codeforces API inspection confirmed private Gym `708543` is unavailable without authentication, matching the documented provider behavior.

Production deployment, process restart, a real signed provider request, and authenticated fetch verification remain pending.
