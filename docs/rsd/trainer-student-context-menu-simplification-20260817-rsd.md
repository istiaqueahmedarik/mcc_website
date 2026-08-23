# Trainer Student Context Menu Simplification RSD

Status: Approved
Task ID: trainer-student-context-menu-simplification-20260817
Owner: Codex
Last updated: 2026-08-17
Delivery mode: Direct implementation from the user-approved plan

## Task Restatement

Simplify the role-based live classroom workspace by prioritizing four trainer and four student destinations, moving secondary navigation and repeated-item commands into visible overflow menus, and providing equivalent right-click/long-press context menus. Preserve all current capabilities, data visibility rules, routes, tab values, handlers, and server behavior.

## Requirements

- Trainer primary navigation is Updates, Live, Topics, and People.
- Student primary navigation is Updates, Topics, Challenges, and Live.
- Every remaining current destination stays available through a visible More menu and equivalent context menu.
- Attendance selection must keep its existing fetch behavior regardless of how it is selected.
- Context menus are limited to the navigation strip and actionable student, group, classmate, and resource surfaces.
- Repeated rows retain decision-critical identity, status, and counts; secondary identity/member details move into a bounded focus-managed dialog.
- Urgent link-pending review actions stay visible and destructive removal keeps confirmation.
- Search continues matching metadata that is no longer rendered inline.
- Mobile navigation uses five minimum-44px targets; larger layouts use a compact horizontal strip.
- Menus and dialogs must support keyboard operation, visible focus, focus return, collision handling, long content, reduced motion, and light/dark themes.
- Update onboarding tours so no step points at a hidden secondary tab trigger.

## In Scope

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- A local shadcn-style `client/src/components/ui/context-menu.jsx` wrapper over the installed Radix primitive
- RSD, technical decision, task plan, implementation review, and knowledge-base updates

## Out of Scope

- Server routes/controllers, API response shapes, schema, authentication, authorization, polling, or realtime behavior
- URL-backed tab state, new dependencies, global menu restyling, or changes to existing tab values/defaults
- Broad redesign of live forms, analytics tables, topic/problem controls, attendance content, editors, or unrelated classroom cards
- Replacing the browser context menu inside text, links, forms, code, or editor surfaces

## Acceptance Criteria

- All trainer and student destinations remain reachable and render the same content.
- Updates remains the default tab; a selected secondary destination marks More active and is checked in its menu.
- Click, keyboard, right-click, and long-press paths invoke the same command definitions without duplicate mutations.
- Students never receive trainer-only menu commands or newly exposed data.
- Compact details preserve previously visible identity/member facts and return focus to the originating control.
- Resource cards retain Read as the visible primary action while source navigation remains available in both menus.
- Tours, loading/empty/error states, long names, large groups, mobile, mini-laptop, desktop, dark mode, and reduced motion remain usable.
- Targeted ESLint, full client lint, production build, and `git diff --check` pass or have documented pre-existing blockers.

## Sources Used

- `AGENTS.md`
- Required `interface-design`, `apple-design`, and `emil-design-eng` skills
- Radix Context Menu documentation through Context7
- Vercel Web Interface Guidelines baseline
- `docs/knowledge-base/` project memory
- The approved user plan and current dirty-worktree source
