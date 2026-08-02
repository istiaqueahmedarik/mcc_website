# Trainer Student Thread Realtime Hardening and Performance RSD

Status: Approved
Task ID: trainer-student-thread-realtime-hardening-performance-20260802
Owner: Codex / Arik
Last updated: 2026-08-02
Delivery mode: Manual

## Mode and Gate Policy

Manual mode is selected because this fix touches classroom authorization, Supabase Realtime, PostgreSQL schema/index behavior, and the trainer/student thread UX. The repository requires approval after the primary RSD, technical decisions and ADRs, full task plan and dependency graph, and implementation review before final merge.

Current gate:
- RSD approved by the user on 2026-08-02.
- Awaiting user approval of technical decisions and any ADRs before task planning or source-code implementation.

## Problem Summary

The current trainer/student classroom thread feature works as a product shape, but the realtime implementation has security and performance gaps:

- Supabase Realtime channels are public topic subscriptions protected only by opaque channel names.
- Student-thread tables in the public Supabase schema have RLS disabled.
- Runtime schema/DDL guards run from live classroom request paths and Supabase logs show repeated `ALTER TABLE` calls.
- Realtime invalidation refetches a full bounded thread page instead of loading only the new message or changed summary.
- Trainer thread list does not receive realtime updates for unselected student threads.
- Attachment sends can broadcast before attachment metadata is durable.
- Duplicate/weak indexes add avoidable write/query cost.

## Goal

Make the existing student-scoped classroom thread feature safe and noticeably faster while preserving the approved product model: `Updates` first/default, `Threads` as the only active conversation surface, `Settings` for update preferences, server-authorized thread reads/writes, private safe attachments, and Supabase Realtime as opaque invalidation rather than private payload transport.

## Non-Goals

- Do not redesign the `Threads` UI beyond states needed for the fix.
- Do not revive legacy problem-thread UI.
- Do not migrate or destructively delete old problem-thread data.
- Do not replace MCC JWT authorization with direct browser Supabase table writes.
- Do not send message bodies, filenames, solution code, storage paths, private notes, or profile data through Realtime payloads.
- Do not add interval polling, visibility-triggered refetches, or hidden refresh loops.
- Do not change student submission final-verdict ownership.
- Do not broadly refactor `classroomController.ts` beyond the approved fix scope.

## Requirements

