# Task Plan: Trainer Topics Tab Reorganization

Status: Approved
Task ID: trainer-topics-tab-reorganization-20260725
Owner: Antigravity
Last updated: 2026-07-25

## Dependency Graph

```
[RSD & Technical Decisions] -> [Task 1: Add Dialog States & Modals] -> [Task 2: Refactor Header & Topic Cards UI] -> [Task 3: Verification & Review]
```

## Task Breakdown

### Task 1: Add Dialog States and Modals in ClassroomLiveClient.js
- **Scope**: Add dialog open states (`createTopicOpen`, `addResourceOpen`, `addProblemOpen`, `assignTeamOpen`) and active target topic states.
- **Implementation**: Wrap topic creation, resource creation, problem creation, and team assignment forms into shadcn `<Dialog>` structures.
- **Verification**: Ensure modal open/close transitions work without state leaks or broken handlers.

### Task 2: Refactor Header and Topic Cards UI
- **Scope**: Replace the top form cards in `<TabsContent value="topics">` with a sleek Workspace Header (Metrics + Primary Action button) and elevate the Topic Library grid.
- **Implementation**: Add contextual action buttons (`+ Resource`, `+ Problem`, `Assign Team`) on each topic card. Improve resource and problem section layout within each card.
- **Verification**: Visually verify that topics tab starts with Topic Library immediately and card action buttons launch the correct modal with pre-selected topic context.

### Task 3: Verification & Knowledge Base Update
- **Scope**: Run lint and build checks on `client/`. Write implementation review and update `docs/knowledge-base/project-index.md`.
- **Verification**: `npm run lint` and `npm run build` in `client/`.
