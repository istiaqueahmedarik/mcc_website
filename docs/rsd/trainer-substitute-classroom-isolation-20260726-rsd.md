# Trainer Classroom Isolation & Substitute Trainers RSD

Status: Draft (Awaiting User Approval)
Task ID: trainer-substitute-classroom-isolation
Owner: Antigravity
Last updated: 2026-07-26

## Goal

1. Restrict classroom visibility and management so that non-admin trainers only see and manage classrooms they created or have been explicitly added to as a substitute/co-trainer.
2. Enable primary trainers (and admins) to assign and manage substitute/co-trainers for their classrooms.

## Non-Goals

- Do not change how system Admins view classrooms (Admins retain global oversight across all classrooms).
- Do not alter student enrollment or student classroom permissions.
- Do not modify non-classroom trainer features (such as trainer forms).

## Users and Use Cases

- **Primary Trainer**: Creates classrooms and manages their own active classrooms. Can invite or substitute other trainers to help manage specific classrooms, view student progress, and run live sessions.
- **Substitute / Co-Trainer**: Granted helper access by the primary trainer to co-manage a specific classroom, schedule/run classes, assign problems, and interact with students in that classroom.
- **Platform Admins**: Retain global visibility across all classrooms and can assign or remove substitute trainers for any classroom.

## User-Visible Behavior

- **Trainer Dashboard (`/trainer/dashboard`)**:
  - Displays only classrooms created by the logged-in trainer OR classrooms where the trainer has been added as a substitute/co-trainer (unless logged in as Admin).
  - Displays a badge/indicator distinguishing "Owner" vs "Substitute".
- **Classroom Details / Settings**:
  - Adds a "Substitute Trainers" management interface allowing the primary trainer or admin to search and assign other system trainers as substitute helpers, or remove existing substitutes.
- **Classroom Authorization**:
  - Access to classroom details, classes, IDE sessions, assignments, and board sessions is restricted to the owner, assigned substitutes, or admins.

## Acceptance Criteria

- [ ] Database table `public.classroom_substitutes` is created with proper foreign keys and unique constraints (`classroom_id`, `trainer_id`).
- [ ] `getClassrooms` backend controller filters classroom list for non-admin trainers so they only see classrooms where `created_by = trainer_id` OR `id IN (SELECT classroom_id FROM classroom_substitutes WHERE trainer_id = trainer_id)`.
- [ ] Backend helper functions and endpoints verify classroom ownership or substitute assignment (`isTrainerForClassroom`) before allowing management actions (scheduling classes, assigning problems, running IDE/board sessions).
- [ ] Server endpoints added to add (`POST`), remove (`DELETE`), and list (`GET`) substitute trainers for a classroom.
- [ ] UI on `/trainer/dashboard` shows ownership badge (Owner vs Co-Trainer/Substitute).
- [ ] Classroom management interface enables searching and adding/removing substitute trainers.
- [ ] `npm run lint` and `npm run build` pass clean.

## Constraints

- Backward compatibility for existing classrooms (creators remain primary owners).
- Admin role must maintain global visibility and override capability.

## Risks and Open Questions

- **Risk**: Existing trainers might suddenly lose access to classrooms they didn't create if they were relying on the previous open model. **Mitigation**: Primary trainers can easily add them as substitute trainers.

## Test Expectations

- Run `npm run lint` in `client/`
- Run `npm run build` in `client/`
