## 2026-07-26 - trainer-logout-option - Hydration Error: Nested HTML Forms

Source:
- `docs/reviews/trainer-logout-option-20260726-review.md`

What happened:
Placing a `<form action={logoutAction}>` inside a client component page wrapped by an outer `<form onSubmit={handleSave}>` caused HTML nesting invalidation (`<form>` inside `<form>`) and a Next.js hydration error.

Detection:
Console runtime error: `In HTML, <form> cannot be a descendant of <form>. This will cause a hydration error.`

Prevention:
When adding secondary actions (e.g. Logout) inside a component already wrapped by an outer form, use `<Button type="button" onClick={handleLogout}>` with `useTransition` to trigger server actions without creating nested `<form>` elements.

## 2026-07-25 - hide-classrooms-tab-for-trainers - Near Miss

Source:
- `docs/reviews/hide-classrooms-tab-for-trainers-implementation-review.md`

What happened:
Full client lint failed because of unrelated existing errors outside this task's write scope.

Detection:
`npm run lint` reported `react/no-unescaped-entities` errors in `client/src/app/admin/contests/combined/aliases/AliasesManagerClient.tsx`.

Prevention:
For narrow UI changes, run full lint when possible, then run targeted lint on changed files and clearly record unrelated blockers.

## 2026-07-25 - trainer-dashboard-ai-resource-writing-assistant - Near Miss

Source:
- `docs/reviews/trainer-dashboard-ai-resource-writing-assistant-implementation-review.md`

What happened:
The first draft of `TrainerWritingAssistant` checked WebGPU support during render with `useMemo`, which could produce different server and browser markup in Next.js.

Detection:
Implementation review caught the hydration mismatch risk before final handoff.

Prevention:
Browser capability status now initializes after mount with `useEffect`, and event handlers re-check support before generation.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Near Miss

Source:
- `docs/reviews/trainer-mode-ui-refresh-20260725-implementation-review.md`

What happened:
The current user requested full autonomous mode while repository `AGENTS.md` normally requires human approval gates, creating a process-policy conflict.

Detection:
RSD setup compared the current user mode request with `AGENTS.md` and the orchestrator delivery-mode rules.

Prevention:
Record the selected Auto mode, skipped gates, and narrow waiver in every artifact; keep the waiver limited to reversible UI-only work and avoid destructive, external, route, API, schema, or authorization changes.

## 2026-07-25 - trainer-mode-ui-refresh-20260725 - Tooling Near Miss

Source:
- `docs/reviews/trainer-mode-ui-refresh-20260725-implementation-review.md`

What happened:
A broad `rg` command hit existing `server/NUL` and returned `Incorrect function`.

Detection:
The search output included `rg: ./server\NUL: Incorrect function. (os error 1)`.

Prevention:
Use scoped file paths for searches in this workspace when possible, or exclude `server/NUL` during broad scans.

## 2026-07-25 - swiss-minimal-learning-ui-refresh-20260725 - Near Miss

Source:
- `docs/reviews/swiss-minimal-learning-ui-refresh-20260725-implementation-review.md`

What happened:
The full client lint suite still failed on an unrelated `react/no-unescaped-entities` error in `client/src/app/admin/contests/combined/aliases/AliasesManagerClient.tsx`, while the changed files only had a nonblocking existing hook warning in `ClassroomLiveClient.js`.

Detection:
`npm run lint` reported the unrelated errors; targeted ESLint on the changed UI files exited successfully with one warning.

Prevention:
For broad UI-only tasks in this repo, always run targeted lint for changed files, record full-suite blockers separately, and avoid "fixing" behavior warnings in live polling code without an approved behavior task.

## 2026-07-25 - past-class-detail-visualization-20260725 - Near Miss

Source:
- `docs/reviews/past-class-detail-visualization-20260725-implementation-review.md`

What happened:
Completed class resources already existed in the data model through `classroom_resources.class_id`, but `getClassroomDetails` filtered them out with `class_id IS NULL`, making past class materials invisible in the main classroom page.

Detection:
RSD source inspection compared `addResource` sending `classId: activeClass?.id || null` with the classroom detail resource query.

