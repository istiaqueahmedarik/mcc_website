# ADR-0010: Classroom Student Thread Realtime Hardening

Status: Superseded by ADR-0011
Date: 2026-08-02
Task ID: trainer-student-thread-realtime-hardening-performance-20260802

## Context

ADR-0008 approved student-scoped classroom threads with Supabase Realtime used as opaque invalidation before MCC JWT-authorized refetch. The implementation used stable public Supabase Broadcast topics derived from `classroom_student_threads.realtime_token`. Supabase advisors also show that the new thread tables live in the exposed `public` schema with RLS disabled and broad browser-role grants.

Supabase private channels require Realtime Authorization through JWT/RLS checks on `realtime.messages`. MCC currently issues its own app JWTs with the app secret, and those tokens are not configured as Supabase Auth or Supabase third-party-auth tokens. They also do not currently carry the Supabase-compatible `role` and `exp` claims needed for private channel authorization.

## Decision

Keep ADR-0008's core model: thread content is fetched only through MCC JWT-secured APIs, and Supabase Realtime carries opaque invalidation only.

Harden the implementation as follows:

- Enable RLS and revoke browser-role direct privileges on student-thread content tables.
- Replace stable per-thread public Broadcast topics with server-issued scoped opaque topics returned only after MCC authorization.
- Add separate scoped topics for active thread panels and trainer/admin/manager classroom thread lists.
- Broadcast only opaque identifiers/timestamps and fetch changed message/summary content through MCC APIs.
- Defer true Supabase private-channel authorization until a separate auth integration can safely make MCC user identity available to Supabase Realtime policies.
- Do not expose Supabase service/secret keys or JWT signing secrets to the browser.

## Consequences

Positive:
- Browser Data API access to private thread tables is denied by default.
- Leaked or guessed stable thread topics no longer provide durable thread-activity visibility.
- Trainer lists can receive unselected-thread updates without subscribing to every student thread.
- Active-thread updates can be faster because the client fetches one changed message instead of a full page.
- The hotfix avoids a rushed custom JWT bridge that could accidentally grant broad Supabase `authenticated` access.

Negative:
- Scoped public topics are still bearer topics, not true Supabase Realtime Authorization.
- Server-side broadcast fan-out becomes a little more complex because it must look up active scoped channels.
- A future private-channel bridge will need its own RSD/ADR, Supabase auth configuration, and live testing.

## Alternatives Considered

- Keep stable public per-thread topics: rejected because it leaves long-lived topic leakage in place.
- Send full message payloads through Realtime: rejected because it violates ADR-0008 and increases data exposure.
- Directly mint Supabase-compatible Realtime JWTs in this hotfix: rejected because current MCC auth is not configured as a Supabase-trusted issuer and doing so safely requires a broader auth design.
- Disable Realtime entirely: rejected because the approved feature requires live updates and the issue can be mitigated without reverting to manual-only refresh.

## References

- `docs/adr/0008-classroom-student-thread-realtime-model.md`
- `docs/decisions/trainer-student-thread-realtime-hardening-performance-20260802-technical-decisions.md`
- `docs/rsd/trainer-student-thread-realtime-hardening-performance-20260802-rsd.md`
- `https://supabase.com/docs/guides/realtime/broadcast`
- `https://supabase.com/docs/guides/realtime/authorization`
- `https://supabase.com/docs/guides/database/postgres/row-level-security`
