# Trainer Student Roster Apple Redesign Technical Decisions

Status: Approved
Task ID: trainer-student-roster-apple-redesign-20260809
Owner: Codex
Last updated: 2026-08-09

## Decisions

1. Keep the redesign UI-only inside `ClassroomLiveClient.js`.
   - Do not change server routes, route handler strings, schemas, auth checks, enrollment status semantics, or dependencies.
   - Preserve the unrelated Discord changes already present in the dirty file.

2. Replace the trainer two-card People layout with a local focused switcher.
   - `students` is the default inner view for trainers.
   - `groups` is the alternate inner view.
   - Use local search and separate visible counts for students and groups.

3. Replace always-visible forms with focused dialogs.
   - Add Students dialog owns Single and CSV modes and continues into the existing pre-enrollment review modal.
   - Create Group dialog owns group name, searchable checkable member list, and inline validation.
   - Edit Members dialog owns searchable checkable member list and keeps the existing group update endpoint.

4. Present roster and group data as scan-friendly list rows.
   - Use spacing, type weight, muted metadata, and soft row separators as the main hierarchy.
   - Use status badges only for state communication.
   - Put removal behind a dropdown menu and a controlled confirmation dialog.

5. Apply the same restrained language to student People.
   - `groups` is the default inner view for students.
   - Prioritize groups containing the current student but keep all groups currently visible.
   - Classmates use shared read-only roster row styling and expose no trainer controls.

6. Use existing Framer Motion v11 as the "react-motion" answer.
   - Import from `framer-motion`, matching the installed package and existing app imports.
   - Use `MotionConfig reducedMotion="user"` and `AnimatePresence initial={false}`.
   - Animate only pointer-initiated inner panel changes with opacity and a 4 px `transform`.
   - Keep keyboard-triggered changes instant.

7. Use existing local primitives.
   - Prefer shadcn/Radix `Dialog`, `DropdownMenu`, `Tabs`, `Input`, `Button`, `Badge`, `ScrollArea`, and `Checkbox`.
   - Do not introduce global token changes, hardcoded brand palettes, or a reusable design-system extraction.

## Rationale

The existing People tab put enrollment, import, pre-enrollment, roster review, group creation, member selection, group editing, and long lists on screen at once. Apple and Vercel guidance both point toward clearer hierarchy, progressive disclosure, controls near affected content, accessible primitives, and restraint. A local focused workspace solves the specific feature problem without broad classroom churn.

## Constraints

- Student classroom access remains active-only and must not be broadened by the UI.
- Pre-enrolled/link-pending identities remain trainer-selectable.
- Bounded member previews remain required for dense group lists.
- No hidden polling, no new dependencies, no global theme rewrite.
