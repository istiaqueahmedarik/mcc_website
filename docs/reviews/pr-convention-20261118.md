# PR convention review

The user requested a proper title/description convention with an enforced PR check.

Review in this order:

1. CONTRIBUTING.md and .github/pull_request_template.md define author-facing requirements and examples.
2. scripts/pr-convention.mjs owns the pure syntax/content validator and current-metadata status publication. Required headings are exact; comments/fenced examples do not count as substantive prose. Diagnostics never echo arbitrary PR text.
3. scripts/pr-convention.test.mjs covers title variants, null/empty descriptions, placeholders, comments/fences, current-head status, API errors, metadata races, and shared-head PRs.
4. .github/workflows/pr-convention.yml runs trusted default-branch code only, with contents/pulls read and statuses write. All open master PRs reconcile after metadata events, including close/retarget/push, avoiding stale shared-SHA failures. No shell interpolation or PR code execution with write access. Actions are SHA-pinned.
5. .github/workflows/ci.yml runs validator tests in ordinary read-only PR CI, so policy changes themselves receive regression coverage. Knowledge-base entries capture the durable decision.

Validation: 45 Node tests pass across PR convention, contributor policy, and onboarding. git diff --check passes; both workflow YAML documents parse. Read-only delegated security review identified and prompted fixes for null descriptions, fenced-heading parsing, and shared-SHA status cleanup. No application build is needed for these metadata-only changes; regular repository CI still runs on the PR.

Operational boundary: add required status PR convention bound to GitHub Actions integration 15368; preserve all existing rules and the owner's explicit bypass. The new target workflow is absent from master until merge, so no hosted enforcement run is claimed before merge. Owner bootstrap merge activates the workflow and its push event reconciles existing PRs. A status reflects the last processed metadata event, with normal webhook scheduling delay; it cannot guarantee substantive truth. Rollback removes the new required status before reverting implementation.

## 2026-11-19 follow-up

PR #86's required status passed while its `metadata` job failed because the sweep found invalid metadata on other open PRs. Read `.github/workflows/pr-convention.yml` for the triggering PR supplied to `reconcileOpenPullRequests`, then `scripts/pr-convention.mjs` for the job result and per-head status updates. `scripts/pr-convention.test.mjs` exercises unrelated and shared-head failures, repository-wide runs, and API errors.

All 49 policy and onboarding tests passed. A local replay of both workflow scripts used current open PR metadata with mocked GitHub status writes. The proposed script passed the job for #86, reported the other PRs' errors in its summary, and produced the same per-head statuses. Policy push and manual runs still failed on the open metadata errors. The default-branch workflow picks up this behavior on merge and a fresh PR event.
