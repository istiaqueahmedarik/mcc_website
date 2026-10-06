# Trainer Student Thread Instant Realtime RSD

Status: Approved
Task ID: trainer-student-thread-instant-realtime-20260802
Owner: Codex / Arik
Last updated: 2026-08-02
Delivery mode: Auto — explicitly approved by the user on 2026-08-02

## Mode and Gate Policy

The user approved this RSD and explicitly requested full-auto delivery on 2026-08-02. The required RSD, technical-decision/ADR, task-plan, and implementation-review artifacts still must be created and reviewed in order, but the user's instruction supplies advance approval to continue through those gates without pausing. Destructive or out-of-scope remote actions remain prohibited.

Current gate:

- Primary RSD approved by the user on 2026-08-02.
- Full-auto continuation approved by the user on 2026-08-02.
- Technical decisions and ADR-0011 approved under the user's full-auto instruction on 2026-08-02.
- Full task plan and dependency graph approved under the user's full-auto instruction on 2026-08-02.
- Implementation may proceed.
- No source code, database schema, remote Supabase configuration, or live data has been changed for this task.

## Problem Summary

The trainer/student thread is not instant because a Realtime event only starts a long invalidation path. A receiving browser currently calls a Next.js server action, which calls the Hono API, which repeats authorization and thread-provisioning queries before loading the saved message. The hot read path also performs `INSERT ... ON CONFLICT DO NOTHING`, so reads create unnecessary database work.

The review also found correctness, reliability, and security defects that become more visible when latency rises:

- A message can be committed between the initial history snapshot and the Realtime subscription, and Broadcast has no replay to recover it.
- Reconnect/rejoin does not perform cursor-based catch-up, so messages sent while disconnected can remain missing.
- Broadcast is fire-and-forget and its failure is neither awaited nor durably recovered.
- Rapidly selecting another student does not cancel or invalidate older requests; old messages or responses can appear under the newly selected student's heading.
- Text-message persistence and attachment-message persistence are not consistently grouped into short database transactions.
- Channel rows are repeatedly inserted, can remain duplicated, expire after six hours, and are not renewed for a continuously open page.
- Browser subscriptions use public channels. Opaque topic names reduce discoverability but are not authorization and do not prevent a party that knows a topic from subscribing or spoofing events.
- Remaining classroom Updates/pre-enrollment request paths can execute runtime DDL and add seconds to cold page loads.
- Message pagination sorts by `(created_at, id)` but does not carry both values in the cursor, so equal timestamps can skip records.
- `client_message_id` is metadata only, so a retry can create a duplicate message.

## Evidence Baseline

The 2026-08-02 review established the following baseline:

- Supabase Realtime REST Broadcast accepted test events in approximately 0.9–3 ms.
- Relevant PostgreSQL statements were generally below 1 ms on the current small dataset.
- `pg_stat_statements` recorded 234 thread `INSERT ... ON CONFLICT DO NOTHING` calls while the database contained only 2 thread rows and 22 messages.
- The active channel registry contained duplicate active rows for the same user and scope.
- Live PostgreSQL logs showed remaining startup/request-time schema work taking roughly 2.7 seconds in sequence.
- The thread tables and channel registry had RLS enabled and direct `anon`/`authenticated` DML was unavailable, but 50 other exposed `public` tables were reported without RLS and with direct public-role privileges. That project-wide exposure is a separate critical security task; this task must not make it worse.

The observed service/database timings indicate that most perceived delay is in the application request chain and lifecycle design, not in Supabase Broadcast or indexed row lookup.

## Goal

Make trainer/student messaging feel immediate on healthy connections and remain correct across initial subscription, reconnect, retry, rapid student switching, and broadcast failure. Preserve the existing product model: one thread per active classroom student, trainer/manager authorization, student membership authorization, private attachments, bounded history, `Updates` as the default classroom tab, and no hidden polling.

## User-Visible Latency Targets

