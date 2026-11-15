# Global admin forms — implementation review

Date: 2026-11-15
Scope: approved `docs/rsd/global-admin-forms-20261115-rsd.md`
Decision record: `docs/adr/20261115-global-admin-forms.md`
Final integration branch: `codex/global-admin-forms`

## Outcome and review order

An administrator can customize TFC or General templates, create/start/end/clone a registration campaign, share its link, and review authenticated responses and approximate activity. Students reuse their own profile, supply missing required data, review and agree, and receive one durable receipt per campaign. Profile changes keep ordinary verification effects. Global contest reports can select that campaign's respondents before scoring and publish the same cohort that the admin sees.

Review the implementation in the order below; each layer establishes the rules used by the next.

### 1. Data identity, immutability, and campaign lifecycle

- `docs/sql/global-admin-forms-20261115.sql`: templates, frozen campaign definitions, immutable responses, `(campaign_id,user_id)` uniqueness, receipts, pending profile review, presence, and revision triggers. Built-in starters are retained; customization works on copies. RLS and PUBLIC/anon/authenticated revokes keep all feature rows behind the server API.
- `server/src/services/globalFormService.ts`: bounded field definitions, stable/unique IDs, profile mapping allowlist, required checks, real calendar dates, finite numbers, valid select options, and profile preview versions. Existing mapped values are authoritative; only missing/invalid values enter the profile mutation set.
- `server/src/controllers/globalFormController.ts` and `server/src/routes/globalFormRoute.ts`: fresh account/role checks, body limits, template CRUD/clone, campaign lifecycle/clone, minimal public metadata, owned student previews, and atomic submission. User and campaign locks protect concurrent profile edits and close/submit races. Duplicate requests return their existing receipt without rewriting data.
- `server/src/index.ts`: mounts the new isolated `/global-forms` router. Existing classroom form policy is unchanged.

### 2. Profile persistence and safe administrator review

- `server/src/utils/basicProfile.ts` and its tests: shared canonical nine-digit student-ID validation. Legacy numeric storage is retained, so leading-zero representations are rejected rather than silently shortened.
- `server/src/controllers/userController.ts` and `server/src/utils/classroomPreEnrollment.ts`: the normal self-service ID update shares validation; pre-enrollment claims can use the same transaction as form submission.
- `server/src/controllers/authController.ts`: pending name completions carry a profile-review origin and prior/proposed values. Accept/reject recheck current state; rejection restores the prior name, including null, and retains the account/registration. Repeated stale rejection cannot become account deletion. Existing signup rejection remains a distinct flow.
- `client/src/app/admin/dashboard/AdminDashboardClient.js`: visible profile-update badge, previous name, explicit approve/reject-update actions, account-retention message, and successful list reconciliation. Removed the row-data console dump in this changed flow.

New CF/VJudge values are saved with their verified flag false. Existing verified values are never rewritten or reset by a complete-profile registration. Dashboard verification badges are current state; submitted profile/answer snapshots remain historical records.

### 3. Student sign-in, preview, completion, and receipt

- `client/src/lib/safe-return-path.mjs`, its tests, `client/src/app/login/page.js`, and `client/src/lib/action.js`: allowlisted internal registration return paths, with ordinary login retaining its default destination. External, encoded, protocol-relative, and unrelated return targets are rejected.
- `client/src/app/register/[slug]/`: minimal signed-out context, login prompt, eligible-account preview, compact saved-profile summary, editable missing fields, pending-verification labels, agreement, semantic Enter submission, focused validation errors, recoverable stale/closed states, and receipt. Browser drafts tolerate disabled storage.
- `client/src/app/profile/page.js`: adds an allowlisted return-to-registration link when opened from a campaign.

### 4. Admin workspace and live counts

- `client/src/components/Navbar.js`: one Forms entry in the shared Admin tool list supplies desktop/mobile navigation.
- `client/src/app/admin/forms/`: template field editing/reordering/mapping, starter customization, preview/clone, campaign create/start/end/clone, URL-backed selection/search/page state, response detail, and CSV export of the displayed page. Historical submitted profile values take precedence in response display/export. The campaign rail is bounded on mobile and desktop.
- `client/src/app/api/global-forms/[...path]/route.js`: forwards the HTTP-only cookie as a bearer token, preserves query strings, disables caching, passes request cancellation upstream, and streams SSE without JSON buffering.
- Server SSE reconciles counts approximately every five seconds and rechecks current admin permission. Visible student sessions heartbeat every twenty seconds and expire after sixty seconds. Active students are deduplicated; submitted/ended campaigns do not count as currently completing. Session rows are capped per user/campaign, and stale presence is cleaned up without a global scan on every heartbeat. No partial answers enter presence or stream messages.

### 5. Canonical report eligibility, cached sources, and publication

