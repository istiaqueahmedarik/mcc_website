# Global Codeforces Identity Resolution Implementation Review

Date: 2026-09-19
RSD: `docs/rsd/global-codeforces-identity-resolution-20260919-rsd.md`

## Outcome

Global report configuration now distinguishes Codeforces Public, Gym, Group, and EDU sources. Public/Gym/EDU rows resolve against the Codeforces handle saved on the MCC account. Group rows resolve through either the student-ID-after-`=` convention or a trainer-managed `username,student_id` CSV. Matched report rows use immutable MCC account identity and display the MCC full name with student ID underneath. Scoring mathematics is unchanged.

## Review Flow

1. `docs/sql/global-codeforces-identity-resolution-20260919.sql`
   - Adds source and group identity configuration to each global contest item.
   - Adds the service-only mapping table with immutable user references, uniqueness, foreign-key indexes, forced RLS, and revoked Data API access.
   - Backfills existing Codeforces sources; existing group sources default to the suffix convention.
2. `server/src/services/codeforcesIdentityService.ts`
   - Owns explicit source normalization, bounded CSV parsing, suffix extraction, and pure rank-row enrichment.
   - Rejects duplicate mappings and refuses to guess ambiguous MCC identities or multi-student provider teams.
3. `server/src/controllers/contestRoomContestsController.ts`
   - Validates contest-type input and resolves CSV student IDs against eligible MCC accounts.
   - Inserts contest configuration and CSV mappings atomically.
   - Replaces a saved group mapping atomically so a failed upload preserves the prior mapping.
4. `server/src/services/codeforcesContestService.ts`
   - Accepts explicit `contest:<id>` and `gym:<id>` sources so web fallback follows the selected route instead of the legacy numeric heuristic.
   - Leaves legacy numeric classroom sources supported.
5. `server/src/controllers/contestRoomController.ts`
   - Resolves Codeforces identities after fetch and before the unchanged shared scorer.
   - Uses `student:<users.id>` for matched identity while retaining the provider handle.
   - Returns bounded unresolved-identity warnings and prevents publishing a report with unresolved participants.
6. `client/src/components/GlobalContestSourceForm.jsx`
   - Adds the provider/source/identity sequence, accessible native controls, the suffix mapping example, and bounded CSV input.
   - Adds the later mapping-replacement form on existing Group contest cards.
7. `client/src/app/contests_report/details/[id]/page.js`
   - Transports bounded CSV text through server actions and renders source/mapping status.
8. `client/src/app/contests_report/details/[id]/generate_report/page.js`
   - Explains unresolved rows, lists the affected contest/username, links back to identity settings, and withholds publishing until resolution.

## Security and Privacy Review

- Admin JWT/account authorization remains required on all mapping mutations.
- Uploaded CSV content is validated server-side, never persisted as a file/blob, and never logged.
- Only eligible non-admin, non-trainer, non-placeholder MCC accounts can be mapping targets.
- Student IDs must resolve to exactly one account; ambiguous records fail closed.
- Provider sessions and API credentials remain on the existing transient/encrypted paths.
- The mapping table has no `anon` or `authenticated` Data API grants or policies.

## Verification

- `bun test src/services/codeforcesIdentityService.test.ts src/services/codeforcesContestService.test.ts src/services/classroomContestRankService.test.ts src/services/contestScoringService.test.ts`
- `bun build src/index.ts --target=bun --outdir=/tmp/mcc-server-identity-build`
- `npx eslint src/app/contests_report/details/[id]/page.js src/app/contests_report/details/[id]/generate_report/page.js src/components/GlobalContestSourceForm.jsx src/actions/contest_details.js`
- `npm run build` in `client/`
- `git diff --check`

The SQL migration was authored and statically reviewed but was not applied to a live database. Authenticated browser QA and production deployment remain unverified.

## Deployment Order

1. Apply `docs/sql/global-codeforces-identity-resolution-20260919.sql`.
2. Deploy server and client together.
3. Open each existing Codeforces Group contest and confirm or replace its default suffix rule.
4. Generate a report and resolve every warning before publishing.

## Rollback

Revert the matching application changes, then apply `docs/sql/global-codeforces-identity-resolution-20260919-rollback.sql` if the stored mappings are no longer needed.
