# Trainer Student Context Menu Simplification Task Plan

Status: Approved
Task ID: trainer-student-context-menu-simplification-20260817
Owner: Codex
Last updated: 2026-08-17

## Sequence

1. Record the approved RSD, technical decisions, task plan, and planning-memory entries.
2. Add the minimal Radix context-menu UI wrapper using existing semantic tokens.
3. Add local navigation definitions/renderers and central tab selection in `ClassroomLiveClient.js`.
4. Replace trainer/student tab clouds with four primary tabs plus More and scoped navigation context menus.
5. Add shared repeatable-item action rendering, compact student/group/resource presentation, and the bounded details dialog.
6. Update trainer/student tours for the new navigation hierarchy.
7. Run targeted lint, full lint/build, diff checks, and source-level interaction/security audits; fix task-introduced failures.
8. Add the implementation review and final project-memory entries.

## Verification Focus

- Every role/destination and attendance fetch side effect
- Visible menu and right-click/long-press command parity
- Keyboard focus, Escape, focus return, destructive confirmation, and disabled/loading states
- Role-clean actions and unchanged roster visibility semantics
- Hidden-metadata search and long/missing identity/member/resource content
- 320px mobile through ultra-wide, dark mode, contrast, reduced motion, and native context menus outside scoped triggers

## Rollback

Revert only this task's client and documentation changes. No database, server, auth, route, dependency, or data rollback is required.
