# Technical Decisions: Realtime IDE Board, Solution Links & Verification

- **Date**: 2026-07-25
- **Task**: Realtime IDE Board, Solution Links & Trainer Verification Workflow

## Decisions & Architecture

### 1. CodeMirror Syntax & Cursor Styling
- Add `@codemirror/lang-cpp` and `@codemirror/lang-python` dependencies to `client/package.json`.
- Dynamically load language modes in `ClassroomIdePanel.jsx`:
  - `javascript`: `javascript({ jsx: true, typescript: true })`
  - `cpp`: `cpp()`
  - `python`: `python()`
- Cursor CSS rule added to `editorTheme()`:
  ```javascript
  ".cm-cursor, .cm-dropCursor": {
    borderLeft: "2px solid hsl(var(--foreground)) !important",
    visibility: "visible !important",
  }
  ```

### 2. Real-time IDE WebSocket Streaming
- Server route: `/classroom/:id/ide/stream` upgraded using `createBunWebSocket()`.
- WebSocket message types:
  - `subscribe`: Trainer subscribes to classroom IDE updates.
  - `ide_update`: Student broadcasts code updates, focus status, paste events, language change, and cursor position.
- Server relays `ide_update` to subscribed trainers in the same classroom room.
- Fallback: HTTP POST to `/classroom/:id/ide/activity` remains for persistent DB logging.

### 3. Full Screen Mode
- React state `isFullscreen` in `ClassroomIdePanel`.
- When active, applies overlay classes `fixed inset-0 z-50 bg-background p-6 flex flex-col h-screen w-screen overflow-hidden` with a header toolbar for toggling full screen mode.

### 4. Database Schema Extensions
- `classroom_topic_problem_progress`:
  - Add `solution_link TEXT`
  - Add `solution_code TEXT`
  - Add `submission_notes TEXT`
- `class_problems`:
  - Add `solution_link TEXT`
  - Add `solution_code TEXT`
  - Add `submission_notes TEXT`

### 5. Verified Solve Workflow
- Status enum values: `not_solved`, `in_progress`, `pending_approval`, `solved`.
- When student submits solve status, set status to `pending_approval`.
- Trainer API endpoint `/classroom/:id/topic-progress/verify` or update handler enables trainers to set `solved` or reject.
