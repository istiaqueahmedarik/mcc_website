# Trainer Student Tabs And Schedule Time RSD

- **Author**: OpenCode
- **Date**: 2026-07-27
- **Status**: APPROVED

## 1. Executive Summary

Student classroom tabs need to match the trainer feature navigation order requested by the user, and scheduled class times must display the same local time trainers save. Current schedule create/edit sends raw `datetime-local` strings, which can be interpreted with the wrong timezone once stored and read back.

## 2. Scope & Requirements

### 2.1 Student Tab List

- **REQ-1.1**: Student tab order must be `Topics`, `Challenges`, `Live Sessions & IDE`, `Group & Roster`, `Attendance`.
- **REQ-1.2**: Keep existing student tab values and content panels where possible.
- **REQ-1.3**: Update student tour text/order to match tab navigation.

### 2.2 Schedule Time Correctness

- **REQ-2.1**: Scheduling a class must preserve the trainer-selected local date/time when shown in schedule lists, attendance views, and history.
- **REQ-2.2**: Editing a class session must round-trip the stored time into the `datetime-local` input and save it without unintended timezone drift.
- **REQ-2.3**: Server must validate scheduled time before inserting or updating `classes.scheduled_time`.

### 2.3 Behavior Preservation

- **REQ-3.1**: Do not change routes, authorization, attendance saving, class start/complete behavior, or polling behavior.
- **REQ-3.2**: Do not add dependencies or database migrations.

## 3. Out Of Scope

- Renaming database columns or API routes.
- Changing trainer tab navigation.
- Reworking attendance data model.
- Adding global timezone preferences.
- Fixing unrelated existing lint warnings.

## 4. Acceptance Criteria

- Student tabs render in requested order with requested labels.
- Student onboarding tour follows the same order.
- Schedule create and edit submit normalized ISO timestamps.
- Server rejects invalid scheduled times and stores normalized ISO strings.
- Targeted client/server verification has no new errors.
