# Forms post-merge follow-up

Status: Approved by the user's review-fix request and subsequent post-merge instructions on 2026-11-15.
Base: `master` at `7427e6d`; implementation branch: `codex/forms-review-followup`.

- [x] Read PR #44 review and preserve all four corrections in the post-merge scope.
- [x] Separate source invalidation from eligibility freshness, retain provider failures, and reject stale report generations at commit.
- [x] Reconcile pending name proposals during ordinary profile edits and repair historical mismatches.
- [x] Preserve raw option textarea drafts until save.
- [x] Add editable-template deletion with confirmation and retained campaigns/responses.
- [x] Give forms dialogs explicit responsive widths, usable controls, and mobile input sizing.
- [x] Replace hold/mode-choice controls with one normal submit button.
- [x] Run local unit, API/database, browser, migration/reapply/rollback, and lint checks.
- [x] Complete final production client build.
- [x] Commit/push and create [PR #45](https://github.com/istiaqueahmedarik/mcc_website/pull/45) targeting `master`.

Reviewer path, measured checks, current screenshots, and rollout limits: `docs/reviews/global-forms-review-followup-20261115.md`. No hosted migration or deployment is included.
