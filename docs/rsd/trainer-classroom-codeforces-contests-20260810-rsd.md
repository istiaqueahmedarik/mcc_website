# Trainer Classroom Codeforces Contests RSD

Date: 2026-08-10

## Requirement

Extend the classroom-private contest/report workflow so trainers can add Codeforces contests beside existing VJudge contests in the same classroom contest room. Preserve the global VJudge contest-rank route and all global contest-report persistence.

## Scope

- Classroom contest rooms, items, snapshots, handle overrides, demerits, report generation, sharing, student read-only report views, and the shared `ReportTable` compatibility surface.
- Server-only Codeforces API access for classroom fetches, using encrypted per-trainer credentials when authenticated Gym/group/mashup access is required.
- SQL artifacts for the expand/deploy/contract migration around provider support and provider-specific handle overrides.
- Documentation and knowledge-base updates for durable decisions and review.

## Out Of Scope

- Global contest rooms, public contest reports, saved standings, Toph/BAPS standings, team collection, unauthenticated report sharing, and deployment-wide shared Codeforces credentials.
- Direct Supabase Data API access to classroom contest tables.
- Broad redesign of the trainer classroom contest workbench.

## Functional Requirements

- Contest items accept `provider` values `vjudge` and `codeforces`, defaulting to `vjudge`.
- Existing fetch URL and response envelope remain stable; the server dispatches by stored provider.
- VJudge classroom fetch behavior remains compatible and global `/vjudge/contest-rank` is unchanged.
- Codeforces public regular contests fetch anonymous `contest.standings?contestId=...` first. Gym/group/mashup support uses signed requests with the acting trainer's encrypted Codeforces API key and secret only when authentication is required.
- Trainers can view whether their Codeforces credentials are configured, save/rotate them, and remove them from the classroom contest workbench.
- Codeforces API key/secret plaintext is never returned to the browser; only a short API-key hint and timestamps are exposed.
- Codeforces requests are process-throttled to at most one request per 2.1 seconds, use a 30-second timeout, enforce a 64 MiB response limit, and retry once on rate-limit failure.
- Codeforces snapshots retain all official rows from the fetched standings, while preserving native Codeforces rank, native points, contest phase/frozen state, problem metadata, and upstream participant count.
- Generated classroom reports count mapped classroom identities only. Unmapped Codeforces rows stay available for trainer review and can be mapped to an existing classroom student/group or explicitly ignored.
- Mixed-provider report generation uses canonical identity keys so one student/group can merge across different VJudge and Codeforces handles.
- Contest keys in reports are provider-prefixed, for example `vjudge:123` and `codeforces:123`.
- Saved legacy reports without provider metadata remain readable.
- Changing an item's provider or external contest ID clears obsolete snapshots and resets `last_fetched_at`.

## Data Requirements

- Relax `classroom_contests.provider` check from VJudge-only to `vjudge | codeforces`.
- Add `provider` to `classroom_contest_handle_overrides`, backfill existing rows to `vjudge`, keep physical `vjudge_handle`, and add uniqueness on `(classroom_id, provider, lower(vjudge_handle))` while retaining the old provider-blind index during rollout.
- Add `classroom_codeforces_credentials` with one encrypted credential row per trainer, a short API-key hint, timestamps, and RLS enabled. Store ciphertext only; use a server-only `CODEFORCES_CREDENTIAL_ENCRYPTION_KEY` to encrypt/decrypt.
- Preserve RLS on all public classroom contest tables and add no anon/authenticated grants.

## Interface Requirements

- Update the existing compact workbench with a provider selector, dynamic contest ID/helper text, provider badges, and provider-aware mapping/demerit forms.
- Keep VJudge session controls visible only when needed by VJudge contests.
- Add a Codeforces API credential dialog with instructions linking to Codeforces API settings, encrypted save/clear controls, and status messaging.
- Show actionable Codeforces errors for missing trainer credentials, unusable credentials, missing Gym access, and rate limits without exposing secrets.
- `ReportTable` should prefer mapped classroom profile data and only run legacy VJudge profile lookup for legacy/VJudge rows.
- Preserve keyboard access, visible focus, hit targets, responsive overflow, loading/empty/error states, and existing reduced-motion behavior.

## Acceptance Checks

- Focused server tests cover Codeforces scoring, signing/throttling/error limits, classroom matching/merge behavior, and VJudge regressions.
- Focused client lint/checks cover the changed classroom contest UI and report table.
- SQL artifacts document expand and contract phases with RLS preserved, including the encrypted trainer credential table.
- Knowledge base and implementation review are updated after implementation.
