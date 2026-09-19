# Codeforces Group Contest Source Implementation Review

Date: 2026-09-19

## Outcome

Codeforces group contest URLs retain their group code and use the correct authenticated standings route. Numeric-only input is intentionally not guessed because the same numeric value does not identify the group path.

## Review Flow

1. `classroomContestRankService.ts` normalizes the supplied group URL to `group:SxSYDasIfo:717234` before persistence.
2. `codeforcesContestService.ts` parses that canonical source and sends both `717234` and `SxSYDasIfo` through anonymous/signed API attempts before the fixed-origin web fallback.
3. The fallback uses the group `groupmates` standings mode; the parser accepts problem links only under the exact group/contest path and records non-sensitive group metadata.
4. The add-contest form explains that group contests require the full URL.

## Verification

- Live anonymous API probe for contest `717234`: provider returned `Contest with id 717234 not found`.
- Focused Bun suites: 49 passed, 0 failed, 215 expectations.
- Targeted ESLint for the changed add-contest page: passed.
- Authenticated Codeforces group crawling remains unverified because no real JSESSIONID was replayed.

## User Recovery

Delete any existing Codeforces item stored as only `717234`, then add the full URL `https://codeforces.com/group/SxSYDasIfo/contest/717234`. Connect a Codeforces JSESSIONID that can access the group before generating the report.