Prevention:
When adding class-scoped resource features, verify both the write path and the read path include the same scope, then explicitly filter display sections by `class_id`.

## 2026-07-25 - trainer-class-tags-chat-shadcn-refresh-20260725 - Near Miss

Source:
- `docs/reviews/trainer-class-tags-chat-shadcn-refresh-20260725-implementation-review.md`

What happened:
`bun --check` was not a reliable server verification command in this workspace: `tsc` was blocked by `moduleResolution=node10`, and one `bun --check` route attempt tried to start a server on port 5000.

Detection:
Verification reported `TS5108` for `moduleResolution=node10` and `EADDRINUSE` for port 5000.

Prevention:
Use `bun build src/index.ts --target=bun --outdir .codex-build` as the server parse/bundle smoke check until the server TypeScript config is modernized.
## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Mistake or Near Miss

Source:
- `docs/reviews/classroom-resource-reader-problem-preview-20260725-implementation-review.md`

What happened:
The prior AI writing assistant artifacts and knowledge-base entries became stale after the user said the AI feature was no longer needed.

Detection:
Searches for `TrainerWritingAssistant`, `trainer-writing-ai`, and `@huggingface` showed old docs and KB still referenced the removed AI path.

Prevention:
When a task reverses a recent feature decision, mark old ADR/KB entries superseded instead of only adding new docs.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Layout and Metadata Regression

Source:
- `docs/reviews/classroom-resource-reader-problem-preview-20260725-implementation-review.md`

What happened:
Class-history detail tables could overflow into the sticky chat column, and Codeforces preview fallback title cleanup produced `odeforces Problem`.

Detection:
User screenshots showed the chat sidebar over class-history content and a bad Codeforces preview title.

Prevention:
Use `minmax(0,1fr)`, `min-w-0`, and local scroll containers for dashboard grids with sticky sidebars; never use broad leading-capital regex cleanup on problem titles.

## 2026-07-25 - classroom-resource-reader-problem-preview-20260725 - Assign Form Overflow

Source:
- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`

What happened:
The problem assignment form still overflowed into the chat column because grid children and paired action buttons kept min-content width.

Detection:
User screenshot showed `Preview` and `Assign problem` crossing into the chat sidebar.

Prevention:
For classroom dashboard forms beside sticky sidebars, use `min-w-0` on grid children, `minmax(0,...)` grid tracks, and short/truncated action labels inside narrow tracks.

## 2026-07-25 - trainer-team-dashboard-ide-monitor-20260725 - Monitoring Evidence Near Miss

Source:
- `docs/reviews/trainer-team-dashboard-ide-monitor-20260725-implementation-review.md`

What happened:
The requirement asked to log copied code, but browsers can reliably log paste events and large inserts, not prove where code originated or whether misconduct occurred.

Detection:
RSD Grill Mode and security/HCI review identified the privacy and evidence wording risk before final response.

Prevention:
Future IDE monitor changes must label paste and large-insert events as activity signals, keep monitoring visible to students, and avoid automatic cheating verdict copy unless a future approved RSD defines evidence policy.
## 2026-07-25 - trainer-ide-tracking-team-edit-20260725 - Near Miss

Source:
- `docs/reviews/trainer-ide-tracking-team-edit-20260725-implementation-review.md`

What happened:
The first IDE monitor shape mixed all-student IDE activity into Teams and used short-interval whole-class polling.

Detection:
User reported the logic was broken and too server-heavy.

Prevention:
For live trainer telemetry, require explicit target selection before short-interval polling and keep unrelated dashboard tabs decoupled.

## 2026-07-26 - trainer-qa-fixes-20260726 - Role Pollution Near Miss

Source:
- `docs/reviews/trainer-qa-fixes-20260726-implementation-review.md`

What happened:
Trainer/admin accounts could be inserted into `classroom_students`, which made them appear in student-only People, Groups, Attendance, Assign Problem, and IDE-monitor workflows.

Detection:
Trainer QA with `temp@mcc.trainer.com` showed the trainer account appearing as an enrolled student and valid assignment target.

Prevention:
Treat classroom student membership as a role-clean domain relation: reject trainer/admin users on writes and filter existing polluted rows from every student-only read path.
