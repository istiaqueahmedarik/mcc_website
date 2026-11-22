# Global forms and registration campaigns

Administrators open **Admin → Forms** to customize templates, create campaigns, share registration links, and review responses. This feature is separate from classroom forms.

## Using the feature

1. Open **Templates**. Choose **Customize** on TFC Registration or General to make an editable copy, or create a new template. Add/reorder questions and choose which answers complete missing profile fields. Preview the template before use. Question types are short text, long text, number, date, select (dropdown), radio buttons, and checkbox. A **Radio buttons** question shows every option and accepts exactly one; it needs at least two options (one per line) that do not look the same ignoring case and spacing, and it always collects a custom answer rather than a profile field. Editable templates have a **Delete** action with confirmation. Deleting a template keeps all existing campaigns and responses; built-in starters remain available.
2. Create a campaign from the template. A share-link slug is generated automatically. **Start** opens registration; **End** closes new submissions. On an ended campaign, **Resume** reopens the same registration link with its existing questions and responses. Existing registrants keep their receipt and cannot submit twice; students without a response can register. The original start time is retained and the end time is cleared until the campaign ends again. **Clone campaign** creates a new draft with the same questions and no responses.
3. Share `/register/<slug>`. Students must sign in. The login returns to the campaign. Existing profile values appear in the preview; required missing or invalid data is collected before agreement and submission.
4. Check the agreement, then select **Confirm registration**. The single normal submit button supports keyboard submission and disables while the request is pending. A response is submitted once per account/campaign. Retrying a successful request recovers its receipt. CF/VJudge changes remain pending in the ordinary admin verification queue; a registration receipt does not mean an OJ handle is verified.
5. Select a campaign to see responses, response detail, search, pagination, and safe CSV export of the displayed page. The dashboard updates approximately every five seconds while visible. **Live** means recent valid stream messages. If streaming stalls for fifteen seconds, **Auto-refresh** uses ordinary requests every five seconds until the stream recovers. **Offline** retains the last known values while retrying; **Access changed** stops updates and asks you to reload/sign in. Hidden pages pause update activity. “Currently completing” is approximate: one student with recent visible-page activity, deduplicated across sessions, expiring after sixty seconds. No unfinished answers are sent to the dashboard.
6. To remove one unwanted or incorrect registration, open its **View** details and choose **Delete response**, then confirm. The confirmation shows the student, student ID, and submission time; **Cancel** returns to the details unchanged. Deletion removes only that response: the student's account, saved profile details, verification status, and any pending profile review are kept. Counts, pagination, and verification attention update immediately, and contest reports filtered by the campaign become stale (published reports keep their content until regenerated). **Resubmission policy:** while the campaign is open, the student sees the form again and may register once more; after the campaign ends, they cannot. A response already removed by another admin is reported and the list refreshes.
7. On a contest room under `/contests_report/details/<id>`, choose the registration campaign and **Apply filter**. Generate the report to rank the registered students found in the provider standings. Existing provider source snapshots are reused when available. New registrations make old generated/published filtered reports stale; regenerate before publishing again. If contest inputs or student mappings changed too, use **Refresh** with provider access first. A form filter cannot clear a source invalidation or a failed-provider warning.

New accounts follow the existing signup/approval process. The registration link can be reopened after account approval. Profile edits from the registration preview include a return link to the campaign.

## Installation and rollout

Use the repository's existing client/server setup. This feature adds no package dependency or environment secret. Existing `DATABASE_URL`, JWT `SECRET`, and the client's `SERVER_URL` are required. Streaming requests must reach the server without proxy buffering; the Next proxy sends `X-Accel-Buffering: no`.

Before deploying the matching server/client code, review and apply these additive SQL artifacts to the intended database, in order:

