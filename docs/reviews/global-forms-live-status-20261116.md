# Forms live status recovery

## Finding and scope

The user's screenshot showed loaded responses and a permanent Connecting label. Campaign/response/count reads use ordinary REST requests, while status was controlled only by a separate EventSource. The client had no first-message deadline, no stalled-message detection, and no automatic REST fallback. It also treated open HTTP headers as proof of fresh data. These code paths explain how the screenshot state can persist.

The deployed request/proxy path was not available for inspection. Edge buffering, routing, a stalled upstream, or delayed database work remain possible transport causes, rather than confirmed diagnoses. The existing Next proxy already forwards the response body and anti-buffering headers. This change does not claim to repair or verify a particular production proxy.

## Reviewer path

1. `client/src/app/admin/forms/live-campaign-updates.mjs` owns the connection lifecycle. A valid stats event proves Live; opening headers alone does not. Fifteen seconds without first/subsequent stats starts serialized five-second REST refreshes, each bounded to ten seconds. EventSource keeps its native reconnection; valid recovery stops polling and cancels/ignores an older pending refresh. Failed refreshes preserve last data and show Offline. Authorization or campaign disappearance stops activity. Visibility/unmount cleanup closes the stream, aborts requests, clears timers, and discards late results.
2. `AdminFormsClient.js` uses that lifecycle for the existing admin-authorized dashboard endpoint. Counts reconcile immediately; a changed revision refreshes responses with an abort signal. The live status is announced politely and distinguishes Live, Auto-refresh, Offline, Paused, and Access changed. No authentication, database, or server-stream behavior is changed.
3. `live-campaign-updates.test.mjs` covers ten lifecycle cases with controlled timers. The loopback-only HTTP fixture and browser script exercise the actual Next proxy and client with synthetic data and a deliberately silent SSE stream. They do not contact a real database, judge, or hosted account.

| Before | After | Why |
| --- | --- | --- |
| Connecting can remain forever | First/last valid-message deadline and automatic refresh fallback | Keep data updating when the stream is held or unavailable |
| Opening a connection marks Fresh | Only valid stats mark Live | Headers do not prove delivery of current counts |
| Stream failure only changes a label | Serialized requests recover counts and changed response rows | Display state reflects a working update mechanism |
| No stalled-stream or recovery test | Timed lifecycle tests plus real Next proxy browser fixture | Cover the failure condition rather than only healthy local SSE |

## Verification

- 10 Node lifecycle tests passed: pending/open-without-stats, healthy stats and later silence, recovery, failed refresh, request timeout, authorization revocation, malformed stats, hidden/cleanup behavior, and a late cancelled poll racing a new fallback.
- Actual browser/Next proxy fixture: 5 grouped checks passed with no page errors. Ordinary rows load while stats are withheld; Connecting expires; a new response arrives through polling; SSE recovery shows Live and stops polling; authorization revocation shows Access changed and stops further refreshes. The mobile layout has no page-level horizontal overflow.
- Client lint: zero errors, nine existing unrelated warnings.
- Production client build passed. The combined lifecycle and safe-return-path run passed all 12 tests.

Screenshots and compact results: `global-forms-live-status-20261116-assets/`. Only synthetic accounts are shown. No production data was copied into evidence. No hosted changes were made; the precise deployed transport cause remains unverified.

## Reproduction

Run `node --test client/src/app/admin/forms/live-campaign-updates.test.mjs` with Node 22+. For the browser check, start `bun server/scripts/serve-global-forms-live-fixture.ts`, then the existing Next client on port 55443 with `SERVER_URL` and `NEXT_PUBLIC_SERVER_URL` pointing to `http://127.0.0.1:55441`. Use the local synthetic Supabase environment from the forms QA guide. Run `PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs node client/scripts/verify-global-forms-live-status.mjs`. The fixture is loopback-only and accepts only its explicitly synthetic bearer token. No new dependency or database migration is required.

## User follow-up: remove connection card

Removed the Live status card and its state/labels/icons from AdminFormsClient. The three remaining metrics fill the row on larger screens and stack on small screens. Background SSE and polling continue; the controller callback is optional. Browser verification no longer depends on removed labels. Earlier screenshots and status-label evidence above describe the previous revision.

Removal verification: client lint passed with zero errors and nine existing warnings; all ten lifecycle tests passed. Updated browser script was syntax-checked; browser checks and screenshots above were not rerun for this removal.
