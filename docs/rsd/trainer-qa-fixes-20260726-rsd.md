# Trainer QA Fixes RSD

Status: Approved
Task ID: trainer-qa-fixes-20260726
Owner: Codex
Last updated: 2026-07-26
Delivery mode: Auto

## Mode and Gate Policy

Auto mode was selected by the user with "go to auto mode and do what is best." RSD, technical-decision, task-plan, and implementation-review gates continue without waiting, with assumptions recorded. No irreversible production data cleanup is approved unless the implementation can make it narrowly server-derived and safe; otherwise the fix must prevent future pollution and surface existing bad data as residual risk.

## Grill Mode Summary

Task restatement:
Fix the trainer QA findings from the browser QA pass across live classroom, topic resources, trainer forms, board, validation feedback, terminology, and student/trainer role handling.

Answers received:
- User wants the RSD orchestrator workflow.
- User switched to auto mode and delegated "what is best."
- Provided QA accounts were used in the previous QA pass.

Assumptions:
- Fix all listed QA findings in one delivery, prioritizing correctness and trainer usability.
- Preserve existing routes and database schema unless source inspection proves a schema change is required.
- Do not delete existing classroom enrollment data automatically; prevent trainers/admins from being enrolled as classroom students and filter any existing pollution from trainer-facing rosters.
- Keep topic-resource read links compatible with existing reader route if feasible.
- Remove or hide duplicate/confusing UI affordances when the same action appears twice.
- Hide or suppress the tldraw license CTA from the trainer classroom UI only if possible through local presentation settings/CSS without violating package behavior.

