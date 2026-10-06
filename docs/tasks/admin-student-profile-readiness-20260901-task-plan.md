# Admin Student Profile Readiness Task Plan

Status: Approved
Task ID: admin-student-profile-readiness-20260901
Owner: Codex
Last updated: 2026-09-01

## Sequence

1. Record the approved RSD, technical decisions, task plan, and knowledge-base scope.
2. Add the admin-authorized read query and classroom route.
3. Add the authenticated Next.js proxy and guarded admin page.
4. Build the readiness chart, field-gap view, URL-backed controls, row preview, and safe CSV export.
5. Add the admin navigation entry.
6. Verify live query classification/counts, authorization source, lint/build, responsive/reduced-motion behavior, and export structure.
7. Record the implementation review and final knowledge-base entries.

## Verification Focus

- Admin authorization and minimal returned profile data
- Batch-label normalization and blank-label student-ID fallback
- Summary/row count agreement and zero-count batch behavior
- CSV escaping, spreadsheet formula neutralization, and filtered export parity
- Keyboard/focus semantics, URL state, loading/error/empty states, mobile overflow, dark mode, and reduced motion

## Rollback

Revert only this task's server, client, navigation, and documentation changes. No schema migration exists.