1. `docs/sql/global-admin-forms-20261115.sql`
2. `docs/sql/global-form-report-eligibility-20261115.sql`
3. `docs/sql/global-forms-review-followup-20261115.sql`
4. `docs/sql/global-form-response-deletion-20261121.sql` — required before the response-deletion server version (issue #63). Older application versions keep working with it applied.

They assume the existing users, contest rooms, scoring configuration, and saved source-snapshot migrations are already installed. New feature tables are server-owned, with RLS enabled and no PUBLIC/anon/authenticated table grants. Do not grant browser access to these tables to make the dashboard work; the authenticated API supplies its data.

Existing numeric student-ID storage is retained. Form fields treat IDs as text and validate a canonical nine-digit representation; leading-zero IDs are rejected because numeric storage would discard those digits. Existing historical IDs are not rewritten. Existing signup/admin-import policies otherwise remain outside this feature's scope.

For this follow-up, restore the preceding application version before applying `global-forms-review-followup-20261115-rollback.sql`. For full feature rollback, follow with the report-eligibility rollback, then the global-forms rollback. Back up campaign/response data first: the forms rollback removes feature tables. The rollback refuses to remove profile-review provenance while profile changes are pending. Cohort snapshots are marked stale before eligibility metadata is removed, so older code must regenerate before republishing.

Response deletion keeps responses immutable by default: updates are always rejected, and a delete succeeds only for the single row the server authorizes inside the same transaction. To roll it back, restore the preceding application version first, then run `global-form-response-deletion-20261121-rollback.sql`. Deleted responses are not restored, and the rollback refuses to run (changing nothing) once any profile review has lost its deleted response; keep the migration applied in that case.

## Reproducing local verification

Use a **disposable local PostgreSQL database named `forms_test`**. The verification scripts refuse hosted/non-loopback database URLs. `server/tests/fixtures/global-forms-baseline.sql` is a minimal synthetic test baseline, not a production bootstrap.

After applying that fixture, the existing saved report/source migrations, and both feature migrations, run from the repository root:

```bash
DATABASE_URL=<disposable-local-forms_test-url> bun server/scripts/verify-global-forms.ts
DATABASE_URL=<disposable-local-forms_test-url> bun server/scripts/verify-global-form-reports.ts
```

`server/scripts/verify-global-form-response-deletion.ts` checks response deletion: role and campaign-mismatch denial, counts, account and profile-review preservation, report staleness, and the resubmission policy. `client/scripts/verify-global-form-response-deletion-browser.mjs` checks the confirmation, cancel, failure, duplicate-click, and refresh behavior against the local fixtures.

`server/scripts/verify-global-form-profile-review.ts` adds ordinary name-edit review reconciliation, historical proposal repair, and safe template deletion checks.

The first exercises real Hono handlers, transactions, heartbeat expiry, safe profile rejection, role boundaries, and SSE revocation. The second seeds synthetic provider snapshots and verifies cohort generation/publication without contacting providers. Both create synthetic accounts only. `server/scripts/serve-global-forms-fixtures.ts` can serve the same handlers on loopback port 55441 for browser QA, with explicitly synthetic `@forms.invalid` accounts.

The [implementation review](../reviews/global-admin-forms-20261115-implementation-review.md) records exact checks and rollout boundaries. No hosted migration or deployment was performed as part of implementation.

The post-merge corrections, migration behavior, current single-button interaction, dialog measurements, and screenshots are recorded in `docs/reviews/global-forms-review-followup-20261115.md`. Historical hold-control screenshots are superseded by this follow-up.

Live-stream fallback behavior and transport-fixture reproduction: `docs/reviews/global-forms-live-status-20261116.md`. This protects dashboard updates if a hosting layer holds the stream; inspect the deployed request/proxy separately to identify the underlying transport cause.

### Connection indicator removal (2026-11-16)

The dashboard no longer displays a Live status card or connection-mode labels. Submitted, Currently completing, and Needs verification remain visible. Background streaming and automatic refresh continue. This supersedes the visible status-label descriptions above.