- A sender must see a local pending state within 100 ms of submitting a valid text message.
- For a healthy subscribed receiver on a normal network, a committed text message must render without a per-message HTTP refetch, targeting commit-to-render p50 at or below 250 ms and p95 at or below 750 ms.
- A committed attachment message must meet the same notification/render target after object upload and metadata commit; upload transfer time itself is excluded.
- After a Realtime subscribe or reconnect succeeds, missed messages must catch up within 1 second on a normal network.
- Measurements must be based on timestamped two-session tests rather than visual judgment alone.

These are application targets, not guarantees for offline clients or impaired networks. Offline clients must recover correctly after reconnection rather than silently lose messages.

## Requirements

### Fast Delivery

- The normal healthy-connection receive path must deliver the canonical persisted message representation through the realtime event and must not require browser → Next.js → Hono → PostgreSQL refetching for each message.
- Realtime publication must occur only after the message and its required relational metadata are committed.
- A manager-level realtime signal must update the trainer thread list for activity in selected and unselected student threads without polling.
- Payloads must be minimal and must not include service credentials, private storage paths, signed URLs, unrelated profile data, or authorization-only fields.

### Authorization and Privacy

- Thread and manager subscriptions must be private and authorized. Knowledge of a topic name must not be enough to receive or publish classroom events.
- A student may subscribe only to their own active classroom thread. Trainers, owners, substitutes, and admins may subscribe only where existing server authorization permits management.
- The browser must never receive a Supabase `service_role`/secret key.
- Any short-lived Realtime credential must be least-privilege, safely scoped, and must not grant broader Data API or Storage access. In particular, it must not rely on privileges that expose the 50 currently unsafe public tables.
- Realtime payloads must be treated as untrusted at the UI boundary and validated for event type, classroom, thread, message identity, sender identity, and allowed fields before state is updated.
- Thread tables, channel/authorization state, and `realtime.messages` policies must follow current Supabase RLS and privilege guidance. Changes to Supabase-owned `realtime` schema objects are prohibited except supported policies on `realtime.messages`.

### Gap-Free and Idempotent Behavior

- The initial snapshot/subscription sequence must not lose a message committed in between those operations.
- Every successful subscribe and reconnect must perform bounded cursor-based catch-up.
- Catch-up and history pagination must use a stable total-order cursor containing both `created_at` and `id`.
- Duplicate realtime delivery, retry, catch-up overlap, and optimistic reconciliation must render each persisted message once.
- Client retries must use a server-enforced idempotency key so one logical send cannot create duplicate persisted messages.
- Broadcast failure must be observable, must not roll back an already committed message, and must be recoverable through catch-up.

### Persistence Consistency

- Text message insert and thread summary/revision update must commit in one short database transaction.
- Attachment message insert, attachment metadata insert, and thread summary/revision update must commit in one short database transaction after object upload.
- External storage calls must not occur while database locks are held.
- If storage upload succeeds but the database transaction fails, the implementation must attempt cleanup and record/report any orphan that cannot be removed.
- Broadcast must run after commit and have bounded error handling and telemetry; unobserved `void` fire-and-forget publication is not acceptable.

### Read and Authorization Performance

- Reading an existing thread or message must not provision/upsert a thread or perform other writes.
- Thread provisioning must occur at an explicit lifecycle point or write path and remain race-safe.
- The receive/catch-up authorization path must eliminate avoidable serial database round trips and N+1-like permission queries while retaining the current role and active-membership rules.
- Normal trainer thread opening must avoid unnecessary sequential list-then-thread waterfalls where data can safely be requested together or in parallel.
- Existing indexes must support actual authorization, thread-list, message-cursor, and idempotency query shapes; new indexes require query-plan or workload justification.

### Browser State Correctness

- Selecting a different student must immediately clear or isolate the prior thread's visible messages.
- Older in-flight requests and events must be aborted or ignored using a stable request/thread generation identity.
- No message, composer state, pending indicator, or error from thread A may be shown as belonging to thread B.
- The UI must expose calm connecting, reconnecting, offline, send-pending, and failed-send states without adding interval polling.

### Channel Lifecycle

