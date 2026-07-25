# Trainer IDE Realtime Board, Solution Links & Verification RSD

- **Author**: Antigravity
- **Date**: 2026-07-25
- **Status**: DRAFT (Awaiting User Approval)

## 1. Executive Summary

This requirement addresses key deficiencies in the trainer classroom IDE and problem solve workflow:
1. **Real-time IDE Monitoring & C++ Highlighting**: Replaces 5-second HTTP polling with real-time WebSocket streaming for student IDE activity, adds full C++ and Python syntax highlighting, and fixes cursor visibility in CodeMirror.
2. **Full Screen IDE Mode**: Adds full screen toggle capabilities to both student and trainer IDE interfaces for focused distraction-free work.
3. **Solution Link & Code Submission**: Enables students to submit solution links (VJudge, Codeforces, GitHub, LC) and paste code/notes when submitting problem progress.
4. **Trainer Verification for Solved Problems**: Prevents unverified self-approval by requiring trainer approval (`pending_approval` status) before a problem progress is marked as `solved`.

---

## 2. Problem Statement

1. **IDE Monitoring & Syntax**:
   - The current IDE monitor uses 5-second HTTP polling, creating latency and unnecessary network overhead instead of a live board experience.
   - CodeMirror language extension for C++ (and Python) is missing, leaving C++ code without proper syntax highlighting.
   - The editor cursor is faint or hidden in certain themes.
2. **IDE Workspace Bounds**:
   - The IDE panel is constrained within cards, limiting code visibility during long sessions.
3. **Missing Solution Proof**:
   - Students cannot attach solution links or code snippets when updating progress.
4. **Self-Marking Vulnerability**:
   - Students can mark any problem as `solved` without submitting proof or receiving trainer review.

---

## 3. Scope & Requirements

### 3.1 Syntax Highlighting & Cursor Fixes
- **REQ-1.1**: Integrate `@codemirror/lang-cpp` and `@codemirror/lang-python` into `ClassroomIdePanel.jsx`.
- **REQ-1.2**: Ensure CodeMirror cursor (`.cm-cursor`) has explicit high-visibility CSS styling in light and dark themes.

### 3.2 Real-time WebSocket IDE Board
- **REQ-2.1**: Establish WebSocket endpoint `/classroom/:id/ide/stream` on the Bun/Hono server for real-time IDE activity streaming.
- **REQ-2.2**: Stream student IDE edits, language changes, and focus updates to subscribed trainers in real-time.
- **REQ-2.3**: Allow trainers to view live student code updates in real-time without 5-second HTTP polling.

### 3.3 Full Screen IDE Mode
- **REQ-3.1**: Provide a full-screen toggle button on `ClassroomIdePanel` (for both student IDE and trainer monitor).
- **REQ-3.2**: Expand editor to fill the screen (`fixed inset-0 z-50`) with clean header controls and full editor height.

### 3.4 Solution Link & Code Submission
- **REQ-4.1**: Extend problem progress schemas (`classroom_topic_problem_progress` and `class_problems`) with `solution_link` and `solution_code`/`submission_notes`.
- **REQ-4.2**: Add solution link input and code paste fields in student problem progress modals/cards.
- **REQ-4.3**: Display submitted solution links and code snippets in trainer team matrix, IDE board, and student progress reviews.

### 3.5 Verification & Trainer Approval Workflow
- **REQ-5.1**: Change student solve submission behavior: when a student submits a solution or requests solve status, set status to `pending_approval`.
- **REQ-5.2**: Display amber "Pending Approval" badges to both students and trainers.
- **REQ-5.3**: Allow trainers to review submitted solution links/code and click **Approve** (sets status to `solved`) or **Reject** (resets status to `in_progress`). Trainers retain direct solve override capability.

---

## 4. Verification Plan

### Automated Verification
- `Set-Location client; npm run lint`
- `Set-Location server; bun run dev` (verification of backend routes)
- `Set-Location client; npm run build`

### Manual Verification
- Test C++ syntax highlighting in student IDE.
- Test cursor visibility in dark/light modes.
- Verify real-time WebSocket IDE streaming between student and trainer tabs.
- Test full screen toggle on student and trainer IDE views.
- Submit a solution link and code as a student; verify status becomes `pending_approval`.
- Approve the solution as a trainer; verify status transitions to `solved` and matrix updates.
