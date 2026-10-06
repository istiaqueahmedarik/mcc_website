# Classroom Codeforces EDU Saved Profile Links - Implementation Review

## Outcome

Fixed the EDU saved-HTML import false negative caused by browsers rewriting Codeforces profile links from relative to absolute URLs.

## Review Flow

1. `server/src/services/codeforcesContestService.ts` now resolves each standings profile link against the fixed Codeforces base URL, accepts only the exact Codeforces origin and profile path, and reads the visible handle text after validation.
2. `server/src/services/codeforcesContestService.test.ts` covers browser-saved absolute Codeforces links and rejects equivalent-looking links on external origins.
3. The supplied `Standings - Codeforces.html` was replayed locally through `importCodeforcesEduStandingsHtml` with target `Istiaque_ahmed`; it returned status 200 with that one team and 22 problems.

## Verification

- `bun test src/services/codeforcesContestService.test.ts`: 31 passed, 0 failed.
- Real saved-page replay: status 200, title `Binary Search`, team `Istiaque_ahmed`, 22 problems.
- No raw uploaded HTML is logged, stored, or added to the repository.

## Boundaries

- This is a local implementation and test result, not deployment or authenticated hosted-browser verification.
- Classroom authorization, verified/overridden handle filtering, pagination checks, source validation, and snapshot persistence remain unchanged.
