# Trainer Student Thread Realtime Hardening and Performance Technical Decisions

Status: Approved
Task ID: trainer-student-thread-realtime-hardening-performance-20260802
Last updated: 2026-08-02
Delivery mode: Manual

## Gate State

Satisfied gates:
- Primary RSD approved by the user on 2026-08-02.

Current gate:
- Technical-decision package and ADR-0010 approved by the user on 2026-08-02.
- Awaiting user approval of the full task plan and dependency graph before source-code implementation.

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-student-thread-realtime-hardening-performance-20260802-rsd.md`
  Used for: approved hardening/performance scope.
  Confidence: High
- Source: `docs/decisions/trainer-student-classroom-threads-realtime-20260731-technical-decisions.md`
  Used for: preserving server-authorized APIs and opaque Realtime invalidation.
  Confidence: High
- Source: `docs/adr/0008-classroom-student-thread-realtime-model.md`
  Used for: durable student-scoped classroom thread model.
  Confidence: High
- Source: Supabase MCP `get_advisors` security/performance on 2026-08-02
  Used for: confirming disabled RLS on student-thread tables, duplicate indexes, and missing FK indexes.
  Confidence: High
- Source: Supabase MCP SQL inspection on 2026-08-02
  Used for: confirming no thread-table policies, broad anon/authenticated grants, existing private attachment bucket, existing `student_id` column, and current indexes.
  Confidence: High
- Source: Supabase Realtime docs
  Used for: private channels requiring Realtime Authorization on `realtime.messages`, and public channels being subscribable without authentication.
  Confidence: High
- Source: Supabase RLS docs and Supabase Postgres best-practice skill references
  Used for: RLS in exposed schemas, RLS performance, FK indexes, composite/partial indexes, and lock minimization.
  Confidence: High
- Source: Supabase changelog 2026-07-14
  Used for: avoiding direct Supabase-owned `realtime` schema modification other than allowed policies.
  Confidence: High
- Source: `server/src/utils/classroomStudentThreadsSchema.ts`
  Used for: current runtime DDL, storage, broadcast, and attachment validation implementation.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: current thread APIs, insert/broadcast ordering, and repeated topic-assignment DDL.
  Confidence: High
- Source: `client/src/components/ClassroomThreadsTab.js`
  Used for: current full-refetch behavior and selected-thread-only realtime.
  Confidence: High
- Source: `client/src/hooks/useClassroomThreadRealtime.js`
  Used for: current public Supabase channel subscription setup.
  Confidence: High
- Source: `client/src/lib/action.js`
  Used for: cached server-action helpers used by the live thread component.
  Confidence: High

## Context

The prior approved architecture deliberately used Supabase Realtime as opaque invalidation rather than sensitive payload transport. The implementation still left two real issues:

- The channel topic was stable and public, so guessing or leaking that topic exposed thread activity timing and allowed spoofed invalidation.
- Public-schema thread tables were reachable through broad Supabase grants while RLS was disabled.

The current app's MCC JWT is signed by the app's own `SECRET` and does not include Supabase-required `role`/`exp` claims. The repo also has no `supabase/` migration directory. Therefore, a true private Supabase Realtime auth bridge is possible only as a larger auth integration, not as a safe hotfix.

## Decisions

### TD-001: Protect Student-Thread Tables With RLS and Revoked Browser Roles

Decision:
Enable RLS on:

- `public.classroom_student_threads`
- `public.classroom_student_thread_messages`
- `public.classroom_student_thread_attachments`

Revoke all direct table privileges from `anon` and `authenticated` on those three tables. Do not create permissive browser policies. Keep server access through the existing trusted Postgres connection and server-only Supabase service/secret key paths.

Options considered:
- Write full Supabase Auth RLS policies that mirror MCC classroom authorization.
- Move the tables to a private schema.
- Enable RLS and revoke browser roles while keeping all thread reads/writes behind MCC APIs.

Rationale:
The app does not use Supabase Auth as its application auth source, and React does not need direct Data API access to these tables. A deny-by-default browser posture closes the immediate exposure without duplicating classroom authorization in RLS.

Tradeoffs:
Supabase Data API access to these tables will intentionally stop working for browser roles. Any future direct Supabase client access needs a new approved auth/RLS design.

Security impact:
Closes the thread-table RLS advisor findings for this feature scope. Does not solve broader public-schema RLS findings outside this task.

Manual action:
After task-plan approval, Codex can apply the approved SQL through Supabase MCP. If Arik prefers manual deployment, Codex will provide the exact SQL instead.

ADR required: Yes, as part of ADR-0010.

### TD-002: Replace Stable Public Thread Topics With Server-Issued Scoped Realtime Topics

Decision:
Stop using the persistent `classroom_student_threads.realtime_token` as the browser channel. Add a server-issued Realtime channel registry for authorized sessions, with scoped channel rows such as:

- `thread`: one authorized active panel subscription for a specific user/thread.
- `manager_list`: one authorized trainer/admin/manager list subscription for a classroom.

Channel names remain opaque and privacy-preserving, but are generated per authorized API response, scoped to the requesting user and classroom/thread, and expire/clean up opportunistically. Broadcast fan-out sends opaque invalidations only to active scoped channels instead of one permanent thread topic.

Options considered:
- Keep the existing stable public channel.
- Switch directly to Supabase private channels with an app-minted Supabase JWT.
- Add a server-issued scoped channel registry as an immediate mitigation.

Rationale:
Supabase private channels are the best long-term answer, but the current MCC JWT is not a Supabase Auth/third-party-auth token. Minting Supabase-compatible JWTs would require a separate signing-key integration and careful auth review. Scoped public topics remove the stable long-lived topic leak now while preserving Supabase Realtime delivery and opaque payloads.

Tradeoffs:
This is still a bearer-topic model, not true Supabase Realtime Authorization. If a scoped topic leaks, an attacker can receive opaque invalidations until that topic expires or is rotated. They still cannot fetch content through MCC APIs.

Security impact:
Reduces exposure from permanent per-thread public channels to short-lived/scoped opaque channels. Does not send private content in payloads.

Manual action:
No Supabase dashboard private-channel policy is required for this hotfix. A future true private-channel bridge will need separate approval and likely Supabase Auth third-party/custom JWT configuration.

ADR required: Yes.

### TD-003: Keep True Supabase Private Realtime as a Future Auth Integration

Decision:
Do not add `SUPABASE_JWT_SECRET`, do not expose service-role keys to the browser, and do not silently change MCC login tokens into Supabase access tokens in this hotfix.

Options considered:
- Sign custom Supabase Realtime JWTs from the app server.
- Register MCC JWTs as third-party Supabase Auth tokens.
- Defer private channel auth until a dedicated auth integration is approved.

Rationale:
Supabase docs support private channels with authenticated JWTs, but the current MCC token lacks required Supabase claims and is not configured as a Supabase-trusted token. A rushed bridge could accidentally grant broader Supabase `authenticated` role access to unrelated public-schema data.

Tradeoffs:
The immediate fix remains an improved bearer-topic mitigation rather than full Supabase Realtime Authorization.

Security impact:
Avoids introducing a new cross-auth trust boundary without enough design/testing.

ADR required: Yes.

### TD-004: Move Thread DDL to Approved SQL and Remove It From Hot Paths

Decision:
Create a versioned SQL deployment artifact for this fix and apply it through Supabase MCP or manual SQL after task-plan approval. Remove student-thread `CREATE/ALTER/CREATE INDEX` work from normal request handlers. Remove the repeated `ALTER TABLE classroom_team_topic_assignments ADD COLUMN IF NOT EXISTS student_id uuid` from topic-assignment read paths.

Options considered:
- Keep cached runtime DDL guards.
- Initialize a full Supabase local migration workflow now.
- Use a focused SQL deployment artifact because this repo has no existing `supabase/` migration directory.

Rationale:
Runtime DDL takes catalog locks, creates cold-start latency, and was visible in Supabase Postgres logs. The repo does not yet have a local Supabase migration workflow, so a focused SQL artifact plus MCP-applied remote migration is the least disruptive path.

Tradeoffs:
Fresh local/dev databases must run the SQL before using student-thread features. The implementation review must state this clearly.

Security impact:
Reduces lock/DDL risk in user-facing requests.

ADR required: No.

### TD-005: Use Lightweight Message and Summary Fetches After Realtime Signals

Decision:
Add targeted server APIs for:

- Fetching one authorized thread message by `message_id`.
- Fetching one authorized thread summary by student/thread.

On active-thread signals with a `message_id`, the client fetches only that message and appends/merges it. On manager-list signals, the client fetches only the affected thread summary and updates the list. Full thread/list refresh remains for initial load, explicit refresh, older-message paging, reconnect recovery, and unknown/invalid signals.

Options considered:
- Continue full page refetch on every signal.
- Send full message payloads through Realtime.
- Fetch only the changed authorized data through MCC APIs.

Rationale:
This preserves the opaque-Realtime architecture while removing most of the observed latency after broadcasts.

Tradeoffs:
One or two small endpoints are added. Missed broadcast recovery still requires explicit refresh or reconnect-triggered full refresh.

Security impact:
Changed content still comes only from MCC JWT-secured APIs.

ADR required: No.

### TD-006: Add Trainer List Realtime Without Per-Student Fanout Subscriptions in the Browser

Decision:
Use one scoped `manager_list` channel per authorized classroom manager list view. When any student thread in that classroom changes, broadcast an opaque list invalidation containing only identifiers and timestamps needed to fetch the affected summary through the MCC API.

Options considered:
- Subscribe the trainer browser to every student thread.
- Refetch the full thread list after any selected-thread signal.
- Add one manager-list channel and targeted summary fetch.

Rationale:
One list channel avoids many browser subscriptions and fixes the missing unselected-thread update behavior.

Tradeoffs:
Server broadcast fan-out must include both active thread channels and active manager-list channels.

Security impact:
List payloads remain opaque and only manager-authorized clients receive the channel topic from the server.

ADR required: No.

### TD-007: Broadcast Attachment Messages Only After Attachment Metadata Exists

Decision:
Split message insertion from broadcast emission. Text messages can broadcast after the message row is saved. Attachment messages should upload the file, insert the message and attachment metadata together in a short DB transaction, then broadcast once after the saved message can be fetched with attachment metadata.

Also stop creating a second `attachment_shared` system event for ordinary file shares unless a future requirement explicitly wants audit-style event bubbles for uploads.

Options considered:
- Keep current immediate message broadcast and second system event.
- Broadcast twice: once for message, once for attachment.
- Broadcast once after message plus attachment metadata are ready.

Rationale:
The current order creates a race where recipients can refetch before attachment metadata exists. One final broadcast is both faster and more correct.

Tradeoffs:
If storage upload succeeds but DB insertion fails, a storage object can still be orphaned. Cleanup can be added later, but this hotfix focuses on visible race correctness.

Security impact:
Attachment access remains server-authorized and signed.

ADR required: No.

### TD-008: Add Thread-Matched Indexes and Remove Duplicate Index Work

Decision:
Apply index changes that match current thread query shapes:

- Drop the duplicate `classroom_student_threads_classroom_student_idx` and rely on `classroom_student_threads_unique_student`.
- Add an index on `classroom_student_threads(student_id)` for the student FK/advisor finding.
- Replace the message thread index with `(thread_id, created_at DESC, id DESC)`.
- Replace the broad event index with a partial system-message index on `(thread_id, created_at DESC, id DESC) WHERE kind = 'system'`.
- Add partial FK indexes for nullable `sender_id` and `uploader_id`.
- Add a topic-assignment lookup index for `(classroom_id, topic_id, status)` to support `getStudentIdsForAssignedTopic`.

Options considered:
- Only remove duplicate index.
- Add every advisor-suggested index across the whole schema.
- Add only indexes tied to this task's observed thread paths.

Rationale:
The fix should address thread latency without opening a broad database-tuning project.

Tradeoffs:
New indexes add small write overhead. Because current thread volume is small, unused-index advisors may stay noisy until real traffic accumulates.

Security impact:
No direct security impact.

ADR required: No.

### TD-009: Use Scoped Uncached Thread Fetch Helpers Instead of Reworking All Server Actions

Decision:
Add or use thread-specific uncached server-action helpers for classroom thread GET/POST/FormData calls, with `cache: 'no-store'` passed correctly in the `fetch` options. Do not remove `cache()` from the global `get_with_token` / `post_with_token` helpers in this hotfix.

Options considered:
- Rewrite all authenticated API calls to Next route proxies.
- Remove React `cache()` globally from shared helpers.
- Add scoped live/thread helpers and use them in `ClassroomThreadsTab.js`.

Rationale:
The shared action helpers are used across many unrelated pages. A scoped helper fixes the live thread path without broad behavior churn.

Tradeoffs:
The thread UI still uses the Next server-action layer instead of direct browser fetch to a route proxy. The largest latency wins come from removing DDL and full refetches.

Security impact:
JWT stays in server-side cookies and is not exposed to React.

ADR required: No.

### TD-010: Treat Local Secret Exposure as Operational Manual Risk

Decision:
Do not paste or document secret values. Add a manual note that if local `.env` files containing service-role/database credentials were ever committed, shared, or uploaded, Arik should rotate the Supabase service/secret key and database password.

Options considered:
- Rotate keys automatically.
- Ignore local secret exposure.
- Document the manual operational risk.

Rationale:
Key rotation can break deployments and requires owner coordination. The safe coding behavior is to avoid printing secrets and call out the risk.

Tradeoffs:
The user remains responsible for deciding whether these local secrets were exposed outside the machine.

Security impact:
Prevents accidental secret disclosure in artifacts/final messages.

ADR required: No.

## Proposed ADR

- `docs/adr/0010-classroom-student-thread-realtime-hardening.md`

## Manual Actions Expected After Later Approval

- Codex can apply the approved SQL through Supabase MCP after the task plan is approved, unless Arik asks to run it manually.
- If Arik runs SQL manually, Codex will provide the exact SQL artifact and verification queries.
- No attachment bucket creation is expected; Supabase MCP confirmed `classroom-thread-attachments` exists and is private.
- If local env files were ever shared/committed, rotate service-role/secret/database credentials before treating this as production-safe.

## Gate Request

Manual-mode technical-decision gate was approved by the user on 2026-08-02. Proceed to the full task plan and dependency graph gate.
