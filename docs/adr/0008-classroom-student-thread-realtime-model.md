# ADR-0008: Classroom Student Thread Realtime Model

Status: Accepted
Date: 2026-07-31
Task ID: trainer-student-classroom-threads-realtime-20260731

## Context

MCC currently has an implemented `Updates` tab and per-problem thread model. The user reported that this thread system for trainer/student communication is confusing and asked for a dedicated `Threads` tab where trainers can chat with students using one classroom chat per student. Student submissions, trainer-added problems, trainer feedback, and relevant classroom changes should appear as event bubbles inside the chat. `Updates` must remain the first/default notification page, and `Settings` must own priority ordering and classroom email preferences. The new thread surface must use Supabase Realtime and support safe file sharing.

The app currently uses MCC JWT authentication for classroom authorization. The browser Supabase client is configured with public anon credentials, and existing storage helpers are public-image oriented. Therefore, private classroom message/file content should not be sent directly through unauthenticated Supabase row-change payloads or public storage URLs.

## Decision

Adopt a student-scoped classroom thread model:

- `Updates` remains the first/default classroom tab and continues to behave as notification/read-state UI.
- `Threads` becomes the only active classroom conversation surface.
- `Settings` owns classroom update priority ordering and classroom email preferences.
- Each active real student gets one classroom thread with the trainer side, keyed by `(classroom_id, student_id)`.
- Human chat messages and system event bubbles share the same student-thread timeline.
- System event bubbles are appended after successful existing classroom mutations, including student solution submission, trainer problem addition, trainer feedback/status change, and affected topic/resource updates.
- Existing live and topic submission/status endpoints remain authoritative; chat messages do not grant final solve verdicts.
- Attachments use private Supabase Storage through server-validated upload and server-authorized signed access.
- Supabase Realtime is used as an opaque per-thread invalidation signal only. Private content is fetched through MCC's JWT-secured server API after a realtime signal.
- Old `classroom_problem_threads` data is not destructively deleted. The problem-thread UI is treated as legacy and removed or hidden from active classroom screens.

## Consequences

Positive:
- Trainers and students get one clear conversation place per student.
- Updates stays focused on "what needs attention" instead of becoming a hidden chat launcher.
- Server authorization remains the source of truth for messages, events, files, and read access.
- Realtime updates avoid polling without leaking message bodies through public Supabase credentials.
- Private classroom attachments no longer rely on public image buckets or broad upload helpers.
- Existing problem status and trainer-verdict safeguards remain intact.

Negative:
- New student-thread tables and helper functions are required.
- Historic per-problem thread content is not shown in the new Threads tab unless a future migration is approved.
- Opaque realtime invalidation needs a follow-up authorized fetch, so it is slightly less instant than sending full message payloads through Realtime.
- Private file upload requires server-only storage credentials or equivalent Supabase storage policy configuration.

## Alternatives Considered

- Keep per-problem threads and redesign the bubbles: rejected because the user explicitly identified the current thread system as confusing and requested one classroom chat per student.
- Reuse `classroom_problem_threads` for student threads: rejected because it would preserve problem-first storage and authorization complexity.
- Send full message payloads through Supabase Realtime: rejected because the current browser Supabase client uses anon credentials and does not prove MCC classroom authorization.
- Use public Supabase Storage URLs for attachments: rejected because classroom files can contain private student/trainer content.
- Migrate old problem-thread messages immediately: rejected because safe migration requires separate mapping decisions and could mix old problem context into the new student-thread mental model.

## References

- `docs/rsd/trainer-student-classroom-threads-realtime-20260731-rsd.md`
- `docs/decisions/trainer-student-classroom-threads-realtime-20260731-technical-decisions.md`
- `docs/adr/0007-classroom-problem-thread-update-model.md`
- `docs/decisions/classroom-live-stop-polling-20260726-technical-decisions.md`
- `docs/knowledge-base/project-index.md`
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `server/src/controllers/classroomController.ts`
- `https://supabase.com/docs/guides/realtime/authorization`
- `https://supabase.com/docs/guides/realtime/broadcast`
- `https://supabase.com/docs/guides/storage`
- `https://supabase.com/docs/reference/javascript/v1/storage-from-createsignedurl`
