# Trainer Feature Scalability Task Plan

Task ID: trainer-feature-scalability-futureproofing-20260725
Status: Approved
Owner: Antigravity / Trainer Core Team
Last updated: 2026-07-25

---

## Plan Overview

This plan resolves the identified trainer feature scalability and high-data bottlenecks sequentially ("one by one").

---

## Step-by-Step Task Breakdown

### Step 1: Database Expression Indexes & Lookup Optimization
* **Target Files**:
  * [dbInit.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/utils/dbInit.ts)
* **Goal**: Add case-insensitive B-Tree indexes on `users` identifier columns (`lower(email)`, `lower(vjudge_id)`, `lower(cf_id)`, `lower(codechef_id)`, `lower(atcoder_id)`, `mist_id`, `phone`).
* **Verification**: Run `bun run dev` in `server/` to verify schema initialization.

### Step 2: Form Response Pagination & SQL Analytics Aggregations
* **Target Files**:
  * [trainerFormController.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/trainerFormController.ts)
  * [TrainerFormDetailClient.js](file:///c:/Users/Arik/Desktop/mcc/client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js)
* **Goal**: Add limit/offset pagination to form responses endpoint and update client view to fetch paginated response records. Optimize form analytics to query aggregate stats directly in Postgres.
* **Verification**: Test responses API with limit/page parameters and verify form detail client pagination controls.

### Step 3: Payload Size Limits & Scraper Timeout Protection
* **Target Files**:
  * [classroomController.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/classroomController.ts)
  * [trainerFormController.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/trainerFormController.ts)
* **Goal**: Add 3-second timeout protection with quick fallback on competitive programming metadata scrapers. Enforce max 500KB size validation on incoming markdown resources, form answers, and IDE code snapshots.
* **Verification**: Test problem preview endpoint with fallback URL and submit large payloads to test HTTP 400 truncation guard.

### Step 4: Visibility-Aware Smart Client Polling
* **Target Files**:
  * [ClassroomLiveClient.js](file:///c:/Users/Arik/Desktop/mcc/client/src/app/classroom/live/[id]/ClassroomLiveClient.js)
  * [ClassroomIdePanel.jsx](file:///c:/Users/Arik/Desktop/mcc/client/src/app/classroom/live/[id]/ClassroomIdePanel.jsx)
* **Goal**: Ensure live classroom polling intervals (IDE logs, chat history, classroom details) skip execution when `document.visibilityState !== 'visible'`.
* **Verification**: Test browser tab switching to confirm network requests pause in background tabs.

### Step 5: DOM Performance & Export Blob Optimization
* **Target Files**:
  * [TrainerFormDetailClient.js](file:///c:/Users/Arik/Desktop/mcc/client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js)
  * [TeamMatrixClient.js](file:///c:/Users/Arik/Desktop/mcc/client/src/app/classroom/live/[id]/teams/[teamId]/page.js)
* **Goal**: Optimize matrix/table rendering for high volume datasets with CSS containment and slice windowing. Chunk CSV blob generation to prevent browser tab memory exhaustion.
* **Verification**: Run `npm run lint` and `npm run build` in `client/`.

### Step 6: IDE Event Log Pruning Maintenance
* **Target Files**:
  * [classroomController.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/controllers/classroomController.ts)
  * [dbInit.ts](file:///c:/Users/Arik/Desktop/mcc/server/src/utils/dbInit.ts)
* **Goal**: Add automatic log retention policy to prune `classroom_ide_events` older than 7 days or keep maximum 500 events per classroom session.
* **Verification**: Run DB init and verify query execution speed on IDE logs.
