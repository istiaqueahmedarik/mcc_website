# Global Codeforces Identity Resolution RSD

Date: 2026-09-19
Status: Approved by user request

## Problem

Global Codeforces report rows currently use the provider handle as the participant identity. That is insufficient for Codeforces group contests where the group-visible username may differ from the Codeforces handle saved on the MCC account. The report must identify the MCC student without changing any scoring mathematics.

## Requirements

- Let trainers classify a Codeforces source as Public, Gym, Group, or EDU when adding it.
- Keep VJudge entry behavior unchanged.
- Resolve Public, Gym, and EDU participants by the Codeforces handle saved on an eligible MCC student account.
- For Group contests, support either:
  - a username suffix convention where the numeric text after the last `=` is the MCC student ID, for example `g21927=202314022`; or
  - a CSV with the exact headers `username,student_id`.
- Let trainers replace a Group contest's identity rule or CSV later.
- Resolve student IDs to exactly one eligible MCC account and persist the immutable `users.id`, not the uploaded CSV or a mutable display name.
- Display the MCC full name with student ID underneath while retaining the original Codeforces handle for provider links and audit.
- Never silently merge an ambiguous or unresolved participant into an MCC student.
- Keep report scoring, formulas, weights, merges, and demerit mathematics unchanged.

## Data Design

Add provider configuration to `Contest_room_contests`:

- `codeforces_source_type`: `public`, `gym`, `group`, or `edu` for Codeforces rows.
- `codeforces_group_identity_mode`: `student_id_suffix` or `csv` for Group rows.

Add `contest_report_codeforces_identity_mappings`:

- `contest_item_id` references the room contest and cascades on contest deletion.
- `provider_username` preserves the bounded group-visible spelling.
- `provider_username_normalized` is the lower-case lookup key.
- `student_user_id` references the immutable MCC `users.id` and restricts user deletion.
- `created_by` and `updated_by` record the admin actor.
- Unique constraints prevent duplicate usernames or duplicate MCC students within one contest.

The mapping table is service-only: enable and force RLS, revoke Data API roles, and do not create public policies.

## Resolution Rules

1. Exclude admin, trainer, and pre-enrolled placeholder accounts.
2. Public/Gym/EDU: match `lower(trim(users.cf_id))` to the returned Codeforces handle and accept only a unique account.
3. Group suffix: take the text after the last `=`, require digits, normalize leading zeroes, match `users.mist_id`, and accept only a unique account.
4. Group CSV: normalize the returned username and look up the stored `student_user_id` mapping.
5. Enrich matched rank rows with `identityKey=student:<users.id>`, MCC full name, MCC student ID, saved Codeforces handle, and the original provider handle.
6. Leave unmatched rows separate under their provider identity and return bounded identity warnings. Never guess when lookup is missing or ambiguous.

## Input and Mutation Safety

- Accept UTF-8 CSV up to 512 KiB and 5,000 data rows.
- Require exactly usable `username` and `student_id` columns; reject duplicate usernames, duplicate student IDs, invalid numeric IDs, missing MCC accounts, and ambiguous MCC accounts.
- Parse and validate on the server. The Next.js action only transports bounded text.
- Replace mappings atomically in one database transaction so a failed upload leaves the prior mapping intact.
- Do not log CSV contents, student IDs, provider usernames, or provider credentials.

## Interface Direction

- Human context: an admin/trainer configuring an operational report before generation.
- Primary sequence: provider, source type, source, identity rule, contest name.
- Visual language: existing semantic tokens, borders and surface shifts without new shadows, compact labels, 44 px controls, visible focus, and inline errors.
- Signature element: a small mapping-contract preview showing provider username to student ID to MCC profile.
- Avoid a large wizard, generic dashboard cards, or hidden post-submit errors.
- Mapping replacement uses a clearly labelled form and reports the currently active rule.

## Verification

- Unit tests for explicit Codeforces Public/Gym/Group/EDU normalization.
- Unit tests for suffix extraction, CSV parsing, duplicate detection, and rank-row enrichment.
- Transactional controller coverage where feasible, plus static migration review.
- Existing Codeforces fetch and contest scoring suites.
- Targeted client lint, server bundle, client production build, and diff review.

## Rollback

Deploy the rollback SQL to remove the mapping table and the two configuration columns, then revert the matching server/client code. Existing report snapshots and scoring configuration remain unchanged.
