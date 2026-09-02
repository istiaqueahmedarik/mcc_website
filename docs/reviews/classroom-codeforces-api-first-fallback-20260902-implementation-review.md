# Classroom Codeforces API-First Fallback Implementation Review

## Review Flow

1. `server/src/services/codeforcesContestService.ts` adds a throttled, bounded anonymous `contest.standings` request containing only `contestId`.
2. The same service normalizes official API problems/rows into the existing classroom provider contract and filters teams against explicit classroom handles.
3. Numeric fetching returns that API result when usable. API errors, invalid payloads, private Gym rejection, or no classroom match invoke the existing authenticated web crawler and record only a non-sensitive fallback code.
4. EDU routing remains unchanged and bypasses the numeric API path. Opt-in upsolve discovery continues to use the bounded session-backed submission crawler.
5. `client/src/components/ClassroomContestPanel.jsx` explains that public contests use the API first and that JSESSIONID is needed for Gym/EDU, upsolves, and fallback.
6. `server/src/services/codeforcesContestService.test.ts` proves API-first behavior without cookies, local filtering/full-count preservation, Gym fallback ordering, fallback-session enforcement, EDU isolation, response limits, and upsolve bounds.

## Why

The official JSON API is more stable than HTML crawling for public numeric contests and avoids unnecessary browser-session dependence. The crawl fallback preserves private Gym and no-match behavior where anonymous public standings are insufficient. Codeforces documents API-key/secret signatures rather than OAuth, so OAuth adds no usable capability here.

## Security and Privacy

- Anonymous API URLs contain only the numeric contest ID.
- Full API rows are filtered in memory before snapshot persistence.
- Existing JSESSIONID transport remains HTTP-only and is used only when crawling is needed.
- No API credentials, OAuth tokens, session values, or provider response bodies are logged or persisted as fallback metadata.

## Verification

- `bun test src/services/codeforcesContestService.test.ts src/utils/codeforcesSession.test.ts`
- `bun build src/services/codeforcesContestService.ts --target=bun --outdir /tmp/mcc-codeforces-api-first-check`
- `npx eslint src/components/ClassroomContestPanel.jsx` from `client/`
- `git diff --check`

Production deployment and authenticated browser verification remain pending.