Important unresolved questions:
- Whether to run a one-time cleanup of already-bad `classroom_students` rows is unresolved and intentionally out of scope for auto mode.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: workflow, paths, verification, review standards
  Evidence: trainer/classroom UI entry points live under `client/src/app/trainer/`, `client/src/app/classroom/`, and trainer/classroom APIs under Hono server controllers/routes.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: existing trainer/classroom behavior and constraints
  Evidence: group terminology should be user-facing only; topic resources/problems are separate from live-class resources/problems; board is ephemeral and classroom scoped.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`
  Used for: durable decisions
  Evidence: keep DB table/API route names as `classroom_teams`/teams while all user-facing labels use Group/Groups.
  Confidence: High
- Source: `docs/rsd/public-trainer-form-share-identity-20260726-rsd.md`
  Used for: public form identity behavior
  Evidence: authenticated form identity is server-derived and duplicate/locked-value behavior is security-sensitive.
  Confidence: High
- Source: `docs/rsd/trainer-action-sonner-feedback-20260726-rsd.md`
  Used for: feedback expectations
  Evidence: trainer-triggered async actions should give visible start/success/failure feedback.
  Confidence: Medium
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: live classroom QA findings
  Evidence: problem assignment, group creation, topic resources, board, schedule, attendance, and people panels live in one large client component.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: classroom roster, topic resources, board, resource detail, and problem preview APIs
  Evidence: classroom students, topic resources, teams, board, and resource detail are served by this controller.
  Confidence: High
- Source: `client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js`
  Used for: form analytics and JSON detail display
  Evidence: mapped/custom metrics and response JSON rendering are computed client-side from `response_json`.
  Confidence: High
- Source: `rsd-orchestrator-agent/references/hci-design-rules.md`
  Used for: validation, feedback, duplicate controls, and terminology expectations
  Evidence: meaningful actions need visible feedback; invalid actions should be prevented or explained; labels must match user mental models.
  Confidence: High
- Source: `rsd-orchestrator-agent/references/code-quality-rules.md`
  Used for: implementation constraints
  Evidence: keep changes scoped, avoid broad refactors, and prefer existing local patterns.
  Confidence: High

## Goal

Trainer workflows should behave correctly and clearly across the QA-tested paths: classroom rosters exclude trainers as students, topic resources open in a reader, form analytics expose saved mapped/custom data, user-facing terminology says Group/Groups, validation failures are visible, board controls are not duplicated, and preview/board UI avoids misleading placeholders.

## Non-Goals

- No broad redesign of trainer dashboard, classroom live, or form builder.
- No database schema migration unless a safe fix is impossible without one.
- No automatic destructive cleanup of existing bad production enrollment data.
- No new tldraw licensing or deployment purchase workflow.
- No new external judge scraping system beyond improving displayed metadata fallback.
- No route renames that break existing links.

## Users and Use Cases

- Trainer: manages classroom students, groups, topics, resources, problem assignments, attendance, board broadcast, and form analytics.
- Student: accesses assigned resources/forms and should not see trainer-only controls.
- Maintainer: needs bounded code changes and verification across server/client surfaces.

## User-Visible Behavior

- Trainer/admin accounts cannot be added to enrolled-student rosters and do not appear as assignment/attendance/group-member candidates.
- If an existing roster contains trainer/admin users, trainer-facing UI filters them out from student workflows while preserving server-side authorization.
- Topic resource `Read` opens a working page for the saved resource, or the card avoids linking to a non-working reader.
- Form detail summary counts mapped/custom saved response values accurately and the JSON view shows inspectable response payloads.
- User-facing labels say Group/Groups in classroom trainer/student UI while internal API/table names remain unchanged.
- Clicking labels for group member checkboxes toggles the checkbox.
- Creating a group without members and assigning a problem without a target show clear validation feedback and do not silently fail.
- Board empty state has one primary `Start broadcast` affordance.
- Board canvas starts without exposing distracting non-learning CTAs when locally suppressible.
- Problem preview avoids misleading `Standard sec | Standard MB` text when real time/memory data is missing.

## Acceptance Criteria

- [x] Trainer/admin users are blocked or filtered out of classroom student enrollment and student-only lists.
- [x] Assignment target, group member selection, attendance summary, and student list do not show trainer/admin accounts as students.
- [x] Topic resource reader/open behavior works for topic resources created from the Topics tab.
- [x] Form detail metrics count mapped/custom response values from saved responses accurately.
- [x] Form JSON tab exposes the saved response JSON in a readable trainer-facing view.
- [x] All user-facing Team/Teams labels in the affected classroom trainer/student surfaces become Group/Groups, while API names remain unchanged.
- [x] Group member labels are clickable/toggleable.
- [x] Empty group creation and missing assignment target show visible validation feedback.
- [x] Board empty state has one `Start broadcast` action.
- [x] tldraw license CTA is not visible inside the classroom board if suppressible without dependency or licensing changes.
- [x] Problem preview does not show fake/default limit text when limits are unknown.
- [x] Student cannot access `/trainer/dashboard`; existing authorization remains intact.
- [x] Targeted client/server verification passes or documented blockers are recorded.

## Constraints

- Keep changes focused on trainer/classroom/form files implicated by QA.
- Preserve server-side authorization and identity derivation.
- Preserve SQL parameterization.
- Avoid broad component rewrites in `ClassroomLiveClient.js`.
- Use existing UI feedback patterns and `sonner` where available.

## Dependencies

- Existing `classroom_students`, `trainer_teams`, `classroom_topics`, topic-resource, and trainer-form tables.
- Existing Next proxy and Hono route/controller structure.
- Existing tldraw component and board session APIs.

## Risks and Open Questions

- Risk: `ClassroomLiveClient.js` is large and many findings touch it. Mitigation: split subagent work by server/forms/classroom UI scopes and review diffs before integration.
- Risk: filtering existing trainer-as-student pollution in UI hides bad data but does not delete it. Mitigation: record residual cleanup as follow-up unless safe server-side cleanup is explicitly approved later.
- Risk: tldraw license CTA suppression may be package/version-sensitive. Mitigation: keep it as local CSS/presentation only or record residual risk.
- Risk: problem metadata limits depend on external page parsing. Mitigation: avoid misleading fallback text even if exact limits cannot be scraped.

## Test Expectations

- Targeted ESLint for changed client files.
- Bun bundle check for server when server files change.
- Browser QA for trainer login, classroom People/Groups/Topics/Board/Live tabs, form detail, and student public-form access if time permits.
- Manual API/code review for authorization and role filtering.

## HCI Expectations

The fix should reduce hidden state and silent failure. Trainers should see clear labels, one obvious primary action per state, field-level or toast feedback when actions are invalid, and a consistent Group/Groups mental model. Disabled or unavailable actions should either be prevented before submission or return visible recovery instructions.

## Code Quality Expectations

Use narrow helpers only where they remove repeated role-filter or metric-count logic. Keep server policy near controller endpoints and client display logic near existing component sections. Avoid speculative abstraction, route churn, schema churn, and unrelated formatting.

## Definition of Done

- [x] Mandatory Grill Mode completed through QA evidence and auto-mode assumptions
- [x] RSD gate satisfied by auto mode
- [x] Technical decision gate satisfied by auto mode
- [x] Full task plan gate satisfied by auto mode
- [x] Implementation passes verification
- [x] Implementation review gate satisfied by auto mode
- [x] All delegated work is integrated or waived
- [x] Knowledge base and mistake note updated
