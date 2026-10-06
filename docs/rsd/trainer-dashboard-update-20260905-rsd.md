# Trainer dashboard update

Status: approved for implementation by the user's 2026-09-05 message accepting `Trainer Dashboard Update.tldraw` and requesting a subagent implementation. The user's later 2026-09-05 dashboard reviews supersede the active/next-session hero and top-right overflow rail: remove both, keep Needs attention to the right of the classroom workspace on wide screens, widen the desktop shell modestly, and return trainer classroom navigation to `/trainer/dashboard`.

## Required outcome

Implement the approved desktop/mobile hierarchy: visible New classroom and Forms actions, meaningful summary chips, a searchable/filterable classroom card or list workspace, a right-side attention list on wide screens, pinned/recent ordering, and correct empty/error/loading states. Do not render a separate Next Session hero or top-right overflow rail. Preserve create wizard, substitutes, trainer/admin checks, and Discord gating. Classroom interior redesign is a separate proposed design.

## Data and behavior

- Enrich `classroom/list?dashboard=true` only for trainers/admins, after existing classroom authorization. Use batched read queries, no migration and no student records or provider secrets in the summary.
- Actual `classes.status = started` is Live. Saved meeting links alone are not. Scheduled classes retain their saved status/time and display overdue schedules honestly.
- Active student counts exclude trainer/admin users. Attention uses `link_pending` memberships and existing stale contest reports.
- Label the latest-updated topic as Latest topic; do not invent current-topic state.
- Persist only user-scoped classroom IDs/pins/recent times in local storage. Search, filter, view, and sort use URL state. Unavailable storage must not break navigation.
- Dashboard links select validated classroom tabs; stale report links may select a validated contest room. Interior layout/handlers are otherwise preserved.

## Acceptance

Actions work with keyboard and touch; 44px mobile controls; focus visible; menus and substitute dialog restore focus; long room names wrap; semantic links support new tabs. Summary loading never renders fake zero counts. Failure offers Retry; zero search results offers Clear filters. Refresh failures retain last-known data with a visible warning. No new dependencies, credentials, database writes, or scoring/provider behavior changes.

Verify relevant state/status/filter logic, focused lint, server bundle, client build, and local rendered behavior where available. Clearly distinguish browser fixtures, authenticated live data, and production deployment. Update project knowledge base and provide an ordered review note.
