# Trainer Live Progress Design Refresh RSD

- **Author**: OpenCode
- **Date**: 2026-07-27
- **Status**: APPROVED

## 1. Executive Summary

Trainer Live progress table is visually unbalanced: table content is compressed left, header treatment ends early, controls feel repetitive, and pending submission links are visually noisy. Refresh should improve hierarchy, scan speed, and review affordance without changing routes, APIs, polling, or status behavior.

## 2. Problem Statement

1. **Layout balance**:
   - Table has large unused space on the right while rows feel cramped.
   - Header background width does not feel aligned with full content area.

2. **Review workflow visibility**:
   - Pending submission link appears as small inline text beside the problem title.
   - Trainer needs faster visual cue for rows needing review.

3. **Status readability**:
   - Status select pills work but do not create a strong row-level state hierarchy.
   - Counts for solved/pending/not-solved are absent from the section.

4. **Operational design fit**:
   - Trainer view should remain dense and high-signal, not decorative.

## 3. Scope & Requirements

### 3.1 Live Progress Section Header

- **REQ-1.1**: Add compact summary metrics for total assigned, pending review, solved, and not solved/tried counts.
- **REQ-1.2**: Keep existing End live class action and collapsible behavior.

### 3.2 Table Layout Refresh

- **REQ-2.1**: Make table use full available width and remove the empty right-side dead area.
- **REQ-2.2**: Improve row spacing, column sizing, and typography for student, problem, platform/timer, status, and actions.
- **REQ-2.3**: Preserve scroll behavior for long problem lists.

### 3.3 Pending Submission Treatment

- **REQ-3.1**: Render pending submission proof as a clear review CTA, not cramped inline text.
- **REQ-3.2**: Keep direct external link behavior for submitted proof.

### 3.4 Behavior Preservation

- **REQ-4.1**: Do not change status API calls, notes/hints handlers, class completion handler, polling, or authorization-bearing logic.
- **REQ-4.2**: Use existing Tailwind/shadcn/lucide patterns only.

## 4. Out Of Scope

- Server changes.
- Database changes.
- New dependencies.
- New routes.
- Changing student Challenge tab behavior.
- New polling or background refresh.

## 5. Acceptance Criteria

- Live progress section looks balanced at desktop width shown in screenshot.
- Header, rows, and actions align across full available width.
- Pending submissions stand out as rows requiring trainer review.
- Trainer can still change status and open Notes & Hints exactly as before.
- Client lint has no new errors.
