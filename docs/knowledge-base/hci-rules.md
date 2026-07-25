# HCI Rules

## 2026-07-25 - past-class-detail-visualization-20260725 - History Selection Maps To Detail

Source:
- `docs/reviews/past-class-detail-visualization-20260725-implementation-review.md`

Rule:
Completed-session history should show a visible list selection and update an adjacent detail panel, with counts, status labels, loading/error states, and empty states close to the selected class.

Applies when:
Designing classroom history, session review, or in-page drill-down interfaces.

Do not overgeneralize:
Use a separate route only when the history detail needs deep linking, export/report workflows, or enough independent navigation to justify route complexity.

## 2026-07-25 - trainer-class-tags-chat-shadcn-refresh-20260725 - Visible Chat Scope

Source:
- `docs/reviews/trainer-class-tags-chat-shadcn-refresh-20260725-implementation-review.md`

Rule:
Classroom chat must show the selected class/session scope near the message list and disable sending when the selected session is completed or unavailable.

Applies when:
Designing class-specific chat, class history chat, or direct-message controls.

Do not overgeneralize:
Other realtime rooms can use different scope labels when their user mental model is not class-session based.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Dashboard Versus Reader

Source:
- `docs/rsd/classroom-resource-reader-problem-preview-20260725-rsd.md`

Rule:
Classroom dashboards should show resource summaries and actions, while dedicated reader pages should carry full markdown reading.

Applies when:
Designing classroom resource cards, notifications, links, and student study flows.

Do not overgeneralize:
Short snippets and previews still belong in the dashboard when they help students choose what to open.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Topic Assignment Mental Model

Source:
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`

Rule:
Topic assignment UI should clearly separate "build topic unit" from "assign topic to team" and preview included resources/problems before assignment.

Applies when:
Designing classroom topic libraries, team assignment panels, or trainer problem/resource setup.

Do not overgeneralize:
This does not require global topic sharing or external topic imports.

## 2026-07-25 - classroom-team-topic-board-chat-20260725 - Ephemeral Board State Must Be Visible

Source:
- `docs/decisions/classroom-team-topic-board-chat-20260725-technical-decisions.md`

Rule:
Live board UI must show active/inactive, connecting, readonly, disconnected, ended, and no-permanent-save states near board controls.

Applies when:
Designing classroom tldraw broadcast, board join, and board recovery states.

Do not overgeneralize:
Persistent whiteboards need different recovery and history UX.
