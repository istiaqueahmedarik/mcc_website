# Global forms and registration campaigns

Administrators open **Admin → Forms** to customize templates, create campaigns, share registration links, and review responses. This feature is separate from classroom forms.

## Using the feature

1. Open **Templates**. Choose **Customize** on TFC Registration or General to make an editable copy, or create a new template. Add/reorder questions and choose which answers complete missing profile fields. Preview the template before use. Editable templates have a **Delete** action with confirmation. Deleting a template keeps all existing campaigns and responses; built-in starters remain available.
2. Create a campaign from the template. A share-link slug is generated automatically. **Start** opens registration; **End** closes new submissions. **Clone campaign** creates a new draft with the same questions and no responses.
3. Share `/register/<slug>`. Students must sign in. The login returns to the campaign. Existing profile values appear in the preview; required missing or invalid data is collected before agreement and submission.
4. Check the agreement, then select **Confirm registration**. The single normal submit button supports keyboard submission and disables while the request is pending. A response is submitted once per account/campaign. Retrying a successful request recovers its receipt. CF/VJudge changes remain pending in the ordinary admin verification queue; a registration receipt does not mean an OJ handle is verified.
5. Select a campaign to see responses, response detail, search, pagination, and safe CSV export of the displayed page. The dashboard updates approximately every five seconds while visible. “Currently completing” is approximate: one student with recent visible-page activity, deduplicated across sessions, expiring after sixty seconds. No unfinished answers are sent to the dashboard.
6. On a contest room under `/contests_report/details/<id>`, choose the registration campaign and **Apply filter**. Generate the report to rank the registered students found in the provider standings. Existing provider source snapshots are reused when available. New registrations make old generated/published filtered reports stale; regenerate before publishing again. If contest inputs or student mappings changed too, use **Refresh** with provider access first. A form filter cannot clear a source invalidation or a failed-provider warning.

New accounts follow the existing signup/approval process. The registration link can be reopened after account approval. Profile edits from the registration preview include a return link to the campaign.

## Installation and rollout

Use the repository's existing client/server setup. This feature adds no package dependency or environment secret. Existing `DATABASE_URL`, JWT `SECRET`, and the client's `SERVER_URL` are required. Streaming requests must reach the server without proxy buffering; the Next proxy sends `X-Accel-Buffering: no`.

Before deploying the matching server/client code, review and apply these additive SQL artifacts to the intended database, in order:

1. `docs/sql/global-admin-forms-20261115.sql`
2. `docs/sql/global-form-report-eligibility-20261115.sql`
3. `docs/sql/global-forms-review-followup-20261115.sql`

They assume the existing users, contest rooms, scoring configuration, and saved source-snapshot migrations are already installed. New feature tables are server-owned, with RLS enabled and no PUBLIC/anon/authenticated table grants. Do not grant browser access to these tables to make the dashboard work; the authenticated API supplies its data.

Existing numeric student-ID storage is retained. Form fields treat IDs as text and validate a canonical nine-digit representation; leading-zero IDs are rejected because numeric storage would discard those digits. Existing historical IDs are not rewritten. Existing signup/admin-import policies otherwise remain outside this feature's scope.

For this follow-up, restore the preceding application version before applying `global-forms-review-followup-20261115-rollback.sql`. For full feature rollback, follow with the report-eligibility rollback, then the global-forms rollback. Back up campaign/response data first: the forms rollback removes feature tables. The rollback refuses to remove profile-review provenance while profile changes are pending. Cohort snapshots are marked stale before eligibility metadata is removed, so older code must regenerate before republishing.

## Reproducing local verification

Use a **disposable local PostgreSQL database named `forms_test`**. The verification scripts refuse hosted/non-loopback database URLs. `server/tests/fixtures/global-forms-baseline.sql` is a minimal synthetic test baseline, not a production bootstrap.

After applying that fixture, the existing saved report/source migrations, and both feature migrations, run from the repository root:

```bash
DATABASE_URL=<disposable-local-forms_test-url> bun server/scripts/verify-global-forms.ts
DATABASE_URL=<disposable-local-forms_test-url> bun server/scripts/verify-global-form-reports.ts
```

`server/scripts/verify-global-form-profile-review.ts` adds ordinary name-edit review reconciliation, historical proposal repair, and safe template deletion checks.

The first exercises real Hono handlers, transactions, heartbeat expiry, safe profile rejection, role boundaries, and SSE revocation. The second seeds synthetic provider snapshots and verifies cohort generation/publication without contacting providers. Both create synthetic accounts only. `server/scripts/serve-global-forms-fixtures.ts` can serve the same handlers on loopback port 55441 for browser QA, with explicitly synthetic `@forms.invalid` accounts.

The [implementation review](../reviews/global-admin-forms-20261115-implementation-review.md) records exact checks and rollout boundaries. No hosted migration or deployment was performed as part of implementation.

The post-merge corrections, migration behavior, current single-button interaction, dialog measurements, and screenshots are recorded in `docs/reviews/global-forms-review-followup-20261115.md`. Historical hold-control screenshots are superseded by this follow-up.
