# Classroom Codeforces API Upsolves RSD

## Problem

A numeric Codeforces contest can load standings through the official API and still fail with `CODEFORCES_WEB_BLOCKED` when `include_upsolves` is enabled, because the current implementation switches to per-handle HTML submission-history crawling after the API succeeds. Private Gym `708543` demonstrates this: anonymous standings are unavailable by design, while the signed API is the supported access path.

## Requirement

Keep numeric contest upsolve collection on the same provider transport that produced the standings. API standings use bounded `contest.status` paging, signed when the standings request was signed. HTML standings retain the bounded per-handle HTML fallback. EDU behavior is unchanged.

## Acceptance Criteria

- A successful anonymous API standings request uses anonymous `contest.status` for opt-in upsolves.
- A successful signed API standings request uses signed `contest.status` for opt-in upsolves.
- API status paging stops after reaching the contest end, filters submissions to classroom handles, and fails closed at the configured page limit.
- Post-contest failures are added without dropping or double-counting official contest-time rejected attempts.
- API-origin upsolves do not require or send a JSESSIONID.
- Web-origin standings preserve the existing constrained HTML submission-history behavior.
- The response records only non-sensitive upsolve-source metadata; API keys, secrets, signatures, and browser sessions remain absent from snapshots and logs.

## Out of Scope

- Changing the `include_upsolves` setting or report scoring contract.
- Changing EDU or VJudge ingestion.
- Persisting Codeforces browser sessions.
- Replaying trainer credentials in tests or diagnostics.
- Database schema changes.
