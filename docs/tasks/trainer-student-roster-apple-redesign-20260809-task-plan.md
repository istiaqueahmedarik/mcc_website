# Trainer Student Roster Apple Redesign Task Plan

Status: Approved
Task ID: trainer-student-roster-apple-redesign-20260809
Owner: Codex
Last updated: 2026-08-09

## Sequence

1. Inspect current People helpers, state, roster derivations, handlers, local UI primitives, dirty worktree overlap, and knowledge-base constraints.
2. Add RSD and technical decision artifacts for the UI-only redesign.
3. Update `ClassroomLiveClient.js` imports and local helper components for roster rows, switcher chrome, dialog lists, and motion shell.
4. Add local state for focused trainer/student People views, search queries, separate batching, add/create/edit dialogs, selected remove target, and keyboard versus pointer switching.
5. Preserve existing mutation handlers while improving feedback where the redesign requires it.
6. Replace trainer People tab markup with the focused Students/Groups workspace.
7. Replace student People tab markup with the focused Groups/Classmates workspace.
8. Run targeted lint, full client build, and `git diff --check`.
9. Add implementation review with the required Before/After/Why table and update project memory.

## Verification Focus

- Trainer add/import/pre-enroll/claim/remove/create/edit flows.
- Student group/classmate visibility and absence of trainer actions.
- Search, empty states, long content, independent show-more controls, focusable dialogs/menus, and reduced motion.
- Preservation of endpoint strings and unrelated Discord edits.

## Rollback

Revert only this task's changes to `ClassroomLiveClient.js` and the new documentation/memory entries. No database, API, dependency, or auth rollback is required because the task is UI-only.