- The chosen authorization/channel model must not accumulate duplicate active channel records for the same user and scope.
- A page left open longer than the credential/channel lifetime must renew or reauthorize before expiry without silently stopping delivery.
- Logout, membership removal, role loss, and classroom access revocation must stop future delivery within the documented token/session lifetime.
- If the existing registry is retained, issuance must reuse or supersede scoped rows and cleanup must be bounded. If it is replaced, obsolete rows and code must have a safe cleanup/rollback path.

### Schema and Operations

- User-facing classroom requests must not execute `CREATE`, `ALTER`, `DROP`, extension setup, or index DDL.
- Remaining classroom Updates and pre-enrollment schema guards must move to the repository's approved SQL/migration delivery workflow before this task is complete.
- The solution must provide latency instrumentation with correlation/message IDs and lifecycle timestamps for send request, database commit, publish acknowledgement/failure, receive, catch-up, and render.
- Telemetry must not log message bodies, solution code, private attachment paths, access tokens, or secrets.
- Required manual Supabase SQL, dashboard configuration, environment changes, and deployment ordering must be documented with verification and rollback steps.

## Acceptance Criteria

- [ ] Two authenticated browser sessions demonstrate sender pending feedback at or below 100 ms.
- [ ] Two-session measurements meet commit-to-render p50 ≤ 250 ms and p95 ≤ 750 ms for text messages under healthy test conditions, with the test method and sample count recorded.
- [ ] The healthy receive path renders a canonical committed message without a per-message HTTP refetch.
- [ ] A message committed during initial snapshot/subscription setup appears exactly once.
- [ ] Messages sent while a receiver is disconnected appear exactly once within 1 second after successful reconnect on a normal network.
- [ ] A forced publish failure is observable, does not lose the committed message, and is repaired by reconnect/catch-up.
- [ ] Duplicate events, repeated sends with the same idempotency key, and catch-up overlap do not create or render duplicate messages.
- [ ] Equal-timestamp messages paginate and catch up without gaps by using `(created_at, id)`.
- [ ] An unauthorized student, unrelated trainer, anonymous client, and client that only knows the topic are denied subscription and publication.
- [ ] The browser bundle/config contains no Supabase service or secret key, and its Realtime credential cannot query the exposed application tables or private Storage objects.
- [ ] Rapid A → B → A student selection under delayed responses never shows one student's messages, pending state, or errors under another student's identity.
- [ ] Text-message persistence and attachment metadata persistence pass transaction/failure-path tests; storage cleanup behavior is recorded.
- [ ] Broadcast happens after commit and has explicit acknowledgement/error telemetry rather than unobserved fire-and-forget execution.
- [ ] Existing thread reads perform no `INSERT ... ON CONFLICT` or other writes; before/after statement counts and representative timings are recorded.
- [ ] Authorization/catch-up queries avoid the current chain of serial role, manager, membership, thread-upsert, and message requests; the final query count is recorded.
- [ ] Trainer list activity updates for unselected threads without polling.
- [ ] A session held open beyond the configured channel/token lifetime continues receiving after renewal, and access revocation stops subsequent delivery within the documented bound.
- [ ] Source inspection and request/database logs show no runtime classroom DDL.
- [ ] Existing text, attachments, submission-reference bubbles, system events, bounded older-history loading, Updates, and Settings behavior remain intact.
- [ ] Targeted client/server checks pass, and Supabase advisors, policies/grants, logs, and relevant `pg_stat_statements` evidence are reviewed after deployment.

## Non-Goals

- Do not redesign the Threads interface beyond states required for correct realtime behavior.
- Do not add interval polling, visibility polling, or periodic full-thread refreshes.
- Do not allow direct browser writes to application tables or direct browser access to private attachment objects.
- Do not expose message content through public Realtime channels.
- Do not expose service-role credentials or convert the browser to a privileged Supabase client.
- Do not revive or migrate legacy problem-thread UI/data.
- Do not broadly rewrite classroom APIs or authentication outside the smallest architecture needed for secure private Realtime.
- Do not fix all 50 project-wide RLS/privilege findings in this task. They require a separate critical security RSD, but this task may add narrowly required least-privilege roles/policies and must prove it does not widen exposure.
- Do not upgrade Supabase packages solely because newer versions exist unless the technical decision identifies a required fix and verifies compatibility.

