# Trainer Student Thread Instant Realtime Technical Decisions

Status: Approved under the user's 2026-08-02 full-auto instruction
Task ID: trainer-student-thread-instant-realtime-20260802
Last updated: 2026-08-02
Delivery mode: Auto

## Gate State

Satisfied gates:

- Primary RSD approved by the user on 2026-08-02.
- Full-auto continuation explicitly approved by the user on 2026-08-02.
- This technical-decision package and ADR-0011 are approved under that instruction.

Current gate:

- Prepare and approve the full task plan/dependency graph before source or database implementation.

## Documentation and Evidence Used

- `docs/rsd/trainer-student-thread-instant-realtime-20260802-rsd.md`
- ADR-0008 and ADR-0010 plus their technical/task/review artifacts
- Current Supabase Realtime Authorization, Broadcast, JWT, signing-key, and third-party-auth documentation reviewed on 2026-08-02
- Supabase changelog through 2026-07-29, especially the 2026-07-14 Realtime schema lock-down
- Supabase PostgreSQL guidance for RLS, least privilege, total-order pagination, short transactions, constraints, query round trips, and `pg_stat_statements`
- Live Supabase MCP schema, grants, policies, advisors, logs, table counts, and statement statistics reviewed on 2026-08-02
- A temporary live Auth probe on 2026-08-02 confirmed an admin-created user with the `anon` role can exchange a server-generated magic-link token for an access token whose `sub` is the requested MCC UUID and whose `role` is `anon`; the probe user was deleted immediately after verification.

## Context

The current scoped-topic hardening still uses public Broadcast and sends an opaque invalidation that triggers a browser → Next.js → Hono → PostgreSQL fetch. It is slow because the receiver waits on application/network round trips and repeated authorization queries, not because Supabase Realtime or PostgreSQL row lookup is slow.

MCC authentication is HS256 application JWT, not a Supabase-trusted asymmetric issuer. The project does not expose a Supabase JWT signing secret, and importing a new asymmetric signing key requires separate platform configuration. The project currently has no Supabase Auth users. The browser already has the legacy publishable/anon key, while unrelated public-schema tables make granting the broader `authenticated` role unsafe.

## Decisions

### TD-001: Use Server-Managed Supabase Realtime Shadow Identities

Decision:

Create a Supabase Auth shadow user lazily for each MCC user who opens student-thread Realtime. The shadow user's UUID equals the MCC user UUID, its email is a deterministic non-routable synthetic address, its protected `app_metadata.mcc_realtime_identity` marker is `true`, and its PostgreSQL role is `anon`.

After MCC API authorization, the server:

1. Verifies or creates the owned shadow user using the server-only Supabase service/secret key.
2. Generates and exchanges a magic-link token entirely server-side.
3. Returns only the short-lived access token and expiry to the browser; no service key, password, action link, email OTP, or refresh token is returned.
4. Caches a still-valid token briefly in server memory to avoid creating repeated Auth sessions for list/thread channels.

The browser uses the access token only with `supabase.realtime.setAuth()`.

Rationale:

This supplies a Supabase-verified `auth.uid()` without migrating MCC login or exposing a signing secret. The `anon` role is deliberate: it has no more database privilege than the publishable key already present in the browser. Live inspection found no existing `anon`/`public` application-table policy that grants additional rows based on a non-null `auth.uid()`.

Guardrails:

- If an Auth user with the MCC UUID lacks the protected Realtime marker and matching deterministic identity metadata, fail closed rather than modifying it. Do not use Supabase's reserved `provider` metadata as an ownership marker because Auth normalizes it to the actual sign-in provider.
- Never use `user_metadata` for authorization.
- Never return or log refresh tokens, OTPs, service keys, message bodies, or private paths.
- Recheck the policy/grant assumption during verification because future RLS changes could make an `anon` token with a subject more privileged.

Alternatives rejected:

- Expose or derive the service role: rejected as catastrophic credential exposure.
- Grant the browser `authenticated`: rejected because unrelated exposed tables currently make that role unsafe.
- Import an app-owned signing key: sound long term, but not fully automatable with the available project tools and unnecessary for this focused fix.
- Keep a topic-only public capability: rejected because it does not provide identity-bound private authorization.

