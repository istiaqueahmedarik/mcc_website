# Classroom Codeforces EDU Hacks Column - Implementation Review

## Outcome

Fixed valid friends-filtered EDU saved pages being rejected when Codeforces includes a Hacks aggregate column before the problem columns.

## Review Flow

1. `server/src/services/codeforcesContestService.ts` now identifies EDU problem headers from their lesson problem links and retains each header's real table-column index.
2. Standings rows read submissions only from those identified indexes, so aggregate columns cannot shift problem results.
3. Existing import source validation still checks every selected problem against the stored course and lesson.
4. `server/src/services/codeforcesContestService.test.ts` covers a friends standings table containing the Hacks column.

## Verification

- `bun test src/services/codeforcesContestService.test.ts`: 32 passed, 0 failed.
- The supplied `standings.htm.html` replayed successfully for `edu:2:6` and target `Istiaque_ahmed`, returning 22 problems and one filtered team.
- Server bundle and diff checks passed.

## Boundaries

- The uploaded HTML remains transient and was not logged, stored, or added to the repository.
- Authorization, target-handle filtering, pagination limits, source validation, and snapshot persistence are unchanged.
- Verification is local; it does not establish deployment or hosted authenticated-browser success.
