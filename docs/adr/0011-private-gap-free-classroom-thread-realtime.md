# ADR-0011: Private Gap-Free Classroom Thread Realtime

Status: Accepted
Date: 2026-08-02
Task ID: trainer-student-thread-instant-realtime-20260802
Supersedes: ADR-0010's scoped-public-topic and opaque-refetch decisions; supersedes ADR-0008 only where it requires opaque invalidation instead of canonical private payload delivery

## Context

The current student-thread path uses short-lived but public bearer topics. A Broadcast event carries only identifiers, after which the browser calls Next.js, Hono, and PostgreSQL to authorize and fetch the changed row. Live measurements show Supabase Realtime and relevant SQL are fast; the application refetch chain, repeated authorization queries, read-path thread upserts, missing reconnect catch-up, and browser race handling cause delay and correctness risk.

MCC JWTs are not currently trusted by Supabase. Granting a browser a normal Supabase `authenticated` token is unsafe while unrelated public tables remain broadly exposed. The browser already has publishable/anon access.

## Decision

Use server-managed Supabase Auth shadow identities whose UUID equals the MCC user UUID and whose database role is `anon`. The MCC-authorized server returns only a short-lived access token and a scoped private topic. Supabase Realtime SELECT authorization on `realtime.messages` permits Broadcast only when `auth.uid()` matches an unexpired server-issued registry row for `realtime.topic()`. Browsers receive but cannot publish.

After a database transaction commits, the server sends the canonical safe message projection over a private Broadcast and awaits the publication result. Each message has a monotonic per-thread revision. The client catches up from its highest revision after every subscribe/reconnect and deduplicates Broadcast, catch-up, retry, and optimistic overlap.

Thread/message reads never create rows. Membership lifecycle provisioning maintains one thread per active real student. Message and attachment relational writes are short, idempotent transactions; storage work remains outside transactions with compensating object cleanup.

## Consequences

Positive:

- Healthy receivers render the committed message without an HTTP refetch.
- Topic knowledge without the matching Supabase identity is insufficient.
- Clients cannot spoof thread broadcasts.
- Snapshot/subscribe and reconnect gaps recover from persisted revisions.
- Browser credentials do not inherit the broader `authenticated` role.
- Read paths stop performing thread upserts.

Negative:

- The server manages a small Supabase Auth shadow identity/session bridge in addition to MCC auth.
- Shadow Auth users require lifecycle monitoring and collision-safe ownership metadata.
- `anon` must continue to have no subject-based policy that reveals extra application data; future policy changes must preserve that invariant.
- Broadcast is still not durable by itself, so catch-up endpoints remain required.

## Alternatives Considered

- Keep scoped public topics and targeted refetch: rejected because it remains bearer-topic authorization and retains network latency.
- Use the `authenticated` role: rejected because current unrelated table exposure would broaden browser access.
- Expose service credentials: rejected.
- Import a dedicated signing key: viable future simplification, but requires platform key configuration not available to the automated repo/MCP workflow.
- Use Broadcast replay as durability: rejected because it is retained only for a limited window and does not replace the application database as source of truth.

## References

- `docs/rsd/trainer-student-thread-instant-realtime-20260802-rsd.md`
- `docs/decisions/trainer-student-thread-instant-realtime-20260802-technical-decisions.md`
- `https://supabase.com/docs/guides/realtime/authorization`
- `https://supabase.com/docs/guides/realtime/broadcast`
- `https://supabase.com/docs/guides/auth/jwts`
- `https://supabase.com/docs/guides/auth/signing-keys`