### TD-002: Make Thread Channels Private, Receive-Only, and Identity-Bound

Decision:

Thread and manager-list channels use `config.private = true`. Add a supported SELECT policy on `realtime.messages` for the `anon` role and Broadcast extension only. The policy calls a narrowly scoped helper in a non-exposed private schema that returns true only when:

- `auth.uid()` is non-null;
- an unexpired registry row exists for that user UUID; and
- the registry channel equals `realtime.topic()`.

Do not add an INSERT policy, so browsers cannot publish/spoof thread events. Server REST Broadcast remains the only publisher.

The helper is `SECURITY DEFINER` only because the registry itself remains unreadable to browser roles. It must use an empty `search_path`, perform the `auth.uid()` check internally, live outside exposed schemas, revoke execution from `PUBLIC`, and grant only the minimum execution/schema usage needed by `anon`.

Rationale:

Supabase prevents granting a new custom role direct SELECT on `realtime.messages`; a rolled-back live probe confirmed the grant is not retained. Using `anon` with a verified UUID avoids inheriting unsafe `authenticated` privileges while still allowing a supported Realtime RLS policy.

### TD-003: Deliver the Canonical Committed Message in Private Broadcast

Decision:

The atomic persistence statement returns the canonical message/attachment projection needed by Hono, avoiding post-commit database rereads. After commit, the server publishes it directly to every authorized thread and manager-list topic. The payload includes only:

- version/type;
- classroom/thread/student IDs and thread revision;
- canonical message fields already visible in the thread API;
- safe attachment display metadata without bucket/path/signed URL;
- the updated trainer-list summary; and
- non-sensitive timing/correlation fields.

The receiver validates the envelope and merges by persisted message ID/revision without an HTTP fetch. `is_own` is derived locally from `sender_id` and the MCC user ID.

Use the documented REST Broadcast batch endpoint. Each message supplies its topic, event, payload, and `private: true`, matching the installed official Realtime client contract. Await the accepted response with a short timeout and do not fall back to a public broadcast.

If publication fails, keep the committed message, log identifiers/timings only, and return success plus delivery state; reconnect/subscription catch-up repairs the receiver.

### TD-004: Add Monotonic Thread Revisions and Gap-Free Catch-Up

Decision:

Add `classroom_student_threads.revision bigint not null default 0` and `classroom_student_thread_messages.thread_revision bigint`. Backfill existing messages deterministically and enforce a unique `(thread_id, thread_revision)` constraint after backfill.

Each new message transaction locks the thread, assigns `revision + 1`, inserts the message, and updates the thread revision/updated time. Realtime payloads carry this revision.

Add an authorized catch-up endpoint that returns messages after a revision in ascending revision order with a bounded page. On every successful initial subscribe and re-subscribe, the client catches up from the highest applied revision and deduplicates overlapping Broadcast/catch-up messages.

Older-history pagination remains keyset-based but its cursor becomes the complete `(created_at, id)` pair.

Rationale:

Broadcast is not the source of truth. Persisted revision catch-up closes snapshot/subscribe and disconnect gaps and makes event ordering explicit.

### TD-005: Make Sends Transactional and Server-Idempotent

Decision:

Add `client_message_id text` to messages and a partial unique index on `(thread_id, sender_id, client_message_id)` when the key is non-null.

Text sends perform idempotency lookup/insert, thread revision update, and message persistence in one short transaction. Attachment sends upload the object before the transaction, then persist message, attachment metadata, and thread revision in one short transaction. No HTTP/Storage call occurs inside a database transaction.

If an attachment database write fails or loses an idempotency race after upload, attempt to delete the exact newly uploaded object and log only safe identifiers if cleanup fails.

Broadcast occurs once, after commit and after canonical attachment metadata is loadable.

### TD-006: Provision Threads at Membership Lifecycle, Never on Reads

Decision:

Backfill one thread for every existing active real student. Add a small security-invoker trigger on active classroom membership insert/update to provision future thread rows with `ON CONFLICT DO NOTHING`. Reads join existing threads and never insert/upsert.

Replace the current access chain with one authorization query that checks active real-student status, the thread, and whether the caller is the student or an authorized manager. Replace list construction with one joined query rather than active-student fetch → thread upsert → thread fetch → summary fetch.

Rationale:

