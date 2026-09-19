# Global Contest Report Snapshot Cache Implementation Review

Date: 2026-09-19
RSD: `docs/rsd/global-contest-report-snapshot-cache-20260919-rsd.md`

## Outcome

Global report generation is cache-first. The first successful generation persists a private full-room or contest-item snapshot; later views return it without VJudge or Codeforces traffic. Refresh is the only UI action that fetches current provider data. Publish copies the saved full-room snapshot instead of fetching providers again.

## Review Flow

1. `docs/sql/global-contest-report-snapshot-cache-20260919.sql`
   - Creates the private JSONB snapshot table, scope uniqueness, foreign-key indexes, constraints, forced RLS, and revoked Data API roles.
2. `server/src/services/globalContestReportSnapshotService.ts`
   - Loads and atomically upserts snapshots, normalizes persisted JSON, and marks private/public report state stale after authoritative configuration changes.
3. `server/src/controllers/contestRoomController.ts`
   - Resolves report scope, serves saved data first, persists initial/explicitly refreshed generations, and publishes only the current saved full-room snapshot.
4. `server/src/controllers/contestRoomContestsController.ts`
   - Invalidates snapshots after contest and Group mapping mutations, in the same short transaction as the authoritative write.
5. `server/src/controllers/demeritController.ts`
   - Invalidates every affected VJudge room after demerit mutations.
6. `client/src/app/contests_report/details/[id]/generate_report/page.js`
   - Shows saved timestamp/stale state and posts explicit refresh through a Server Action, preserving the saved report when refresh fails.

## Security and Privacy

- Existing admin authorization protects every cache read, refresh, and publish path.
- The new table has RLS enabled and forced, with no `anon` or `authenticated` grants or policies.
- Provider cookies/credentials, raw HTML, and CSV uploads are not included in snapshots.
- External calls occur before persistence and outside database transactions.

## Deployment Order

1. Apply `docs/sql/global-contest-report-snapshot-cache-20260919.sql`.
2. Deploy server and client together.
3. Generate one full report and one contest-item report; confirm the second view is a cache hit.
4. Use Refresh and confirm the generation timestamp changes.
5. Publish and confirm no provider request is made.

## Rollback

Revert the application changes, then apply `docs/sql/global-contest-report-snapshot-cache-20260919-rollback.sql`.

