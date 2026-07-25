# Trainer Feature Review & High Data Volume Scalability RSD

Status: Proposed
Task ID: trainer-feature-scalability-futureproofing-20260725
Owner: Antigravity / Trainer Core Team
Last updated: 2026-07-25
Delivery mode: Approval Required

---

## Executive Summary

This document performs a comprehensive technical review of all **Trainer Features** across the repository (`client/src/app/trainer/`, `client/src/app/classroom/live/`, `server/src/controllers/trainerFormController.ts`, `server/src/controllers/classroomController.ts`, and `server/src/utils/dbInit.ts`).

It identifies critical performance bottlenecks, high data volume failure points, memory leaks, unindexed queries, and DOM rendering lags that occur when user activity scales (e.g., 500+ enrolled students, 10,000+ form responses, high-frequency live room updates).

---

## Detailed Audit of Scalability & High Data Volume Issues

### 1. Database & Server Query Performance (PostgreSQL / Hono)

* **Issue 1.1: Full Sequential Scans on User Identifiers in Trainer Form Submissions**
  * *Location*: [trainerFormController.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/trainerFormController.ts#L171-L248) (`findUserByPrimaryKey`)
  * *Description*: Form submission matches user records by evaluating `lower(email)`, `lower(full_name)`, `lower(vjudge_id)`, `lower(cf_id)`, `lower(codechef_id)`, `lower(atcoder_id)`, and `mist_id`. None of these text expression queries have functional/case-insensitive database indexes.
  * *Impact under high data*: When the `users` table grows to thousands of records, every single form submission executes full sequential table scans, causing database CPU spikes and submission timeouts.

* **Issue 1.2: Unbounded Form Responses & Analytics Payload**
  * *Location*: [trainerFormController.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/trainerFormController.ts#L578-L590) (`getTrainerFormResponses`) & [L623-L642](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/trainerFormController.ts#L623-L642) (`getTrainerFormAnalytics`)
  * *Description*: Form responses and analytics fetch *all* response rows in a single query (`SELECT * FROM trainer_form_responses WHERE form_id = ...`) without pagination (`LIMIT`/`OFFSET` or cursor). Server-side analytics loop over all response JSON objects in Node/Bun JS heap per request.
  * *Impact under high data*: A form with 10,000+ responses will load tens of MBs into Hono server RAM, leading to Out-Of-Memory (OOM) worker crashes and long response latency.

* **Issue 1.3: Unbounded Classroom Problem Matrix & History Queries**
  * *Location*: [classroomController.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/classroomController.ts#L1160-L1200) (`getClassProblems`) & [L1901-L1990](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/classroomController.ts#L1901-L1990) (`getClassroomTopicAnalytics`)
  * *Description*: Fetching class problems fetches every assigned problem for every student in a classroom without limit or batching. In a classroom with 200 students assigned to 50 problems, a single GET request returns 10,000 rows with nested JSON strings.
  * *Impact under high data*: Extreme network overhead and payload size (>5-10 MB JSON payload per live page poll).

* **Issue 1.4: Unbounded IDE Event Table Growth**
  * *Location*: [dbInit.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/utils/dbInit.ts#L314-L336) (`classroom_ide_events`) & [classroomController.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/classroomController.ts#L1995-L2090) (`recordClassroomIdeActivity`)
  * *Description*: IDE monitoring logs every focus blur, paste, and code insert into `classroom_ide_events` with no prune/retention strategy or partition.
  * *Impact under high data*: Millions of row inserts over time degrade index write speeds and slow down trainer IDE event queries (`ORDER BY created_at DESC`).

---

### 2. Client-Side Rendering & Memory Bottlenecks (Next.js / React)

* **Issue 2.1: Lack of DOM Virtualization on High-Volume Lists and Team Matrices**
  * *Location*: [TeamMatrixClient.js](file:///c:/Users/Arik/Desktop/mcc/client/src/app/classroom/live/[id]/teams/[teamId]/page.js), [TrainerFormDetailClient.js](file:///c:/Users/Arik/Desktop/mcc/client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js), [ClassroomLiveClient.js](file:///c:/Users/Arik/Desktop/mcc/client/src/app/classroom/live/[id]/ClassroomLiveClient.js)
  * *Description*: Renders tables and lists directly as full DOM trees (e.g. 5,000 matrix cells for 100 students x 50 problems).
  * *Impact under high data*: Browser DOM freezing, high GPU memory usage, low FPS during scrolling, and UI unresponsiveness.

* **Issue 2.2: Aggressive Client Polling Loops under Live Classrooms**
  * *Location*: [ClassroomLiveClient.js](file:///c:/Users/Arik/Desktop/mcc/client/src/app/classroom/live/[id]/ClassroomLiveClient.js#L1978-L2027) & [ClassroomIdePanel.jsx](file:///c:/Users/Arik/Desktop/mcc/client/src/app/classroom/live/[id]/ClassroomIdePanel.jsx#L444)
  * *Description*: Multi-interval polling running simultaneously on every connected client:
    * IDE Activity polling: Every 5 seconds (`fetchIfVisible`)
    * Chat history polling: Every 15 seconds
    * Classroom details polling: Every 30 seconds
  * *Impact under high data*: 200 active students produce 40 HTTP requests/second to the server for IDE logs alone, swamping Bun event loops.

* **Issue 2.3: In-Memory Blob Generation for CSV/JSON Export**
  * *Location*: [TrainerFormDetailClient.js](file:///c:/Users/Arik/Desktop/mcc/client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js)
  * *Description*: Generates CSV download strings in browser memory using `new Blob([...])` and `URL.createObjectURL`.
  * *Impact under high data*: Exporting 20,000 detailed form responses can exceed browser maximum string size (256MB/512MB limit depending on browser V8 engine), causing tab crashes.

---

### 3. Stability, Payload Guardrails & Edge Cases

* **Issue 3.1: Synchronous External Competitive Programming API Scrapes**
  * *Location*: [classroomController.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/classroomController.ts#L86-L162) (`fetchProblemMetadata`)
  * *Description*: When a trainer assigns or previews a Codeforces/AtCoder problem, the server synchronously fetches external URLs.
  * *Impact under high data*: If external APIs slow down or rate-limit the server (HTTP 429), trainer problem creation requests block, timeout, or fail.

* **Issue 3.2: Missing Maximum Payload & Field Length Limits**
  * *Location*: [trainerFormController.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/trainerFormController.ts#L780-L880) & [classroomController.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/classroomController.ts#L2350-L2400)
  * *Description*: Markdown resource content, IDE code bodies, and form submission answers lack payload size truncation guards (e.g. 100KB or 1MB limit).
  * *Impact under high data*: Malicious or accidental posting of ultra-large payloads (e.g. 50MB strings) leads to high database write locks and bandwidth exhaustion.

---

## Proposed Future-Proofing Solutions

1. **Database Indexing & Query Optimizations**:
   * Add B-Tree / LOWER expression indexes on `users(lower(email))`, `users(lower(vjudge_id))`, `users(lower(cf_id))`, `users(lower(mist_id))`, `users(phone)`.
   * Introduce limit/offset pagination to `getTrainerFormResponses` (e.g. default page size 50, maximum 250).
   * Optimize Hono server-side analytics using PostgreSQL aggregate queries (`COUNT(*)`, `JSONB_AGG`) instead of in-memory JS loops.

2. **Client-Side Virtualization & Polling Optimization**:
   * Virtualize large tables (Form Responses, Team Matrix, Classroom Roster) using windowed rendering (`@tanstack/react-virtual` or CSS container containment).
   * Refactor IDE monitoring and Live Classroom polling:
     * Add visibility check (`document.visibilityState === 'visible'`) before firing interval calls.
     * Implement exponential backoff or SSE/WebSocket event streams for IDE event broadcasts.

3. **Database Maintenance & Guardrails**:
   * Add automatic retention window / pruning job for `classroom_ide_events` (retain latest 500 events per classroom or last 7 days).
   * Enforce strict request body size validation (max 500KB per markdown resource / submission answer) using Hono validation schemas.
   * Add background fallback or timeout wrappers (3s timeout) for external competitive programming metadata scraping.

---

## Verification Plan

### Automated Verification
- Run database initialization index creation script.
- Execute client lint and build checks:
  ```powershell
  Set-Location client
  npm run lint
  npm run build
  ```
- Test paginated API responses and query speed on server:
  ```powershell
  Set-Location server
  bun run dev
  ```

### Manual Verification
- Test trainer form submission with large datasets.
- Test Team Matrix and Form Detail rendering speed with 500+ rows.
- Verify page responsiveness and memory stability during live sessions.
