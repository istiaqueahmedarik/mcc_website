# Student Challenge Submission and Custom Duration RSD

- **Author**: OpenCode
- **Date**: 2026-07-26
- **Status**: APPROVED

## 1. Executive Summary

Student Challenge tab currently lets students click a direct status toggle for assigned live-class problems. This conflicts with the existing verification model where student solve attempts should become `pending_approval` and trainers should own final verdicts.

Session scheduling also presents fixed duration choices with a maximum visible option of 180 minutes, while trainers need custom class durations.

## 2. Problem Statement

1. **Challenge status action is wrong for students**:
   - Student Challenge tab button calls a direct status toggle.
   - Server already converts student `solved` requests into `pending_approval`, but the UI still behaves like students can mark problems solved.
   - Students need a modal to submit a proof link instead.

2. **Trainer-only verdict ownership is not explicit enough**:
   - Students should not be able to mark live-class problems as `solved`, `tried`, or `not_solved`.
   - Trainers should be the only users who finalize those states.

3. **Class duration is preset-limited in scheduling UI**:
   - New session scheduling uses a fixed select with max visible option of 180 minutes.
   - Backend clamps duration at 1440 minutes, which still imposes an unrelated product cap.

## 3. Scope & Requirements

### 3.1 Student Challenge Submission Modal

- **REQ-1.1**: Replace the student Challenge tab direct `Mark solved` toggle with a modal.
- **REQ-1.2**: The modal must allow the student to submit a submission URL for trainer review.
- **REQ-1.3**: The student submission must set problem status to `pending_approval`, not `solved`.
- **REQ-1.4**: Show submitted link and current status back to student.

### 3.2 Trainer Verdict Control

- **REQ-2.1**: Only trainers/admins/substitute trainers can set live-class problem status to `solved`, `tried`, or `not_solved`.
- **REQ-2.2**: Student API calls must not be able to change final status values directly.
- **REQ-2.3**: Trainer live problem table must show pending submissions clearly and allow trainer final status selection.

### 3.3 Custom Class Duration

- **REQ-3.1**: New session scheduling must accept custom duration minutes rather than preset options only.
- **REQ-3.2**: Session edit duration must keep accepting custom duration minutes.
- **REQ-3.3**: Backend must remove product caps such as 180 minutes or 1440 minutes while still requiring a positive integer duration that fits the database column.

## 4. Out Of Scope

- New database tables or migrations.
- External judge submission verification.
- Topic tab submission workflow changes, except preserving existing behavior.
- New polling or background refresh.
- Changing classroom route paths.

## 5. Acceptance Criteria

- Clicking student Challenge tab `Mark solved` opens a submission modal.
- Submitting a valid submission link changes status to `pending_approval`.
- Student cannot mark a live-class problem `solved`, `tried`, or `not_solved` through UI or direct status API payload.
- Trainer can review pending state and set `solved`, `tried`, or `not_solved`.
- New session form accepts custom positive minute values above 180.
- Backend accepts custom positive duration values without the current 1440-minute product cap.

## 6. Verification Plan

- `npm run lint` in `client/` for client changes.
- Targeted TypeScript check/build only if server syntax risk appears.
- Manual student flow: submit link from Challenge tab and verify `pending_approval`.
- Manual trainer flow: set pending problem to `solved`, `tried`, and `not_solved`.
- Manual duration flow: schedule a class with duration above 180 minutes.
