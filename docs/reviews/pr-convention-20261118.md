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
