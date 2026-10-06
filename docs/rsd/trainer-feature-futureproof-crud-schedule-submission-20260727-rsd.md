# Trainer Feature Futureproof CRUD, Schedule, and Submission RSD

- **Author**: OpenCode
- **Date**: 2026-07-27
- **Status**: APPROVED

## 1. Executive Summary

Trainer classroom workflows need five focused improvements: make group/member displays resilient with many students, make session edit support end-time based duration calculation without changing the database, complete Topics CRUD, and let students submit private code directly when public submission links are unavailable.

## 2. Scope and Requirements

### 2.1 Group Member Display Futureproofing

- **REQ-1.1**: People tab group cards must not render long member lists in a way that hides edit/action controls.
- **REQ-1.2**: Groups tab cards must not render every member name inline when a group has many members.
- **REQ-1.3**: Group cards must show member count, a small visible subset, and an overflow affordance such as expand/collapse or dialog details.
- **REQ-1.4**: Edit, save, cancel, and matrix actions must remain visible and reachable regardless of member count.

### 2.2 Session Edit End Time

- **REQ-2.1**: Initial schedule creation remains start time plus duration minutes.
- **REQ-2.2**: Session edit dialog must show scheduled start time and end time.
- **REQ-2.3**: On edit save, duration minutes must be computed from `endTime - scheduledTime` and sent through the existing `durationMinutes` API field.
- **REQ-2.4**: End time must not be displayed as a new persisted field or require a database change.
- **REQ-2.5**: Invalid edit ranges such as end time less than or equal to start time must be blocked client-side before submit.

### 2.3 Topics CRUD

- **REQ-3.1**: Topics tab must support update and delete/archive operations in addition to create/read.
- **REQ-3.2**: Topic unit edit should allow title, module, description, and active/archive status changes using the existing topic update endpoint.
- **REQ-3.3**: Topic unit removal must be safe for existing assignment/resource/problem relationships. Prefer server-side cascading delete only where the existing schema supports it; otherwise use archive as the visible delete equivalent.
- **REQ-3.4**: Topic resources and topic problems should support edit and remove actions when server-side ownership checks can preserve classroom boundaries.
- **REQ-3.5**: Assigned group rows should support unassign/deactivate when a topic was assigned to the wrong group.

### 2.4 Submission Link or Private Code

- **REQ-4.1**: Student live challenge submission must allow either a valid submission URL or pasted code content.
- **REQ-4.2**: The submission dialog must include a language selector and code textarea/editor area.
- **REQ-4.3**: Trainer review surfaces must show submitted code with syntax highlighting when present.
- **REQ-4.4**: The solution proof flow must still set student submissions to `pending_approval` and keep trainer-owned final verdicts.
- **REQ-4.5**: The database must remain unchanged; existing `solution_link`, `solution_code`, and `submission_notes` storage must be reused.

## 3. Out of Scope

- Database schema migrations or new columns.
- Public/private checking for external submission URLs.
- Code execution, judge integration, or plagiarism detection.
- Route renames or table renames.
- New dependencies.
- Broad trainer UI redesign outside the listed group, schedule, topic, and submission surfaces.

## 4. Acceptance Criteria

- People tab group cards keep edit/action controls visible with 50+ members.
- Groups tab cards show bounded member previews with count/overflow details instead of unbounded badges.
- Editing a session displays start and end time, then computes positive duration minutes on save.
- Topics can be edited and archived/deleted from the trainer Topics tab.
- Topic resources/problems can be edited/removed where safe server endpoints are added.
- Students can submit either URL or code from live Challenges.
- Trainers can view submitted code with syntax highlighting.
- No database migration is introduced.
- Targeted client/server verification has no new errors.

## 5. Verification Plan

- Run targeted ESLint for `client/src/app/classroom/live/[id]/ClassroomLiveClient.js` if possible.
- Run server bundle/syntax smoke for `server/src/controllers/classroomController.ts` and `server/src/routes/classroomRoute.ts` if possible.
- Run `git diff --check`.
- Manual check: large groups, session edit end-time calculation, topic CRUD, link-only submission, code-only submission, trainer review display.
