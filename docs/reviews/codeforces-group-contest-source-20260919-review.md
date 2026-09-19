# Codeforces Group Contest Source Implementation Review

Date: 2026-09-19

## Outcome

Codeforces group contest URLs retain their group code and use the correct authenticated standings route. Numeric-only input is intentionally not guessed because the same numeric value does not identify the group path.

The follow-up failure screenshot showed the corrected source was already stored, while Codeforces rejected the saved API key and the report UI hid the JSESSIONID fallback result. Credential saves now perform a signed `user.friends` validation before encryption, rejected credentials receive a bounded error code, and report failures explain both the API credential and web-session recovery paths without exposing either secret.

## Review Flow

1. `classroomContestRankService.ts` normalizes the supplied group URL to `group:SxSYDasIfo:717234` before persistence.
2. `codeforcesContestService.ts` parses that canonical source and sends both `717234` and `SxSYDasIfo` through anonymous/signed API attempts before the fixed-origin web fallback.
3. The fallback uses the group `groupmates` standings mode; the parser accepts problem links only under the exact group/contest path and records non-sensitive group metadata.
4. The add-contest form explains that group contests require the full URL.

## Verification

- Live anonymous API probe for contest `717234`: provider returned `Contest with id 717234 not found`.
- Read-only database inspection confirmed room `ICPC TFC 2026` stores `group:SxSYDasIfo:717234`; no row was changed.
- Focused Bun suites: 50 passed, 0 failed, 222 expectations.
- Targeted ESLint for the changed add-contest page: passed.
- Targeted ESLint for the generated-report error page: passed.
- Server production bundle: passed (807 modules).
- Authenticated Codeforces group crawling remains unverified because no real JSESSIONID was replayed.

## User Recovery

The source is already correct. Replace or clear the rejected API credential in Provider access. A replacement key/secret is verified before storage. Alternatively, connect a Codeforces JSESSIONID that can access the group; the report now states if that fallback is missing, invalid, or challenged.
