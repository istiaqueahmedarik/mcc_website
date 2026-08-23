# Trainer Student Context Menu Simplification Implementation Review

Status: Approved
Task ID: trainer-student-context-menu-simplification-20260817
Owner: Codex
Last updated: 2026-08-17

## Reviewer Flow

Start with `client/src/components/ui/context-menu.jsx`, then review `client/src/app/classroom/live/[id]/ClassroomLiveClient.js` in this order.

1. The new UI primitive is a minimal wrapper around the already-installed Radix Context Menu package. It supplies semantic surface tokens, focusable 40px items, collision padding, looping keyboard navigation, and reduced-motion-safe styling without changing dependencies.
2. Role-specific primary and secondary navigation definitions preserve every existing tab value while changing only labels and placement. `ClassroomRoleNavigation` renders four Radix tab triggers plus a visible More dropdown and a scoped navigation context menu from the same secondary definitions.
3. `selectClassroomTab` is the single navigation side-effect path. Tab triggers, the visible More menu, and the context menu all update the controlled tab through it, including the existing attendance-summary fetch.
4. `ActionMenuItems`, `VisibleActionMenu`, and `ContextActionContent` render repeatable commands from shared local action arrays. Trainer-only mutations remain trainer-only, disabled review actions keep their loading state, and removal still opens the existing confirmation dialog.
5. `PeopleDetailsDialog`, compact student/group rows, and compact resource cards move secondary facts behind intentional disclosure while retaining urgent review context, status, member counts, and the visible Read action. Existing search helpers still index hidden email, ID, status, claimed identity, and member fields.
6. Trainer and student tours now describe the four visible destinations and target the persistent More trigger rather than hidden secondary tab controls.

## Requirement Review

| Before | After | Why |
| --- | --- | --- |
| Ten or eleven classroom destinations had equal-weight tab triggers. | Each role has four frequent tab destinations plus one visible More control; right-click/long-press on the strip opens the same secondary destinations. | Establishes role-specific hierarchy without removing capabilities or changing tab values. |
| Secondary destinations had independent tab triggers and navigation side effects. | Shared role definitions feed both menu renderers, and all selection paths call one controlled-tab handler. | Keeps labels, icons, selected state, and attendance fetching consistent. |
| Student rows exposed email and multiple identity fields inline. | Rows retain name, Student ID, enrollment state, and urgent link-review context; a bounded details dialog contains the remaining identity fields. | Improves roster scanning while preserving information access and hidden-field search. |
| Group rows rendered complete member previews inline. | Rows retain group name, My group state where applicable, and member count; View members opens the complete list. | Prevents large groups from dominating the main People surface. |
| Resource cards repeated Read and source-link actions in the visible card. | Read remains the visible primary action; Read page and optional Open source link share the overflow/context command definition. | Removes duplicated visual weight while keeping source access discoverable. |
| Existing row overflow controls and row actions were not paired with contextual acceleration. | Trainer students, trainer groups, student groups, classmates, and resources have scoped context menus backed by their visible overflow commands. | Adds right-click/long-press efficiency without making it the only access path. |
| Tours could describe or target a broad set of tab controls. | Tours target the four persistent primary destinations and one persistent More trigger per role. | Prevents onboarding from pointing at menu items that are not mounted yet. |

## Files Changed

- `client/src/components/ui/context-menu.jsx`
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
- `docs/rsd/trainer-student-context-menu-simplification-20260817-rsd.md`
- `docs/decisions/trainer-student-context-menu-simplification-20260817-technical-decisions.md`
- `docs/tasks/trainer-student-context-menu-simplification-20260817-task-plan.md`
- `docs/reviews/trainer-student-context-menu-simplification-20260817-implementation-review.md`
- `docs/knowledge-base/project-index.md`
- `docs/knowledge-base/decisions.md`
- `docs/knowledge-base/patterns.md`
- `docs/knowledge-base/quality-rules.md`
- `docs/knowledge-base/hci-rules.md`
- `docs/knowledge-base/doc-usage.md`

## Compatibility And Security Review

- No server route, endpoint, response shape, schema, polling, authorization, or persistence behavior changed.
- No client dependency or lockfile changed; the implementation uses the installed `@radix-ui/react-context-menu` package.
- Trainer mutations are constructed only inside the trainer renderer. Student group and classmate menus expose read-only details only.
- Context triggers are limited to the navigation strip and applicable rows/cards. The resource Read area and visible menu triggers stop propagation so ordinary link/control context behavior is not replaced.
- Removal continues through the existing controlled confirmation. Account-link decisions continue through the existing handler and loading keys.

## Accessibility And Interface Audit

- Mobile navigation is a five-column grid with five minimum-44px targets; the existing compact horizontal treatment resumes at `sm`.
- The More control has an active state and current-section accessible label when a secondary destination is selected. The selected menu destination includes a check and screen-reader current text.
- Radix supplies long-press, context-key, arrow-key, Escape, focus management, and collision behavior. The visible dropdown remains the keyboard/discovery equivalent.
- The details dialog is height-bounded, scrolls large groups, wraps long identity values, disables positional animation for reduced motion, and returns focus to the originating ellipsis control.
- Semantic theme tokens are used for menu surfaces, focus states, borders, foregrounds, and muted text; frequent menus intentionally avoid pronounced open/close animation.

## Verification

- `npx eslint 'src/components/ui/context-menu.jsx' 'src/app/classroom/live/[id]/ClassroomLiveClient.js'`: passed.
- `npm run lint` in `client/`: passed with 10 existing warnings in unrelated files and no errors.
- `npm run build` in `client/`: passed; Next.js compiled, type-checked, and generated all 42 static routes.
- Source audit confirmed all trainer/student primary and secondary values still have matching controlled content, and obsolete secondary tour targets are absent.
- Source audit confirmed hidden student/group fields remain in search text and trainer-only actions are not created in student renderers.
- `git diff --check`: passed for the complete dirty worktree after the implementation review and memory updates.

## Residual Risk

- Authenticated browser visual QA with real trainer/student classroom data was not available in this environment. The production build and source-level accessibility audit cover compilation and interaction contracts, but final product QA should still exercise a logged-in classroom at 320px, tablet, mini-laptop, desktop, dark mode, high contrast, and reduced motion.
- The worktree already contained substantial unrelated classroom, Discord, contest, server, and project-memory changes. This implementation preserved those user-owned edits and did not attempt to isolate or revert them.
