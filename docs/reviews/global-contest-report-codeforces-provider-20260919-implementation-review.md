# Global Contest Report Codeforces Provider Implementation Review

Date: 2026-09-19

## Outcome

The global Generate Contest Report workflow now supports VJudge and Codeforces contest items without changing the existing scoring engine. Provider access is requested inside each configured room rather than blocking the entire contest-report area behind VJudge login.

## Review Flow

### 1. Persist provider identity before fetching

- `docs/sql/global-contest-report-codeforces-provider-20260919.sql` adds `provider` with a `vjudge` default/check and replaces room/contest uniqueness with `(room_id, provider, contest_id)`.
- `server/src/controllers/contestRoomContestsController.ts` normalizes and validates provider-specific source IDs, detects duplicates per provider, and gives new Codeforces rows a collision-resistant formula key.
- Existing rows and existing formula keys remain unchanged, preserving current VJudge scoring configuration.

### 2. Reuse the provider adapter, then enter the same scoring pipeline

- `server/src/services/classroomContestRankService.ts` now owns the shared provider/source normalization helpers in addition to dispatch.
- `server/src/controllers/contestRoomController.ts` loads the stored provider and calls that adapter for every item.
- VJudge receives only VJudge JSESSIONID. Codeforces receives the Codeforces JSESSIONID plus a lazy encrypted credential provider tied to the acting admin.
- The normalized results continue into `buildScoredContestReport`; formulas, merge groups, precision, sort rules, exclusions, adjustments, and drop-worst behavior were not changed.
- Codeforces report identities stay provider-prefixed, avoiding accidental automatic merging with a same-named VJudge participant.

### 3. Preserve secret and failure boundaries

- `server/src/services/trainerCodeforcesCredentialService.ts` shares the existing encrypted per-user credential loader between classroom and global report controllers.
- New protected credential status/save/delete routes return only configured state, key hint, and timestamps; plaintext secrets are never returned.
- `client/src/actions/contest_details.js` forwards both provider sessions through dedicated headers and stores pasted sessions only in 12-hour HTTP-only cookies. Codeforces JSESSIONID is verified through a protected server endpoint before the cookie is written.
- Partial generation lists every missing provider source. Publication returns 409 until every configured source is available, preventing an incomplete public snapshot.
- Global Codeforces demerit authoring was intentionally not inferred; existing global demerits remain VJudge-only in this change.

### 4. Ask for access only after the provider is known

- `/contests_report` now enters the room list directly, and the details layout retains only MCC admin authorization.
- Add Contest includes an accessible provider selector and provider-aware source guidance.
- The room renders VJudge controls only for VJudge items and Codeforces controls only for Codeforces items. Public Codeforces API access is described as anonymous-first; signed credentials and JSESSIONID are presented as fallbacks.
- Single-contest links use the item UUID rather than external numeric ID, so same-ID VJudge and Codeforces items select correctly.
- Submit buttons announce pending state and retain their original action meaning.

## Verification

- `bun test src/services/classroomContestRankService.test.ts src/services/codeforcesContestService.test.ts src/services/contestScoringService.test.ts`: 47 passed, 0 failed.
- Targeted ESLint for the changed contest-report pages, actions, proxy, and pending-button component: passed.
- `git diff --check`: passed.
- `bun build src/index.ts --target=bun --outdir /tmp/mcc-server-build-20260919-final-2`: passed (807 modules).
- Read-only live schema inspection confirmed `Contest_room_contests.contest_id` is `text`; `provider` is absent until the rollout SQL is applied.
- `npm run build` in `client/`: passed (45 static pages generated; dynamic contest-report routes compiled).
- A full server `tsc --noEmit` remains unavailable because the existing TypeScript configuration uses removed `moduleResolution=node10` behavior (TS5108); the focused tests and Bun production bundle cover this change instead.

## Rollout Order

1. Back up or snapshot the database according to the normal deployment process.
2. Apply `docs/sql/global-contest-report-codeforces-provider-20260919.sql`.
3. Run the read-only column/index verification queries included in that file.
4. Deploy server and client together.
5. Smoke a VJudge-only room, a public numeric Codeforces room without credentials, a private/EDU Codeforces room with the appropriate access, a mixed room, and publication refusal with one unavailable source.

## Residual Verification Boundary

No SQL was applied and no production data was mutated. No real VJudge/Codeforces credential was replayed. Authenticated browser layout, live provider access, public/private Codeforces behavior, production reverse-proxy cookie/header transport, migration rollback, and hosted mixed-provider publication remain unverified.
