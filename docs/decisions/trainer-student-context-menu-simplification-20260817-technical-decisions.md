# Trainer Student Context Menu Simplification Technical Decisions

Status: Approved
Task ID: trainer-student-context-menu-simplification-20260817
Owner: Codex
Last updated: 2026-08-17

## Decisions

1. Keep the change UI-only and local to the live classroom.
   - Preserve routes, tab values, default `updates` state, handlers, data fetching, authorization, and unrelated dirty-worktree edits.

2. Use four role-prioritized tab triggers plus a sibling More control.
   - Trainer primary: Updates, Live, Topics, People.
   - Trainer secondary: Threads, Board, Progress Matrix, Contests, Schedule, Attendance, Settings.
   - Student primary: Updates, Topics, Challenges, Live.
   - Student secondary: Threads, Contests, Contest Progress, Group & Roster, Attendance, Settings.
   - Keep More outside the Radix tablist so its menu button does not violate tablist semantics.

3. Centralize navigation selection.
   - Dropdown and context-menu renderers consume the same role-specific item definitions.
   - A single selector updates the controlled tab and runs attendance fetching when required.
   - More uses active styling and menu checks when the controlled value is secondary.

4. Use visible overflow as the accessible path and context menu as an accelerator.
   - Add a minimal shadcn-style wrapper around installed `@radix-ui/react-context-menu`.
   - Scope triggers to the navigation strip and specific repeaters; do not wrap the full classroom page.
   - Avoid pronounced menu motion because these are frequent operational controls.

5. Compact repeated content through progressive disclosure.
   - Student/classmate rows keep name, Student ID, state, and urgent review context; details hold email and remaining identity fields.
   - Group rows keep name, current-group state, and member count; details hold the complete member list.
   - Resource cards keep type, title, short excerpt, and Read; source navigation moves into menus.
   - Hidden metadata remains part of existing local search text.

6. Preserve authorization and workflow ownership.
   - Trainer student commands are Details, conditional Approve/Reject, and confirmed Remove.
   - Trainer group commands are View members and Edit members.
   - Student group/classmate commands are read-only details.
   - Resource commands are navigation only.

7. Replace obsolete tour targets.
   - Primary tab steps remain.
   - Hidden secondary tab steps collapse into one role-specific More step so tours never wait for unmounted menu items.

## Compatibility And Rollback

- No migration, package, server, API, auth, or public-route rollback exists.
- Roll back only this task's two client files and its documentation/memory entries.