- `docs/sql/global-form-report-eligibility-20261115.sql`: persisted room campaign selection, membership/selection versions on saved and published snapshots, and staleness on campaign revision changes.
- `server/src/services/globalFormEligibilityService.ts`: resolves submitted account IDs and intersects them with existing canonical `student:<id>` provider identities. It does not join response handle strings or names. Empty cohorts remain empty; unmapped/nonrespondent participants are counted explicitly. No-filter mode returns the original source map.
- `server/src/controllers/contestRoomController.ts`: applies eligibility after the existing provider identity mapping and before the unchanged scoring pipeline. Cohort-only regeneration reuses unfiltered saved provider inputs. Publish checks current membership/selection under locks and rejects stale generations. Linked TFC values for TSC remain fixed to the referenced published report.
- `server/src/services/globalContestReportSnapshotService.ts`: compares current eligibility versions on reads and validates them when committing regenerated snapshots. Raw source data remains unfiltered for restoring the full cohort.
- `server/src/routes/contestRoomRoute.ts`, `client/src/actions/contest_details.js`, and `client/src/app/contests_report/details/[id]/`: authorized selector, persisted selection and status, generated cohort context/counts, and consistent report/export/publication. An existing saved report can be opened without reconnecting a provider merely to apply a cohort.

### 6. Interface craft review

The implementation uses project typography/tokens, Radix controls, translucent glass chrome, and CSS/opaque fallbacks. It introduces no new Three.js renderer or package dependency. Glass is an optional material layer; form text and dense response data retain stable backing surfaces.

| Before review | After integration | Why |
| --- | --- | --- |
| Sticky agreement overlapped a focused field | Agreement follows the form in normal flow | Focused input and error text stay unobscured |
| Repeated cards for every known profile fact | Compact saved-profile summary | Complete-profile review is faster on laptops |
| First live response could leave the response list empty | Revision 0→1 triggers reconciliation | Counts and rows agree without manual refresh |
| Native select labels included option text | Explicit generated label/control IDs | Controls have concise accessible names |
| Long campaign lists pushed mobile responses far below navigation | Bounded rail and two-column metrics | Campaign selection and responses remain reachable |
| Starter Edit attempted an immutable update | Customize creates and opens an editable copy | The action succeeds while retaining recoverable starters |

Local Chrome checks covered laptop/mobile layouts, keyboard-compatible forms, reduced motion, forced colors, and absence of page-level horizontal overflow. Safari, physical mobile devices, low-power GPU behavior, and hosted reverse-proxy streaming were not tested.

## Verification evidence

- Focused Bun suites: **42 passing**, covering form/profile validation, eligibility, saved snapshot revisions, scoring, and formulas.
- Safe return-path Node tests: **2 passing**.
- Actual disposable Postgres + Hono form checks: **41 passing**. Includes permission boundaries, invalid historical IDs, exact ID validation, two concurrent submissions sharing one receipt, known verified handles unchanged, campaign end/clone, stale preview, profile rejection retaining the account, repeated rejection, SSE data minimization, admin-role revocation, presence dedup/expiry, and RLS/grants.
- Actual disposable Postgres report checks: **17 passing**. Includes generated-slug campaigns, canonical eligibility/ranking, no-filter compatibility, source-cache regeneration with network fetch forbidden, empty cohorts, raw source preservation, staleness triggers, consistent publication, and restoring all participants.
- Migrations applied and reapplied locally; both rollback artifacts executed successfully on a separate disposable database. A profile-origin pending account makes forms rollback refuse with the intended error.
- Server production entry bundled successfully with Bun: **819 modules**, without starting the production scheduler.
- Full client lint: **0 errors, 9 existing warnings**, matching the pre-change baseline.
- Combined client production build: **passed** (Next.js 16.1.1 webpack build, TypeScript check, and route generation).
- Real Next.js/Hono browser checks with synthetic accounts: login return; missing-data preview; receipt; two-session first-response update; starter customization; question addition/edit; optional number left empty; campaign create/start/end; complete-profile submission; mobile overflow; reduced-motion/forced-colors fallback. Report browser checks applied a campaign and rendered its recalculated saved-source cohort at laptop/mobile widths. No browser page errors were observed.

Retained screenshots contain synthetic fixture data only:

- [Student preview](global-admin-forms-20261115-assets/student-preview.png)
- [Live admin response](global-admin-forms-20261115-assets/admin-live-response.png)
- [Mobile templates](global-admin-forms-20261115-assets/templates-mobile.png)
- [Campaign report](global-admin-forms-20261115-assets/report-cohort.png)

## Rollout and verification boundary

No hosted migration, deployment, external judge request, real student response, or real verification action was performed. Browser/API evidence uses actual application handlers with synthetic local data; report source data was seeded rather than fetched from Codeforces/VJudge.

Apply the global-forms SQL before report-eligibility SQL and deploy matching client/server code together. Existing underlying report/source migrations must already be installed. Verify admin/non-admin access and unbuffered SSE through the actual hosting stack. Roll back eligibility before forms, back up responses first, and resolve pending profile reviews before removing provenance. See `docs/features/global-admin-forms.md` for use/setup and local verification entry points.
