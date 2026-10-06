# Global Contest Report Snapshot Cache RSD

Date: 2026-09-19
Status: Approved by user request

## Problem

Opening a generated global contest report currently fetches VJudge and Codeforces every time. Repeated views therefore spend provider quota, repeat authenticated crawling, and make an already generated report depend on external availability.

## Requirements

- Persist every successfully generated full-room or single-contest report in PostgreSQL.
- Return the saved snapshot on subsequent report requests without contacting either provider.
- Add an explicit Refresh action that fetches current provider data, recomputes through the existing scorer, and replaces the saved snapshot.
- Keep the previously saved snapshot available if refresh fails.
- Mark snapshots stale when room settings, contest sources, weights, Group mappings, demerits, or scoring configuration change.
- Show stale snapshots for review, but require refresh before publication.
- Publish by copying the current saved full-room snapshot; publishing must not trigger another provider fetch.
- Keep generated snapshots private to the authorized server path and separate from `Public_contest_report`.

## Data Design

Add `public.global_contest_report_snapshots` with:

- a sequential bigint primary key;
- `room_id` with cascading room deletion;
- nullable `contest_item_id` with cascading item deletion, where null represents the full-room report;
- `snapshot` JSONB and `missing_contests` JSONB;
- scoring-config version, stale state, generator, and generation timestamp;
- partial unique indexes for one full-room snapshot per room and one item snapshot per room/item;
- indexes for foreign-key maintenance;
- forced RLS and no `anon` or `authenticated` privileges or policies.

The Hono server continues to authorize admin access and uses its server database connection. The snapshot table is not a public Data API surface.

## Request Semantics

1. Resolve the requested scope to either the full room or one concrete contest item.
2. On a normal report request, return the saved snapshot immediately when present, even when stale.
3. When no snapshot exists, fetch providers, score, persist, and return it.
4. On explicit Refresh, keep the current page visible while the server fetches providers; replace the snapshot only after a successful complete scoring operation.
5. A failed refresh leaves the previous row untouched and returns the trainer to the saved report with an error notice.
6. Publish reads the saved full-room row, rejects missing or stale data, and performs only the short public-report upsert.

## Invalidation

Mark both private generated snapshots and any published report stale after:

- room metadata/formula-component changes;
- contest add, update, move, delete, weight change, or Group identity mapping replacement;
- scoring/merge/adjustment changes;
- global VJudge demerit create, update, or delete.

External standings changing does not automatically mark a snapshot stale; Refresh is the deliberate provider-boundary action.

## Safety and Performance

- Never persist provider sessions, API secrets, raw uploaded CSV files, or fetched HTML.
- Store only the normalized scored report and bounded missing-source metadata already returned to the trainer.
- Perform external provider requests before the short atomic snapshot upsert; never hold database locks across network calls.
- Use atomic partial-index upserts so concurrent writes cannot create duplicate scope rows.

## Interface Direction

The report remains the focal content. A quiet saved-state bar immediately above it shows the last update time and one 44px Refresh action. Stale, refresh-success, refresh-failure, and missing-source states use existing semantic tokens and text; no decorative motion or new color system is introduced.

## Verification

- Unit-test persisted JSON normalization.
- Run the provider/identity/scoring suites and server bundle.
- Run targeted client lint and the Next.js production build.
- Statically review migration constraints, indexes, RLS, and grants.
- Authenticated database/browser verification remains a deployment check when live credentials are unavailable.

## Rollback

Revert the application changes and apply `docs/sql/global-contest-report-snapshot-cache-20260919-rollback.sql`. Published reports remain unchanged.