- Realtime subscriptions must not expose private classroom-thread activity through public channels without an authorization decision.
- Student-thread database tables in exposed Supabase schemas must be protected with RLS or equivalent explicit privilege revocation.
- Any required database schema/index changes must be represented as migration SQL or documented manual SQL, not run repeatedly from normal classroom request handlers.
- Live request handlers must not execute `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, or unrelated schema guards as part of ordinary thread reads/writes.
- Realtime signals for the active thread should fetch only the necessary new/changed data where feasible, falling back to full refresh only for reconnect, unknown revision, or explicit refresh.
- Trainer-side thread lists must update when unselected student threads receive activity.
- Attachment sends must persist message and attachment metadata consistently before broadcasting the user-visible invalidation.
- Indexes should match actual thread query shapes and remove duplicate index work.
- Any manual Supabase action required from Arik must be called out explicitly, including SQL to run, private bucket checks, environment variables, or dashboard settings.

## Acceptance Criteria

- [ ] Thread content remains accessible only through MCC JWT-secured server APIs.
- [ ] Supabase RLS/advisor exposure for `classroom_student_threads`, `classroom_student_thread_messages`, and `classroom_student_thread_attachments` is resolved or a documented manual RLS/privilege step is provided.
- [ ] Public Realtime exposure is removed or an approved short-term mitigation is documented with residual risk.
- [ ] Runtime student-thread schema DDL is removed from normal request paths.
- [ ] Repeated `ALTER TABLE classroom_team_topic_assignments ADD COLUMN IF NOT EXISTS student_id uuid` is removed from normal request paths.
- [ ] Student-thread indexes are adjusted to match list/message/event queries and duplicate index warnings are addressed.
- [ ] Active-thread realtime handling no longer blindly refetches the full page for every message when a smaller fetch is available.
- [ ] Trainer list state updates for unselected thread activity without hidden polling.
- [ ] Attachment send broadcasts only after attachment metadata is available to authorized readers.
- [ ] Existing text send, attachment send, submission-reference bubbles, system events, Updates, and Settings behavior remain intact.
- [ ] Server and client verification passes or unrelated blockers are documented.
- [ ] Supabase MCP advisors/logs are rerun after the fix where access allows, or any manual verification gap is documented.

## Constraints

- Use existing Next.js, React, Tailwind/shadcn, Hono/Bun, PostgreSQL, and Supabase dependencies.
- Prefer additive endpoints and focused helper changes over broad controller extraction.
- Keep Realtime payloads opaque and privacy-preserving.
- Keep classroom student access role-clean: pre-enrolled/link-pending placeholders and trainer/admin accounts cannot act as students.
- Use Supabase/Postgres best-practice guidance for RLS, indexes, locking, and migrations.
- Preserve existing dirty worktree changes that are unrelated to this fix.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: RSD-first workflow, approval gates, verification expectations, and security checklist.
  Confidence: High
- Source: `docs/rsd/trainer-student-classroom-threads-realtime-20260731-rsd.md`
  Used for: approved product requirements for student-scoped classroom threads.
  Confidence: High
- Source: `docs/decisions/trainer-student-classroom-threads-realtime-20260731-technical-decisions.md`
  Used for: approved architecture, especially server-authorized APIs and opaque Supabase Realtime invalidation.
  Confidence: High
- Source: `docs/adr/0008-classroom-student-thread-realtime-model.md`
  Used for: durable classroom thread model and non-goals.
  Confidence: High
- Source: `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`
  Used for: known residual risk around live Supabase QA and private attachment bucket setup.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`, `patterns.md`, `quality-rules.md`, and `mistakes.md`
  Used for: no-polling, bounded thread history, server-validated submission references, and prior schema-guard lessons.
  Confidence: High
- Source: Supabase MCP logs/advisors from 2026-08-02 review
  Used for: realtime appeared low-latency, Postgres logs showed repeated DDL, advisors flagged RLS disabled, duplicate indexes, and missing FK indexes.
  Confidence: High
- Source: Supabase changelog 2026-07-14 Realtime schema lock-down
  Used for: avoiding changes to Supabase-owned `realtime` schema objects except allowed policies on `realtime.messages`.
  Confidence: High
- Source: Supabase Postgres best-practice skill references
  Used for: RLS, RLS performance, FK indexing, composite/partial indexes, and lock minimization.
  Confidence: High

## Risks and Open Questions

- RLS policy design may be non-trivial because MCC JWT users are not necessarily Supabase Auth users. Technical decisions must decide between RLS policies, privilege revocation, or a more explicit private-channel auth bridge.
- Enabling RLS without compatible policies can break direct Supabase Data API access. The implementation must avoid blind remote changes and state manual steps clearly.
- Removing runtime DDL requires confidence that schema exists in every deployment. The plan must include migration/manual SQL and rollback notes.
- Lightweight incremental fetch may need one new endpoint to fetch messages after a cursor or by ID.
- Trainer list realtime can be implemented as a classroom-level opaque summary signal or as local state updates from selected-thread events; technical decisions must choose the safer low-subscription approach.

## Manual Actions Expected

Likely required from Arik before live deployment:

- Run approved SQL against the Supabase project or let Codex apply it through Supabase MCP after explicit approval.
- Confirm the private attachment bucket exists and is not public, currently expected as `classroom-thread-attachments` unless env overrides are used.
- Provide or use two authenticated sessions for live trainer/student browser QA.

Exact SQL, dashboard checks, and verification commands will be listed in the technical-decision/task-plan artifacts after this RSD is approved.
