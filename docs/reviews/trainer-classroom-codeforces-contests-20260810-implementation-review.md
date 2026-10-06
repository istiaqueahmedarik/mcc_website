# Trainer Classroom Codeforces Contests Implementation Review

Date: 2026-08-10

## Scope

Implemented Codeforces support inside the classroom-private contest/report workflow while preserving global VJudge routes and global contest-report persistence.

## Review Flow

1. Planning and rollout artifacts:
   - `docs/rsd/trainer-classroom-codeforces-contests-20260810-rsd.md`
   - `docs/decisions/trainer-classroom-codeforces-contests-20260810-technical-decisions.md`
   - `docs/tasks/trainer-classroom-codeforces-contests-20260810-task-plan.md`
   - `docs/sql/trainer-classroom-codeforces-contests-20260810-expand.sql`
   - `docs/sql/trainer-classroom-codeforces-contests-20260810-contract.sql`

2. Provider services:
   - `server/src/services/classroomContestRankService.ts` adds the classroom provider adapter and provider-prefixed contest keys.
   - `server/src/services/codeforcesContestService.ts` implements Codeforces public anonymous fetch, lazy signed Gym retry with trainer credentials, 2.1-second queueing, bounded rate retry, 30-second timeout, 64 MiB response guard, official-row filtering, and scoring normalization.
   - `server/src/services/vjudgeContestService.ts` stays behavior-compatible and is covered by a regression test.

3. Credential storage:
   - `server/src/utils/codeforcesCredentialCrypto.ts` encrypts/decrypts Codeforces API credentials with AES-GCM and a dedicated `CODEFORCES_CREDENTIAL_ENCRYPTION_KEY`.
   - `server/src/controllers/classroomContestController.ts` adds classroom-manager authorized credential status/save/delete endpoints. Credentials are owned by the acting trainer and loaded only when a Codeforces signed retry is required.
   - `docs/sql/trainer-classroom-codeforces-contests-20260810-expand.sql` adds `public.classroom_codeforces_credentials` with RLS enabled and no anon/authenticated grants.

4. Classroom controller:
   - `server/src/controllers/classroomContestController.ts` accepts `provider`, dispatches fetches by stored provider, persists full official Codeforces snapshots, exposes latest unmapped/ignored Codeforces rows for trainer review, invalidates snapshots when provider/external ID changes, and merges reports through canonical `student:*`, `group:*`, or unmatched `vjudge:*` identities.
   - New reports use provider-prefixed contest IDs, `contestMetaById`, `identityKey`, `providers`, and `sourceHandles`.
   - Handle overrides and demerits expose generic `handle` while keeping `vjudgeHandle` as a legacy alias. Handle overrides can target `student`, `group`, or `ignore`.

5. Client UI:
   - `client/src/components/ClassroomContestPanel.jsx` adds the provider selector, dynamic contest/handle labels, provider badges, provider-aware mapping/demerit payloads, unmapped Codeforces row map/ignore controls, Codeforces credential setup instructions/save/clear UI, Codeforces error messages, and VJudge-only session prompting.
   - `client/src/components/ReportTable.js` uses stable identity keys, provider badges, mapped classroom profile data first, and VJudge profile batch lookup only for VJudge/legacy rows.
   - Existing compact workbench structure, shadcn/Radix controls, keyboard-accessible selects/buttons, loading labels, and private classroom share control are preserved.

## Security And Privacy Notes

- Trainer Codeforces API key/secret plaintext is accepted only on save and is stored as AES-GCM ciphertext using `CODEFORCES_CREDENTIAL_ENCRYPTION_KEY`.
- The browser receives only `configured`, API-key hint, and timestamps; saved secrets are never returned or logged.
- Public Codeforces contests do not load saved credentials; Gym/group/mashup signed retry lazily decrypts the acting trainer's credentials.
- Codeforces snapshots now retain all official standings rows, so trainers can map or ignore unknown handles. Generated reports still count only rows mapped to classroom students/groups, plus VJudge legacy unmatched rows.
- The Next classroom contest proxy forwards MCC JWTs and VJudge session cookies only; Codeforces credential use stays inside Hono/server services.
- SQL reasserts RLS on all public classroom contest tables, adds RLS for the credential table, and adds no direct anon/authenticated policies or grants.

## Verification

- `bun test` in `server/`
- `bun --check src/services/codeforcesContestService.ts`
- `bun --check src/services/classroomContestRankService.ts`
- `bun --check src/utils/codeforcesCredentialCrypto.ts`
- `bun build src/controllers/classroomContestController.ts --target=bun --outfile=/tmp/classroomContestController-check.js`
- `bun build src/services/codeforcesContestService.ts --target=bun --outfile=/tmp/codeforcesContestService-check.js`
- `bun build src/services/classroomContestRankService.ts --target=bun --outfile=/tmp/classroomContestRankService-check.js`
- `bun build src/utils/codeforcesCredentialCrypto.ts --target=bun --outfile=/tmp/codeforcesCredentialCrypto-check.js`
- `bun build src/routes/classroomRoute.ts --target=bun --outfile=/tmp/classroomRoute-check.js`
- `npx eslint src/components/ClassroomContestPanel.jsx src/components/ReportTable.js src/app/api/classroom/[id]/contests/[...path]/route.js src/app/api/classroom/[id]/contests/vjudge-session/route.js`
- `npm run lint` in `client/` passed with existing warnings.
- `npm run build` in `client/`
- `git diff --check`

## Remaining Rollout Checks

- Apply the expand SQL before deploy.
- Configure `CODEFORCES_CREDENTIAL_ENCRYPTION_KEY` as a 32-byte server-only secret before trainers save credentials.
- Ask each trainer who needs Gym/group/mashup fetches to save Codeforces API credentials from an account that can view those contests.
- Smoke one public Codeforces contest anonymously and one accessible Gym/group/mashup contest using trainer-saved credentials with real classroom rows.
- Apply the contract SQL after the rollback window.
