# Trainer Student Thread Instant Realtime Implementation Review

Status: Approved under the user's 2026-08-02 full-auto instruction
Task ID: trainer-student-thread-instant-realtime-20260802
Last updated: 2026-08-02

## Outcome

The trainer/student thread now uses identity-bound private Supabase Broadcast, applies canonical committed messages directly in the receiver, and repairs disconnect/snapshot gaps from durable per-thread revisions. The sender still renders an optimistic pending bubble immediately.

The original slowness was confirmed to be application-side round trips: request-time DDL, serial access/provisioning queries, an invalidation-only Broadcast followed by Next.js/Hono/PostgreSQL refetches, and post-commit message/summary/registry rereads. Supabase Broadcast itself was not the primary bottleneck.

## Requirement Satisfaction

- Private, receive-only Realtime: the browser authenticates with a short-lived server-minted shadow identity, joins `private: true`, and has no Broadcast INSERT policy.
- Identity/topic authorization: the `anon` JWT subject must match an unexpired scoped registry row and `realtime.topic()`.
- Direct delivery: version 2 Broadcast envelopes include the canonical safe message and trainer-list summary; no per-message or per-summary receiver fetch remains.
- Gap recovery: monotonic `thread_revision` values and `GET .../messages?afterRevision=` repair initial-subscribe, reconnect, and detected ordering gaps.
- Idempotency: `(thread_id, sender_id, client_message_id)` is unique and duplicate text/attachment retries return the existing committed message.
- Atomic ordering: a single PostgreSQL data-modifying CTE locks the thread, selects/deduplicates, inserts the message and optional attachment metadata, advances the revision, and returns the canonical persistence projection.
- No read-path provisioning or DDL: active membership lifecycle provisioning is a trigger; thread/Updates/pre-enrollment request guards are compatibility no-ops.
- Stale-state protection: thread selection immediately isolates state, and async thread/catch-up completions validate the current student/generation.
- Attachment privacy: Broadcast includes display metadata only; signed URLs remain authorized API responses and bucket/path fields are excluded.

## Changed Runtime Files

- `server/src/utils/classroomStudentThreadRealtimeAuth.ts`
- `server/src/utils/classroomStudentThreadsSchema.ts`
- `server/src/utils/classroomUpdatesSchema.ts`
- `server/src/utils/classroomPreEnrollment.ts`
- `server/src/controllers/classroomController.ts`
- `server/src/routes/classroomRoute.ts`
- `client/src/hooks/useClassroomThreadRealtime.js`
- `client/src/components/ClassroomThreadsTab.js`
- `client/src/lib/action.js`

Planning, SQL, ADR, review, and knowledge-base files are recorded under `docs/` for task `trainer-student-thread-instant-realtime-20260802`.

## Supabase Migration

Applied through Supabase MCP:

- Version: `20260802081644`
- Name: `trainer_student_thread_instant_realtime_20260802`
- Source: `docs/sql/trainer-student-thread-instant-realtime-20260802.sql`

Post-apply verification returned:

- zero null thread revisions;
- zero null message revisions;
- zero messages ahead of their owning thread revision;
- one intended `realtime.messages` receive policy; and
- all four required revision/idempotency/registry indexes.

The focused advisor findings are informational and intentional immediately after migration: the four private application tables have RLS with no browser policies because direct grants are revoked, and new indexes are reported unused until traffic exercises them. Existing project-wide security-definer views and unrelated table/index findings remain outside this task.

## Live Verification

Environment:

- Connected Supabase project through MCP and the repository's local Hono server.
- Temporary isolated classroom using one existing trainer and one existing student.
- Two independent Supabase Realtime clients representing trainer-list and student-thread sessions.
- Temporary classroom rows, messages, registry rows, Storage object, and verification-only Auth shadow identities were removed after testing; follow-up counts were zero.

Correctness/security checks passed:

- both authorized sessions subscribed to private topics;
- a student token was rejected from the trainer's manager-list topic;
- both authorized sessions received the same canonical committed message/revision;
- Broadcast omitted sender email, MIST ID, storage bucket, and storage path;
- catch-up after revision zero returned the committed messages in order;
- duplicate text send returned the same message ID without a new revision;
- attachment metadata arrived in the canonical Broadcast;
- signed attachment download returned the exact test content;
- duplicate attachment retry returned the same message ID; and
- exact Storage cleanup succeeded.

Latency after removing post-commit rereads, five consecutive text samples:

| Metric | Observed p50 | Observed p95/max | Target |
|---|---:|---:|---:|
| Commit to Realtime receive | ~191 ms | 329 ms | p50 <= 250 ms; p95 <= 750 ms |
| Send start to Realtime receive | ~323 ms | 463 ms | supporting UX evidence |

The optimistic sender bubble is local and therefore appears before the network result.

## Static Verification

- `cd client && npm run lint`: passed with zero errors. Ten existing warnings remain in unrelated files; touched Realtime files have no warnings.
- `cd client && npm run build`: passed, including compilation, TypeScript, page generation, and trace collection.
- `cd server && /home/arik/.bun/bin/bun build src/index.ts --target=bun --outfile /tmp/mcc-server-realtime-final-check.js`: passed; 788 modules bundled.
- Focused source scan found no runtime DDL in the scoped schema helpers, no public thread subscription/fallback, no per-message/summary Realtime refetch, and no remaining read-path thread upsert.
- The current workspace is not exposed as a Git repository, so `git diff --check` and commit/merge operations were unavailable.

## Security Review

- Authorization: every credential, catch-up, message, attachment, and signed-URL route performs MCC classroom authorization first.
- Shadow identity: deterministic UUID/email plus protected admin metadata are collision-checked; reserved Supabase `provider` metadata is not trusted as an ownership marker.
- Least privilege: shadow JWT role is `anon`, not `authenticated` or `service_role`; application thread tables remain inaccessible to browser roles.
- Publication: server-only REST Broadcast uses the documented batch contract with `private: true` per topic and a bounded timeout.
- Secret handling: no service key, password, OTP, action link, refresh token, message body, private Storage path, or access token is logged or added to browser configuration.
- Failure behavior: message commit is authoritative; publication failure returns delivery state without rolling back the message, and revision catch-up repairs it.
- Dependency risk: no dependency upgrades or new runtime packages were introduced.

## Residual Risk

- A full 10-minute/one-hour wall-clock credential renewal soak was not run. Renewal uses the same scoped topic across tabs, extends registry expiry before timeout, resubscribes only when token/topic changes, and catch-up runs on every actual `SUBSCRIBED` transition.
- Rapid A -> B -> A selection and forced publisher outage were reviewed at source/build level rather than exercised in a browser automation harness. Generation guards and database-backed catch-up cover those cases, but they remain useful regression scenarios for a future UI test suite.
- The server-managed Auth bridge is an interim integration. If MCC later adopts a Supabase-trusted asymmetric issuer, direct third-party/custom JWT integration can replace shadow identities without changing revision/catch-up semantics.

## Gate

Requirement, technical-decision, task-plan, migration, implementation, verification, security, and implementation-review gates are complete under the user's explicit full-auto approval.
