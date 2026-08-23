# Trainer Classroom Codeforces Contests Technical Decisions

Date: 2026-08-10

## Decision

Classroom contest rankings support VJudge and Codeforces through a classroom-only provider adapter layer. Global VJudge fetch routes stay unchanged.

## Provider Contract

Adapters return normalized rank data with:

- provider-aware contest metadata
- classroom-friendly `teams` rows
- native provider metadata preserved in `providerMeta`
- a stable `sourceHandles` list for every row
- enough scoring data for existing report rendering

VJudge keeps the existing processed shape and is wrapped into the shared contract. Codeforces maps `contest.standings` rows to the same contract while preserving native `rank`, `points`, phase/frozen state, problem metadata, and full participant count.

## Codeforces Fetching

Public regular contests are requested anonymously with only `contestId`, matching Codeforces' public-standing restriction. If Codeforces reports an authentication/access requirement, the server retries once with a signed request using the acting trainer's saved Codeforces API credentials. Credentials are loaded lazily only for that signed retry and are never returned to the client.

Requests pass through a process-local 2.1-second queue. Each request has a 30-second timeout, a 64 MiB response guard, and one bounded retry for Codeforces rate-limit failures.

## Trainer Codeforces Credentials

Each trainer manages their own Codeforces API key and secret from the classroom contest workbench. The credentials belong to the trainer account, not to a single classroom, so the same trainer can fetch Gym/group/mashup standings across classrooms they manage when their Codeforces account has access.

The server stores only AES-GCM ciphertext plus a short API-key hint in `public.classroom_codeforces_credentials`. Encryption uses a dedicated server-only `CODEFORCES_CREDENTIAL_ENCRYPTION_KEY`; it does not reuse Discord token encryption material or legacy `CODEFORCES_API_KEY`/`CODEFORCES_API_SECRET` deployment secrets. Plaintext is accepted only on save and then cleared from the browser form.

## Codeforces Scoring

`solvedCount` is the number of problem results with positive points. Penalty uses the official row penalty. Without custom problem weights, native points are scaled to the problem-count range with `row.points * problemCount / totalMaximumPoints`. With custom weights, each problem's earned fraction is multiplied by its configured weight. Hack bonuses/penalties are retained using the same overall normalization factor.

## Classroom Identity

Reports merge rows by canonical identities:

- `student:<uuid>` for matched individual students
- `group:<uuid>` for matched classroom groups
- `vjudge:<lowercase-handle>` for unmatched VJudge rows retained for legacy behavior

Codeforces snapshots persist all official rows so trainers can review full standings after fetch. Matching uses verified `cf_id/cf_verified`, provider-specific overrides, exact group names, and unambiguous verified group membership. Generated reports count only mapped Codeforces rows; unmapped rows remain available for mapping, and `ignore` handle overrides intentionally exclude a row from reports.

## Report Keys

New report contest keys use `${provider}:${externalContestId}` to avoid numeric collisions. Reports also store `contestMetaById`, `identityKey`, `providers`, and `sourceHandles`. Legacy reports without those fields continue to use username and bare contest IDs.

## Data Migration

Use expand/deploy/contract:

1. Expand SQL relaxes provider checks, adds/backfills override provider, allows `ignore` handle overrides, and adds the provider-aware unique index while retaining the old index.
2. Expand SQL adds the encrypted trainer Codeforces credential table with RLS enabled and no anon/authenticated grants.
3. Compatible server/client code deploys.
4. Contract SQL drops the old provider-blind override index after the rollback window.

RLS remains enabled and direct Supabase Data API grants are not added.