This removes the observed 234 hot-path upserts and serial permission queries while retaining one-thread-per-active-student invariants.

### TD-007: Reuse One Scoped Registry Row and Renew Before Expiry

Decision:

Add partial uniqueness for one thread row per `(authorized_user_id, thread_id)` and one manager row per `(authorized_user_id, classroom_id)`. First issuance creates a random topic; renewal atomically extends the same scoped row/topic with an approximately 10-minute expiry so multiple tabs for the same user remain subscribed.

The client renews credentials before expiry and re-subscribes only when its token or topic changes; every actual subscribe/re-subscribe catches up. Membership/role revocation stops future publication no later than registry expiry even if an old WebSocket remains connected.

Credential renewal is lifecycle traffic, not message polling; it must not fetch thread content until the post-subscribe catch-up.

### TD-008: Guard Browser State by Thread Generation

Decision:

On student selection change, clear/isolate prior messages immediately and increment a generation identifier. Every list/thread/catch-up/realtime async completion must verify the active classroom/student/thread generation before mutating state. Superseded requests are ignored even when they cannot be physically aborted through a server action.

Optimistic items reconcile by `client_message_id`; persisted messages deduplicate by message ID and revision. Connecting, reconnecting, offline, pending, and failed states remain visible and calm.

### TD-009: Move Remaining Runtime DDL Into One Backward-Compatible Migration

Decision:

Create one reviewed SQL artifact that:

- includes the current Updates and pre-enrollment schema baseline formerly executed by request handlers;
- adds revision/idempotency/channel constraints and indexes;
- backfills threads/revisions;
- creates the membership provisioning trigger;
- creates the private authorization helper and supported `realtime.messages` SELECT policy; and
- preserves deny-by-default direct access to thread data/registry tables.

After applying the migration, `ensureClassroomUpdatesSchema()` and `ensurePreEnrollmentSchema()` become compatibility no-ops. No user-facing request may execute DDL.

Apply SQL before deploying code because the code depends on the new columns/constraints. The migration is additive/backward-compatible with the old public-channel code, so this order does not interrupt the current feature.

### TD-010: Keep Current Supabase Client Version for This Fix

Decision:

Do not upgrade `@supabase/supabase-js` solely for this task. The installed client supports `realtime.setAuth`, private channel config, subscriptions, and cleanup needed by this design. Persisted catch-up remains authoritative even though newer clients offer Broadcast replay.

Rationale:

An unrelated dependency jump would enlarge regression scope and Broadcast replay does not replace database-backed correctness.

### TD-011: Measure Commit-to-Render Without Logging Content

Decision:

Carry a correlation ID, message ID, committed timestamp, thread revision, and server publish duration. Record server commit/publish success/failure and client receive/apply/render timing without bodies, filenames, paths, tokens, or user secrets. Development/test instrumentation may expose a bounded in-memory sample for two-browser QA; production logs remain identifier/timing only.

## Migration and Rollback Direction

Forward order:

1. Apply additive SQL and verify policies/constraints/backfill.
2. Deploy server code capable of issuing private credentials, transactional writes, catch-up, and canonical private Broadcast.
3. Deploy client private subscription/catch-up/state guards.
4. Verify with two sessions, advisors, logs, policies/grants, and statement statistics.

Rollback:

- Client/server can be rolled back while additive columns/indexes/trigger remain.
- Do not drop revision/idempotency data during an application rollback.
- The new Realtime policy/helper can remain unused by the older public channel.
- Removing shadow Auth users, policies, helper functions, columns, or backfilled data is a separate destructive cleanup and is not part of automatic rollback.

## Security Review

- Authorization: MCC API authorization precedes registry/token issuance; Realtime policy binds UUID plus current topic.
- Data exposure: role is `anon`, not `authenticated` or `service_role`; payload excludes storage paths and secrets.
- Input validation: UUIDs, client message IDs, cursor/revision bounds, envelopes, and attachment inputs remain validated.
- Secret handling: service key remains server-only; only short-lived access token reaches browser; tokens are never logged.
- Unsafe defaults: no client INSERT policy, no public fallback, no direct thread-table grants.
- Residual dependency: project-wide public-schema/RLS findings remain critical but separate; verification must ensure the subject-bearing `anon` token has not gained a new policy path.