## Constraints

- Preserve MCC JWT-secured server APIs and current trainer/student authorization semantics unless a separately approved technical decision introduces a compatible short-lived Realtime credential bridge.
- Use current Supabase Realtime APIs and supported `realtime.messages` policies; the 2026-07-14 Supabase change forbids modifying other objects in the `realtime` schema.
- Keep database transactions short and exclude network/storage calls from transaction scope.
- Preserve private attachment behavior and bounded message/event history.
- Use existing Next.js/React, Hono/Bun, PostgreSQL, and Supabase dependencies unless an approved decision justifies a change.
- Preserve unrelated worktree changes and avoid destructive remote changes.

## Required Technical Decisions After Approval

The technical-decision gate must resolve, without implementing yet:

- How an MCC-authenticated browser obtains a short-lived, least-privilege credential accepted by Supabase private Realtime without gaining unsafe Data API access.
- Whether committed canonical events are sent by database Broadcast, an awaited server REST Broadcast, or another supported Supabase mechanism, including acknowledgement and failure recovery.
- Whether the current channel registry is retained and repaired or replaced by stable private topics and policy-backed authorization.
- The monotonic thread revision/cursor model used for initial synchronization, reconnect catch-up, ordering, and deduplication.
- The exact transaction and storage-compensation design for attachment sends.
- The migration/SQL workflow, deployment order, rollback, and how current ADR-0008/ADR-0010 decisions about opaque invalidation are superseded or amended.

## Risks and Dependencies

- MCC JWT identities are not assumed to be Supabase Auth identities. A naive `authenticated` Supabase token could widen access because the project has unrelated exposed tables without RLS; least-privilege credential isolation is a hard requirement.
- Database Broadcast and private-channel policies must follow the current supported API and the Realtime schema lock-down.
- Broadcast is intentionally not a durable queue. Correctness therefore depends on persisted revisions/cursors and catch-up, not on assuming every event arrives.
- Object storage cannot participate in the PostgreSQL transaction, so failed database writes require explicit best-effort object cleanup and observability.
- Live latency depends on client network and region. Acceptance must record test conditions and distinguish commit-to-render latency from attachment upload time.
- Authenticated two-browser testing requires valid trainer and student sessions and may require an approved remote Supabase change after the technical and task-plan gates.
- The separate 50-table public-schema exposure is a critical security dependency to track independently; it must not be hidden by declaring only the thread tables safe.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: RSD-first workflow, approval gates, review standards, and security checklist.
  Confidence: High
- Source: existing student-thread RSDs, ADR-0008, ADR-0010, technical decisions, task plan, and implementation reviews
  Used for: established product model, server-authorized APIs, bounded history, no-polling rule, and prior opaque-invalidation choice.
  Confidence: High
- Source: live Supabase MCP database, advisors, logs, and Realtime tests reviewed on 2026-08-02
  Used for: service/database timings, repeated read-path upsert evidence, active channel duplication, RLS/privilege findings, and runtime DDL timing.
  Confidence: High
- Source: Supabase Broadcast, Realtime Authorization, subscribing to database changes, Realtime protocol, benchmarks, and RLS documentation reviewed on 2026-08-02
  Used for: private-channel authorization, Broadcast delivery behavior, supported database/REST publication, and RLS design constraints.
  Confidence: High
- Source: Supabase changelog reviewed on 2026-08-02
  Used for: the 2026-07-14 Realtime schema lock-down and current compatibility constraints.
  Confidence: High
- Source: Supabase PostgreSQL best-practice references
  Used for: eliminating serial/N+1 query work, total-order keyset pagination, idempotent constraints, short transactions, RLS/least privilege, and `pg_stat_statements` verification.
  Confidence: High

## Approval Request

The user approved this primary RSD and full-auto continuation on 2026-08-02. The technical-decision package must document and resolve the required choices before implementation.
