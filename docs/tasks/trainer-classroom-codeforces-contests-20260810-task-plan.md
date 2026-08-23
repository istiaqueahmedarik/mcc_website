# Trainer Classroom Codeforces Contests Task Plan

Date: 2026-08-10

## Tasks

1. Add RSD, technical decision package, task plan, SQL expand/contract artifacts, and final implementation review.
2. Add provider adapter services for VJudge and Codeforces with normalized rank contracts.
3. Implement Codeforces signing, throttling, timeout, response limit, scoring normalization, official-row filtering, and classroom-only matching.
4. Add encrypted per-trainer Codeforces credential storage, status/save/delete APIs, lazy credential loading for signed Gym/group/mashup fetches, and clear missing/unusable credential errors.
5. Extend classroom contest controller create/update/fetch/generate/mapping/demerit logic for providers, provider-prefixed contest keys, canonical identities, report metadata, full Codeforces snapshots, ignored handles, and snapshot invalidation.
6. Update SQL for provider constraints, provider-aware handle override uniqueness, ignored handle overrides, and encrypted trainer credential storage while preserving RLS.
7. Update Next proxy behavior only as needed for provider-specific headers and credential-management verbs.
8. Update `ClassroomContestPanel.jsx` with provider selector, dynamic labels, provider badges, provider-aware mapping/demerit forms, unmapped Codeforces row map/ignore controls, VJudge-only session controls, and Codeforces credential instructions/save/clear UI.
9. Update `ReportTable.js` for stable identity keys, provider badges/links, mapped classroom profile preference, and legacy VJudge lookup fallback.
10. Add focused Bun tests for Codeforces service normalization, lazy credential fetching, credential encryption, and classroom report merge helpers.
11. Run focused server/client verification, `git diff --check`, and record any blockers.
12. Update knowledge-base memory and implementation review for reviewer handoff.

## Review Flow

Review in this order:

1. SQL artifacts and durable docs.
2. Provider services and tests.
3. Credential encryption utility and classroom credential endpoints.
4. Classroom contest controller data flow.
5. Next proxy compatibility.
6. Trainer workbench UI.
7. Shared report table compatibility.
8. Knowledge-base and implementation review.
