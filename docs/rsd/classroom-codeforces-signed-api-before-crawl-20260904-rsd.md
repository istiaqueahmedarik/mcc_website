# Classroom Codeforces Signed API Before Crawl RSD

> Superseded in part on 2026-09-04: successful numeric API snapshots retain all official rows for trainer mapping instead of failing when the current roster has no matching handle.

## Requirement

Restore the trainer-facing Codeforces API key/secret input. For numeric classroom contests, keep the anonymous official API check first, retry through the signed API when saved credentials are available, and use the authenticated HTML crawler only as fallback. Keep EDU on the crawler.

## Acceptance Criteria

- The Codeforces Access dialog has distinct API key/secret and JSESSIONID sections.
- Classroom managers can save, inspect connection metadata for, replace, and clear their own API credentials.
- Plaintext credentials never return from the server; saved values are independently authenticated-encrypted with the dedicated server key.
- Numeric fetching orders access as anonymous API, signed API, then constrained web crawl.
- The anonymous request contains exactly `contestId`; the signed request uses sorted Codeforces parameters and a SHA-512 `apiSig` without exposing the secret.
- Credentials are loaded lazily, so a successful anonymous request neither reads nor uses them.
- Existing rate, timeout, response-size, EDU/web classroom-handle filtering, and upsolve bounds remain in force.
- JSESSIONID remains transient and HTTP-only rather than database-persisted.
- Codeforces OAuth is not added because it does not replace the documented API key/secret signature scheme.

## Data and Authorization

- Reuse `public.classroom_codeforces_credentials`, keyed by trainer user ID.
- Require classroom-manager authorization for credential GET/PUT/DELETE endpoints.
- Return only `connected`, key hint, and lifecycle timestamps.
- Keep RLS enabled and direct anon/authenticated DML privileges revoked.

## Out of Scope

- Replaying a trainer's real credentials during tests.
- Persisting Codeforces browser sessions.
- Changing VJudge behavior, report scoring, snapshot schema, or global contest routes.
- Production deployment or process restart.
