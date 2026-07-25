# Trainer Topics Tab Reorganization RSD

Status: Draft (Awaiting Gate Approval)
Task ID: trainer-topics-tab-reorganization-20260725
Owner: Antigravity
Last updated: 2026-07-25
Delivery mode: RSD-First Workflow

## Mode and Gate Policy

RSD-First workflow initiated. This document specifies the requirement satisfaction model for reorganizing the Trainer Topics Tab in classroom live view (`/classroom/live/[id]`).
Required Gate: Approval requested for Primary Requirement Satisfaction Document before technical design and task planning.

## Problem Statement

In the live classroom trainer interface (`/classroom/live/[id]`), the **Topics** tab is currently cluttered and hard to navigate:
1. **Vertical Clutter**: Four large creation/management forms ("Build topic unit", "Assign topic to team", "Add topic resource", "Add topic problem") are stacked in grids at the top of the tab, consuming over 70% of the viewport before the actual Topic Library is visible.
2. **Disconnected Workflow / Cognitive Friction**: Adding a resource or problem to a specific topic requires navigating to a top-level form card, opening a dropdown to select the target topic, filling out the form, submitting, and scrolling back down to check the topic card.
3. **Redundant Controls**: Each top-level form duplicates a topic `<Select>` dropdown.
4. **Poor Context Awareness**: Trainers cannot manage resources, problems, or team assignments in-place directly on the topic unit cards.

## Goal

Reorganize the Trainer Topics Tab (`ClassroomLiveClient.js`) into a scalable, future-proof **Master-Detail Topic Studio**:
1. **Master-Detail Studio Layout**:
   - **Left Master Sidebar**: Vertical topic selector showing all topic units with search filter, module badges, resource/problem counts, active assignment badges, and a prominent `+ Build Topic` action. Bounded height with pagination for 100+ topics.
   - **Right Detail Workspace**: Full-width studio view for the selected topic unit, eliminating empty side space and narrow horizontal scrolling.
2. **Scalable Sub-Tabbed Studio Workspace (Future-Proof for 100-200+ Items)**:
   - Sub-tabbed navigation inside the active topic workspace: `Overview`, `Resources (N)`, `Problems (N)`, `Assigned Teams (N)`.
   - In-topic search & filtering for resources and practice problems.
   - Bounded list views with "Show More" batching (10 items per batch) so 100-200+ items never overflow or stretch the main page vertically.
3. **Dedicated Workspace Sections**:
   - Header with topic metadata and action toolbar (`+ Resource`, `+ Problem`, `Assign Team`, `Refresh`).
   - **Resources Studio**: Full-width resource cards with external link badges, markdown previews, and direct reader links.
   - **Problems Studio**: Full-width problem rows with platform tags, trainer difficulty badges, timer tags, topic tag combobox badges, and direct links.
   - **Assigned Teams & Solve Analytics**: Clear list of assigned student teams with live solve counts and status badges.
4. **Focused Modals / Dialogs**:
   - **Create Topic Modal**
   - **Add Resource Modal** (pre-selected topic context)
   - **Add Problem Modal** (pre-selected topic context)
   - **Assign Topic to Team Modal** (pre-selected topic context)
5. **Dedicated Route**: Support direct navigation via `/classroom/live/[id]/topics` page.

## Non-Goals

- No changes to underlying database schema (`classroom_topics`, `classroom_topic_resources`, `classroom_topic_problems`, `classroom_topic_assignments`).
- No changes to backend API routes or controllers (all existing `POST`, `GET`, `DELETE` endpoints for topics, resources, problems, and team assignments remain untouched).
- No changes to student view of assigned topics.
- No changes to unrelated trainer tabs.

## User-Visible Behavior Changes

1. **Master-Detail Studio Workspace**:
   - Left panel lists topics as clean interactive cards with search filter. Clicking a topic selects it and focuses the right detail panel.
   - Right panel displays the spacious sub-tabbed workspace for the selected topic unit (`Overview`, `Resources`, `Problems`, `Assigned Teams`).
2. **Scalable Pagination & Zero Overflow**:
   - Lists for resources and problems load in bounded 10-item batches with "Show More" controls and inline search.
   - Page height remains stable and readable even when 100-200+ items exist.
3. **Dialog Modals for Authoring & Assignment**:
   - Clicking `+ Create Topic` opens the "Build Topic Unit" modal.
   - Clicking `+ Resource` opens "Add Resource to [Topic Title]" modal.
   - Clicking `+ Problem` opens "Add Problem to [Topic Title]" modal.
   - Clicking `Assign Team` opens "Assign [Topic Title] to Team" modal.

## Acceptance Criteria

- [ ] Top card forms removed from default view; Topics tab starts immediately with the Topic Library overview and metric bar.
- [ ] `+ Create Topic` modal opens smoothly and allows building a new topic unit.
- [ ] Topic cards render resources and problems with clean tabs/accordion structure.
- [ ] `+ Resource` action on a topic card opens a modal pre-targeted to that topic.
- [ ] `+ Problem` action on a topic card opens a modal pre-targeted to that topic (including platform, difficulty, timer, and tag selection).
- [ ] `Assign Team` action on a topic card opens a modal pre-targeted to that topic.
- [ ] All existing topic, resource, problem, and team assignment operations submit successfully using existing API handlers.
- [ ] Client linting (`npm run lint` in `client/`) passes cleanly.

## HCI & UI Quality Expectations

- **Swiss Minimal Aesthetic**: Clean card boundaries, subtle borders, high visual hierarchy, restrained accent colors.
- **Immediate Visual Feedback**: Active loading states during topic refresh or creation, toast notifications on submit.
- **Form Usability**: Clear form field labels, placeholder text, focus styles, and accessible Dialog controls.

## Knowledge Base Alignment

- Follows `docs/knowledge-base/hci-rules.md`: Topic assignment mental model clearly separates topic building from team assignment while providing in-context previews.
- Preserves all existing data contracts established in `docs/knowledge-base/project-index.md`.
