# HCI Rules

## 2026-08-01 - Thread Events Belong Behind a Compact Control

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Rule:
Student-thread event history should not render as a long inline strip inside the chat pane. Use a compact event control without a visible count badge that opens a scrollable modal or equivalent bounded history view.

Applies when:
Changing `ClassroomThreadsTab.js`, student-thread system events, latest activity summaries, or trainer/student chat panels.

Do not overgeneralize:
Important one-off send/upload/status errors should still appear inline near the affected control.

## 2026-08-01 - Avoid Flashing and Count-Heavy Thread Controls

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Rule:
Trainer classroom thread and pending-review controls should stay calm by default: avoid pulsing badges for normal pending work and avoid showing item counts unless the count is required for a decision.

Applies when:
Changing pending submission entry points, student-thread rows, event controls, Updates tab headers, or trainer classroom notification badges.

Do not overgeneralize:
Blocking errors, destructive confirmations, and explicit unread indicators can still use stronger visual emphasis when the user must act immediately.

## 2026-08-01 - Thread Bubbles Show Scope and Context

Source:
- `docs/reviews/trainer-submission-thread-bubbles-20260801-implementation-review.md`

Rule:
Floating classroom thread bubbles must show the selected student scope in the header, and submission-launched bubbles must also show the referenced problem/submission context. Referenced messages need an icon/text chip so trainers and students can identify the discussed submission without relying on color.

Applies when:
Designing normal thread bubbles, pending-submission thread actions, student-thread message chips, or classroom review discussion UI.

Do not overgeneralize:
Normal thread bubbles should remain normal conversations without an invented submission context.

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

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - IDE Monitoring Must Be Visible

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
Student IDE surfaces must visibly state that focus, visibility, paste, large insert, and code update activity is logged for trainer review.

Applies when:
Changing classroom IDE, telemetry, focus logging, or trainer monitor UX.

Do not overgeneralize:
Visibility does not make paste/large-insert evidence a cheating verdict; UI must keep that distinction clear.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Team Dashboard Shows Work in Context

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
Trainer team dashboards should show team, member, current problem, open/done counts, IDE state, and a problem/member matrix together so trainers do not have to mentally join separate lists.

Applies when:
Changing trainer team analytics, topic problem progress, live problem assignment, or IDE monitor UI.

Do not overgeneralize:
Topic library cards still should not expose topic-to-team mapping; this rule applies to the trainer team dashboard context.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Team Matrix Responsiveness

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

Fact:
For teams with many members, use a full-width team card, responsive member focus cards, and a horizontally/vertically scrollable matrix with sticky problem/header cells.

Applies when:
Designing team dashboards with 5+ members or many problem rows.

Do not overgeneralize:
Small summary cards can still wrap normally; the matrix is for comparison-heavy work views.
## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Target Before Live Monitoring

Source:
- `docs/reviews/trainer-ide-tracking-team-edit-20260725-implementation-review.md`

Fact:
Trainer live-monitoring surfaces should make the tracked target explicit before short-interval polling starts, then show state badges such as live, paused, recent, stale, and loading.

Applies when:
Designing trainer IDE monitoring, per-student telemetry, board-like live views, or other high-attention tracking surfaces.

Do not overgeneralize:
This does not require target selection for low-cost summary refreshes where the whole class is the natural object.

## 2026-07-31 - Classroom Communication Mental Model

Source:
- `docs/reviews/trainer-student-classroom-threads-realtime-20260731-implementation-review.md`

Rule:
Classroom communication surfaces must keep notification, conversation, and settings concepts separate: `Updates` for attention/read state, `Threads` for student-trainer conversation, and `Settings` for priority/email preferences. Realtime, upload, empty, error, and selected-student scope states should be visible near the chat.

Applies when:
Changing classroom tabs, notifications, student conversations, realtime state, upload state, or priority settings.

Do not overgeneralize:
This does not require `Threads` to become the default tab; the approved model keeps `Updates` first.
