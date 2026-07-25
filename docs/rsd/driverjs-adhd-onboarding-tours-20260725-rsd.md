# Requirement Satisfaction Document (RSD)
## Driver.js ADHD-Friendly Onboarding Tours for Trainer & Student Roles

- **ID**: `driverjs-adhd-onboarding-tours-20260725`
- **Date**: 2026-07-25
- **Status**: Approved

---

## 1. Executive Summary

This feature adds interactive, ADHD-friendly product onboarding tours using `driver.js` for both **Trainer** (Dashboard and Classroom live view) and **Student** (Classroom live view) roles.

Key aspects:
1. **Auto-Invocation on First Visit**: Auto-triggers tour using `localStorage` flags (`mcc_trainer_dashboard_toured`, `mcc_trainer_classroom_toured`, `mcc_student_classroom_toured`).
2. **Re-trigger Button**: A persistent, floating "Take Tour" button on the UI allows users to launch the tour manually at any time.
3. **ADHD-Focused Design**:
   - Short, bite-sized steps (max 6-8 per tour) with explicit step counts (`1 of 7`).
   - High visual contrast, simple language, and emoji anchors in titles.
   - Smooth scrolling, non-distracting overlay backdrop, and easy skip/dismiss support.
   - Missing target elements dynamically skipped (`skipMissingElement: true`).

---

## 2. Requirement Specification & Scope

### 2.1 Package & Reusable Hook
- Install `driver.js` in `client/package.json`.
- Create `client/src/hooks/useTour.js` encapsulating `driver()` initialization, CSS inclusion, state management, auto-start logic, and persistent re-launch.

### 2.2 Trainer Dashboard Tour (`TrainerDashboardClient.js`)
- Add DOM target IDs for key interactive elements (`#trainer-tour-header`, `#trainer-tour-form-btn`, `#trainer-tour-new-classroom-btn`, `#trainer-tour-live-section`, `#trainer-tour-classroom-grid`).
- 7-step guided tour covering welcome, form creation, classroom creation, classroom grid, and live room management.
- Floating "Take Tour" button at bottom right.

### 2.3 Classroom Live Trainer Tour (`ClassroomLiveClient.js`)
- Add DOM target IDs for trainer tab triggers and action areas (`#classroom-tour-header`, `#classroom-tour-tabs`, `#classroom-tour-tab-live`, `#classroom-tour-tab-topics`, `#classroom-tour-tab-board`, `#classroom-tour-tab-analytics`, `#classroom-tour-tab-schedule`, `#classroom-tour-chat-bubble`).
- 8-step guided tour walking through live practice management, topics workspace, whiteboard broadcasting, group analytics matrix, session scheduling, and pet chat.
- Floating "Take Tour" button positioned safely above chat bubble.

### 2.4 Classroom Live Student Tour (`ClassroomLiveClient.js`)
- Add DOM target IDs for student tab triggers (`#student-tour-tabs`, `#student-tour-tab-topics`, `#student-tour-tab-live`, `#student-tour-tab-challenges`, `#student-tour-tab-people`).
- 6-step guided tour introducing assigned topics, live session board/IDE, challenges history, and team roster.
- Floating "Take Tour" button.

---

## 3. Success Criteria & Verification

1. `driver.js` imported and configured safely without SSR breakdown (using client-side `useEffect` initialization).
2. Auto-run triggers on first visit for new users and saves completion status in `localStorage`.
3. Floating "Take Tour" button allows manual re-triggering anytime.
4. ADHD principles satisfied: clean scannable text, explicit progress counter, smooth transitions, easy backdrop click close.
5. Verification: `npm run lint` and `npm run build` pass cleanly in `client/`.
