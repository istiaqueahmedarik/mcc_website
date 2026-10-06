# Trainer Team List & Spreadsheet Matrix View RSD

Status: Draft (Pending User Approval)
Task ID: trainer-team-list-matrix-view-20260725
Owner: Antigravity
Last updated: 2026-07-25

## Requirement Overview

In Trainer Mode (live classroom analytics / teams section):
1. **Simplified Team List View**: Simplify the main classroom team display so trainers see a clean, concise list of teams with key summary metrics (Team name, member count, solve rate, topic assignments, and action buttons). Remove inline expansion of full member focus cards and heavy problem matrices directly on the main classroom page.
2. **Dedicated Team Matrix Page (`/classroom/live/[id]/teams/[teamId]`)**: Clicking on a team or a "View Matrix" button navigates to a dedicated team matrix page.
3. **Google Sheets Spreadsheet Matrix Layout**: Organize team problem performance into a spreadsheet matrix view modeled directly on the provided specification image:
   - **Judge** (Platform / Online Judge, e.g., HackerRank, Codeforces, Toph, CSES, LightOJ, UVA)
   - **Problem ID / Title** (Problem name or identifier with direct link)
   - **Topic** (Topic module and title, e.g., "1. Intro 1", "2. Nim 1")
   - **Average Difficulty** (Aggregated average problem difficulty rating)
   - **Per-Member Grouped Columns** (For each team member: Arik, Shihab, Raisa, Nishat, Ragib, Rafsan, Hasnat, etc.):
     - **Difficulty**: Per-member difficulty rating/level (e.g., 1, 2, 3...)
     - **Verdict**: Problem verdict status (Solved, Unsolved/Not solved, Tried)

## Affected Areas & Entry Points

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`: Update `TeamDashboardPanel` to render a clean team list with navigation triggers instead of inline heavy matrices.
- `client/src/app/classroom/live/[id]/teams/[teamId]/page.js`: New server page component for team detail route.
- `client/src/app/classroom/live/[id]/teams/[teamId]/TeamMatrixClient.js`: New interactive client component rendering the full Google Sheets spreadsheet matrix table.
- `docs/knowledge-base/`: Update project memory artifacts after approval and implementation.

## User-Visible Behavior

- On `/classroom/live/[id]` (Teams tab): Trainers see a sleek, clean list of team summary cards with member count, solve rate, Assigned/Solved/Tried/Open breakdown, "Edit Members" button, and "View Team Matrix" button.
- Clicking "View Team Matrix" navigates to `/classroom/live/[id]/teams/[teamId]`.
- On the dedicated team matrix page:
  - Header with `← Back to classroom`, Team Name, Member list, high-level summary cards, and team member editor.
  - Interactive, full-width spreadsheet matrix table matching Google Sheets layout with fixed column headers, sticky problem info, and side-by-side member Difficulty & Verdict columns.

## Verification Plan

1. Run `npm run lint` in `client/`.
2. Run `npm run build` in `client/` to verify all dynamic Next.js routes compile without errors.
