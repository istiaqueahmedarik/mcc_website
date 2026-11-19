# PR metadata convention

User authorization: add a PR check and create a proper title/description convention (2026-11-18).

Outcome: contributors receive a default template and actionable automated feedback. Titles follow typed Conventional Commit-style syntax. Descriptions contain Problem, Changes, Validation, and Review notes with actual detail. Owner authority and all other branch protections remain intact.

Scope: pure Node validator, targeted metadata workflow, unit tests in ordinary read-only CI, template, contributor documentation, and one additional required GitHub Actions status. No application or database changes.

Acceptance: valid titles/bodies pass; invalid types, absent/null descriptions, untouched templates, duplicate/missing/empty sections, fenced/comment-only content fail. Metadata edits rerun without commits. Fork code is never executed with statuses:write. Current PR head receives status; concurrent metadata/head changes cannot intentionally reuse a stale validation snapshot. Shared-head PRs are evaluated together. Genuine API failures fail the job and do not publish success.

Validation: focused Node tests plus existing policy/onboarding regressions; static workflow/security review. Live workflow activation occurs on merge. Default branch remains master. Rollback: remove the required status first, then revert workflow/template/validator/docs.

## Follow-up for PR #86

The signup PR passed its required `PR convention` status while the metadata job appeared red because older open PRs had invalid titles or descriptions. Reconcile all open PRs as before. For a PR event, report job failure only for the triggering PR's validation, including any open PRs sharing its head commit. Base pushes and manual reconciliation still report repository-wide failures. Verify all three outcomes with mocked GitHub metadata and preserve the trusted workflow checkout.
