# Delete an Individual Global Form Response

Status: Draft — proposed defaults below, to be confirmed by the maintainer in PR review
Date: 2026-11-21
Issue: [#63](https://github.com/istiaqueahmedarik/mcc_website/issues/63) (`bug`, `type:bug`)
Contributor: rashed-48

## Goal and delivery boundary

Administrators can remove one submitted response from a global form campaign. Counts, verification attention, and report eligibility then reflect the change. The student's account and profile are untouched.

Campaign deletion (#49), template behavior, trainer/classroom forms, and report scoring formulas are out of scope. This change **requires an additive database migration**: responses are currently immutable by trigger, and profile reviews reference responses with `on delete restrict`. Applying the migration to the hosted database is an owner action that must precede the merge, because merging to `master` deploys automatically.

## Current behavior (verified in code)

- `global_form_response_immutable_trigger` rejects every UPDATE or DELETE on `global_form_responses`. This is error 55000, "Global form responses are immutable".
- `global_form_profile_reviews.response_id` is `not null references global_form_responses(id) on delete restrict`, and it has no index. Reviews are created only when a submission changes the account name. Approval and rejection (`authController.ts`) work by `user_id`. Server code reads `response_id` only to label a response "pending verification".
- The campaign `revision` increases only on response insert (`bump_global_form_campaign_revision`). An update of `revision` fires `mark_global_form_report_cohorts_stale`. That trigger records the new `membership_revision` for every contest room filtering by the campaign and marks published reports stale. Private snapshots derive eligibility freshness from those revisions on read.
- The response list, the Submitted count, and the Needs-verification count are computed live from `global_form_responses`. The admin page refreshes them when the dashboard revision changes.
- The student preview shows a receipt only when a response row exists. `unique (campaign_id, user_id)` allows one response per student per campaign.
- The Next.js `/api/global-forms` proxy already forwards `DELETE`.

## User journey

1. An admin opens a campaign, selects **View** on a response, and chooses **Delete response** in the details dialog.
2. A confirmation dialog names the student, student ID, and submission time. It explains what is removed and what is kept: the account, profile values, and verification status. It also explains that the student may register again while the campaign is open.
3. **Cancel** closes the dialog and changes nothing. **Delete response** disables itself while pending. On success, the dialog closes and the list, counts, and pagination refresh.
4. On failure, the response stays visible and the dialog shows an actionable error with a retry. If the response no longer exists, for example because another admin deleted it, the page refreshes and explains that.

## Requirements

### R1. Server endpoint (AC1, AC4, AC7)

- Add `DELETE /global-forms/manage/campaigns/:id/responses/:responseId` under the existing JWT-protected `/manage/*` routes.
- Recheck the caller with `requireAdmin` (current admin flag from the database). Anonymous callers get 401 and non-admins get 403, with no deletion.
- Delete only where `id = :responseId and campaign_id = :id`, inside one transaction. A missing response or a campaign mismatch returns 404 `RESPONSE_NOT_FOUND`, and nothing is deleted. A repeated request also returns 404. Malformed IDs return the route's existing 400.
- Return the deleted response ID and the campaign's new revision.
- Do not log response contents. The existing route error handler already withholds database error details.

### R2. Database migration (AC4, AC5, AC6)

`docs/sql/global-form-response-deletion-20261121.sql`, with a matching `-rollback.sql`:

1. **Keep responses immutable by default.** UPDATE stays rejected. DELETE is allowed only when the deleting transaction has set the transaction-local setting `mcc.global_form_response_delete` to that row's ID. The server sets it with `set_config(..., true)` immediately before the delete. Any other DELETE, such as an accidental SQL statement, still fails with 55000.
2. **Bump the campaign revision on delete** through an `after delete` trigger, mirroring the insert trigger. The existing revision trigger then updates report membership revisions and marks published reports stale. No report logic changes.
3. **Preserve profile reviews.** Make `global_form_profile_reviews.response_id` nullable with `on delete set null`, and add an index on `response_id`. A review then remains in the admin's pending-user queue and history after its response is deleted.

The migration is additive and safe to re-run. The rollback restores the original trigger and constraint only when no review has a null `response_id`; otherwise it stops with an explanatory error.

### R3. Admin interface (AC1, AC2, AC3, AC7)

- Add a **Delete response** secondary-destructive button to the response details dialog. Per `DESIGN.md`, there is no red button in each table row.
- The confirmation dialog follows the existing template-delete pattern. It has an explicit responsive width, identifies the response, explains the effect, and offers Cancel. The error is shown inside the dialog with readable dark-mode contrast, and focus returns sensibly after close.
- Prevent duplicate activation while the request is pending.
- After success, refresh the campaign, list, and dashboard. If the current page becomes empty and is not page 1, move to the previous page.

### R4. Effects that must not happen (AC5)

- The `users` row is not changed: name, IDs, handles, verification flags, `granted`, and `account_review_origin` stay as they are.
- Profile values saved by the original submission remain.
- Pending profile reviews remain pending and keep working in the admin queue.
- Other campaigns' responses and presence rows are untouched.

### R5. Resubmission policy (AC8)

- After deletion the student has no response for that campaign. While the campaign is **open**, the student's next visit shows the form again and they may submit once more. The existing one-response rule then applies again. When the campaign is **ended**, submission stays closed, as today.
- Document this in the confirmation text and in `docs/features/global-admin-forms.md`.

### R6. Report correctness (AC6)

- A deletion increments the campaign revision, so rooms filtered by the campaign see a membership change. Generated private reports become stale through revision comparison, and published reports are marked stale.
- Published report content is not rewritten. It stays as published and flagged stale until an admin regenerates and republishes it. This preserves historical integrity.

## Decisions requiring approval

1. **Delete lives in the response details dialog**, behind a confirmation dialog, following the `DESIGN.md` destructive-action rule.
2. **Students may resubmit while the campaign is open** (AC8). The alternative is to block resubmission, which would need a persistent tombstone record.
3. **Responses stay immutable** except for one explicitly authorized delete per transaction. Updates remain impossible.
4. **Profile reviews survive** with `response_id` set to null, because they belong to the account rather than the campaign.
5. **No separate deletion audit table.** The issue does not request one. If the owner wants a record of who deleted what, a small `deleted_by`/`deleted_at` log can be added as a follow-up.

## Existing code and why it matters

| Review order | Source | Change boundary |
| --- | --- | --- |
| 1 | `docs/sql/global-form-response-deletion-20261121.sql` (+ rollback) | Guarded delete, revision bump, nullable review FK and index |
| 2 | `server/src/controllers/globalFormController.ts`, `server/src/routes/globalFormRoute.ts` | New admin-only delete handler and route |
| 3 | `server/scripts/verify-global-form-response-deletion.ts` | Real handlers against local `forms_test` |
| 4 | `client/src/app/admin/forms/AdminFormsClient.js` | Details-dialog action, confirmation, refresh |
| 5 | `client/scripts/verify-global-form-response-deletion-browser.mjs` | UI confirmation, cancel, error, and count checks with screenshots |
| 6 | `docs/features/global-admin-forms.md`, `docs/knowledge-base/project-index.md` | Usage, resubmission policy, migration order |

Read-only and unchanged: `authController.ts` review approval and rejection by `user_id`, `globalFormEligibilityService.ts`, and the existing report triggers.

## Verification plan

All database checks run only against the disposable local `forms_test` database. No real responses are deleted.

1. **Migration**: apply to `forms_test`, re-apply idempotently, roll back, and re-apply. Confirm that an unflagged SQL `DELETE` and any `UPDATE` still fail.
2. **Integration (real handlers)**:
   - Anonymous, student, and trainer callers are denied, and nothing is deleted.
   - A campaign-mismatch request is rejected, and both campaigns keep their responses.
   - An admin delete removes exactly one row and increases the revision. The responses API, Submitted count, and Needs-verification count update.
   - A repeated delete returns 404.
   - The user row is unchanged, and a pending profile review survives with `response_id` null. It still appears in `/auth/user/pendings`.
   - A room filtered by the campaign records the new membership revision, and its published report is marked stale with unchanged content.
   - The student can resubmit while the campaign is open but not after it ends.
   - The existing forms, profile-review, reports, and radio scripts still pass.
3. **Browser (local fixtures)**: delete from details, cancel leaving counts unchanged, confirm updating list, counts, and pagination, a simulated server failure keeping the response with a visible error and retry, duplicate-click prevention, and dark-mode error contrast. Capture screenshots.
4. Server `bun test`, client lint, and `npm run build`.

## Rollout

1. The owner reviews and applies `docs/sql/global-form-response-deletion-20261121.sql` to the hosted database **before merging**. The previous application version keeps working with the migration applied, because it never deletes responses.
2. Merge. Auto-deploy ships the new endpoint and UI.
3. Rollback: revert the application first, then run the rollback SQL. The rollback refuses to restore the strict foreign key while any review has a null `response_id`.

## Acceptance summary

The fix is complete when AC1–AC8 and the issue's Gherkin scenarios are demonstrated with the evidence above, existing forms behavior is unchanged, and a PR titled `#63: …` passes CI and review. Approval covers local implementation and verification only, not hosted migration or deployment.
