# Delete an individual global form response

Scope: [issue #63](https://github.com/istiaqueahmedarik/mcc_website/issues/63). Requirements and proposed decisions: `docs/rsd/global-form-response-deletion-20261121-rsd.md`. The change starts from `master` commit `60b4fc4`. It includes one additive migration and no new dependency or environment variable.

## Reviewer path

1. **Migration: `docs/sql/global-form-response-deletion-20261121.sql`.**
   - `reject_global_form_response_mutation` still rejects every UPDATE. A DELETE is accepted only when `old.id` equals the transaction-local `mcc.global_form_response_delete` setting. A plain, bulk, or wrong-row delete still raises 55000. This guards against accidents by trusted roles; grants and RLS remain the access boundary.
   - A new `after delete` trigger increments the campaign revision, mirroring the existing insert trigger. The existing `mark_global_form_report_cohorts_stale` trigger then updates `membership_revision` for filtered rooms and marks published reports stale without changing their JSON.
   - `global_form_profile_reviews.response_id` becomes nullable with `on delete set null` (the constraint name was verified as `global_form_profile_reviews_response_id_fkey`), and a new index covers that lookup. Reviews belong to the account: approval and rejection use `user_id`, so the admin pending queue is unaffected.
   - The rollback refuses to run, changing nothing, once a review has lost its response.
2. **Endpoint: `globalFormController.ts` `deleteResponse` and `globalFormRoute.ts`.**
   - `DELETE /global-forms/manage/campaigns/:id/responses/:responseId` sits under the existing JWT `/manage/*` middleware.
   - In one transaction: `requireAdmin` (database flag), then `set_config(..., true)` for that response ID, then `delete ... where id = :responseId and campaign_id = :id`.
   - No match (mismatch, already deleted, or repeat) returns 404 `RESPONSE_NOT_FOUND` and deletes nothing. A malformed UUID reaches the route's existing 400 handler.
   - The response returns the deleted ID and the new revision.
3. **Integration: `server/scripts/verify-global-form-response-deletion.ts`.** This uses real handlers and the local-only guard. It covers:
   - anonymous, student, and trainer denial
   - campaign mismatch, a malformed ID, and a single-row delete with a revision increase limited to that campaign
   - list, total, and dashboard updates, and a repeated 404
   - a byte-identical `users` row
   - a room eligibility `membership_revision` update and a published report marked stale with unchanged JSON
   - no receipt, then resubmission while open and 409 after end
   - a pending name review kept pending with a null `response_id`, still in `/auth/user/pendings`, with the campaign verification count dropping 1 → 0
4. **Admin UI: `client/src/app/admin/forms/AdminFormsClient.js`.**
   - **Delete response** is an outline button with destructive text, placed in the response details dialog rather than a red button in each table row, per `DESIGN.md`.
   - Choosing it closes the details and opens one confirmation dialog, so dialogs never stack. The confirmation shows the student, ID, and submission time and three effect lines. Cancel or Escape returns to the details.
   - `deleteResponse` uses a ref plus `saving` to block duplicate activation before re-render. A failure shows an in-dialog `role="alert"` and keeps the response. `RESPONSE_NOT_FOUND` closes, refreshes, and explains.
   - After success, the page steps back one page if its only row was removed. Focus moves to the response search, since the originating View button no longer exists.
   - The page's existing Next proxy already forwards DELETE.
5. **Browser checks: `client/scripts/verify-global-form-response-deletion-browser.mjs`.** These follow the existing forms browser script and its loopback/synthetic guards. Dark mode is checked in a context where the theme is stored before load, as `next-themes` does for users. Evidence is in `global-form-response-deletion-20261121-assets/`.
6. **Docs.** The RSD, `docs/features/global-admin-forms.md` (usage, resubmission policy, migration order, rollback), and the project index.

## Decisions for maintainer review

1. Delete lives in response details, behind a confirmation dialog.
2. Students may resubmit while the campaign is open (AC8). Blocking resubmission would need a persistent tombstone.
3. Responses stay immutable except for one explicitly authorized delete per transaction.
4. Profile reviews survive with a null `response_id`.
5. There is no separate deletion audit table. One can be added if the owner wants a record of who deleted what.

## Interface audit

| Before | After | Why |
| --- | --- | --- |
| No way to remove a response | Delete response in details, then a confirmation dialog | Issue #63 |
| — | Confirmation identifies the response and states what is kept | AC2, AC5, AC8 |
| — | In-dialog error, retry, already-removed refresh | AC7 |

Dialogs use the existing explicit widths, tokens, and focus behavior. The dark-mode error uses the page's existing `dark:text-red-300` (rgb 252,165,165 on rgb 14,16,22).

## Verification

All database work ran only against the disposable local `forms_test` database. No hosted database or real response was touched.

| Check | Result |
| --- | --- |
| Migration applied twice; rolled back; re-applied | Passed |
| Migration behavior SQL (rolled back): plain, update, wrong-row, and bulk deletes rejected; authorized single delete; revision scope; review kept | 7 checks passed |
| Rollback refusal with an orphaned review (discarded transaction) | Stopped with an explanatory error; schema unchanged |
| `verify-global-form-response-deletion.ts` (new) | 29 checks passed |
| `verify-global-forms.ts` / `verify-global-form-profile-review.ts` / `verify-global-form-reports.ts` | 41 / 21 / 25 passed |
| Server `bun test` | 113 passed, 14 files |
| `bunx tsc --noEmit` on changed server files | No errors other than the repository-wide TS6059 `rootDir` notice that every `server/scripts/*.ts` file receives |
| ESLint on changed client files and browser script | Clean |
| `npm run build` | Passed |
| `verify-global-form-response-deletion-browser.mjs` (new) | 7 grouped checks passed, no page errors (Chromium 1248, production build) |

Not verified: screen readers, Safari/Firefox, physical mobile devices, and the hosted migration or deployment.

## Rollout and limits

1. The owner applies `docs/sql/global-form-response-deletion-20261121.sql` to the hosted database **before merging**, because merge auto-deploys. The previous application version is unaffected by it, since it never deletes responses.
2. Rollback: restore the previous application version, then run the rollback SQL. It refuses to run once any review has a null `response_id`. Deleted responses cannot be restored.
3. `ALTER TABLE` on `global_form_profile_reviews` briefly takes a table lock. The table is small.
