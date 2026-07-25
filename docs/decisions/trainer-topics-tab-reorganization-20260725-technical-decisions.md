# Technical Decisions: Trainer Topics Tab Reorganization

Status: Approved
Task ID: trainer-topics-tab-reorganization-20260725
Owner: Antigravity
Last updated: 2026-07-25

## 1. UI Component Architecture Decision

### Context
The initial card grid layout left large empty spaces on the right side of the screen when few topics were present, while squishing resource and problem lists into narrow half-card columns that forced horizontal scrollbars on problem rows.

### Decision
1. Adopt a **Master-Detail Studio Layout** for the trainer Topics Tab:
   - **Left Master Sidebar** (`selectedTopicId` state): Displays a vertical topic selector with search input, topic status badges, problem/resource counts, assigned team badges, and a primary `+ Build Topic` button. Bounded height container with scrolling.
   - **Right Detail Studio**: Renders the complete workspace for the currently selected topic unit.
2. Introduce **Sub-Tabbed Navigation & Scalable Batch Pagination** inside the Detail Studio Workspace:
   - Sub-tabs (`activeStudioTab` state): `Overview` (compact summary of everything), `Resources (N)` (dedicated resource workspace), `Problems (N)` (dedicated problem workspace), `Assigned Teams (N)` (team tracking).
   - In-topic search inputs (`inTopicResourceSearch`, `inTopicProblemSearch`) to filter 100-200+ resources/problems instantly.
   - Batch pagination (`visibleTopicResourcesCount`, `visibleTopicProblemsCount` defaulting to 10): Displays items in controlled batches with "Show More (X remaining)" buttons, keeping page height stable and avoiding endless vertical scrolling.
3. Introduce four UI `Dialog` modals using shadcn/Radix components (`Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`) pre-targeted to the selected topic.

## 2. Component Scoping Decision

### Context
`ClassroomLiveClient.js` is a primary client component containing several classroom live sub-surfaces.

### Decision
Extract the reorganized Trainer Topics presentation into a clean, reusable component or sub-section within `ClassroomLiveClient.js` or dedicated helper component to keep code maintainable and prevent regressions in other tabs.

## 3. Data Integrity & Validation

### Decision
Form validation rules remain intact:
- Topic Title is required.
- Resource Title is required.
- Problem Link is required.
- Selecting a Topic and Team is required for assignment.
Closing a dialog modal resets form state or leaves state cleanly initialized for the next operation.
