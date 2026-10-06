# Classroom interior implementation review

Date: 2026-09-06  
Scope: trainer-facing classroom interior presentation  
RSD: `docs/rsd/classroom-interior-design-20260905-rsd.md`

## Outcome

The trainer classroom now reads as one teaching workspace. The classroom context and primary sections stay compact, Updates opens with real next/live session context and existing attention data, and Live leads with session controls and a focused assignment task. The approved Contests revision restores the established room rail beside the selected report workspace, adds deterministic local room sorting, and keeps the report and core actions prominent. Existing server routes, provider recovery, scoring, roster, topic, thread, note, hint, status, and verification handlers remain authoritative.

| Before | After | Why |
| --- | --- | --- |
| A permanently dark page and long classroom description led every section | Theme-backed compact context header with description disclosure | Preserves theme support and returns first-screen space to the active task |
| Mobile primary navigation depended on a horizontal strip | Labeled primary destinations wrap into two rows, with a labeled More menu | Keeps Contests visible and keyboard reachable at narrow widths |
| Updates started directly with the activity feed; History and Resources were detached cards below it | A compact real next/live session card and separate attention list lead the existing bounded feed; History, Resources, and Schedule sit beside session context | Gives arrival decisions clear priority without inventing summary scores |
| Live idle state rendered every scheduled class as an equally prominent start button | One next scheduled class leads, with a separate Schedule session action | Makes the next teaching action unambiguous |
| Assignment expanded inline above live progress | Assign problem opens in a viewport-bounded Radix dialog and returns focus to its toolbar trigger | Keeps assignment focused while preserving targets, preview, tags, CSV import, timers, and validation |
| Live progress opened several disconnected row dialogs | Search and All/Awaiting review filters precede the list; Inspect opens a selected-work panel with proof and existing thread actions | Keeps teaching progress and review in one session context |
| A first classroom-interior pass replaced the room rail with a top selector | The approved v2 keeps a bounded 280px desktop room rail and stacks it above the workspace on mobile | Preserves room context while keeping the selected report as the main task |
| Room order followed the API response | Visible Sort by offers Name A-Z, Name Z-A, Most contests, and Fewest contests; Name A-Z is the local default | Makes rooms predictable without changing server data or selected room identity |
| Advanced contest tools competed with core actions | Refresh, Generate report, Share, Add contest, and Add room remain visible; provider access, mappings, ordering, and scoring/merge stay in Tools | Keeps frequent actions obvious and specialist operations reachable |
| Selected-room actions wrapped into unrelated full-width rows | Room identity sits beside one Refresh/Generate/Share group; Add contest and Tools sit beside Contest sources | Keeps report actions together and source-management actions next to the content they affect |
| Room management consumed separate labeled rows and the rail always occupied report width | Sort, add, edit, delete, and hide are compact icon actions beside Rooms with tooltips; the hidden state exposes a Show rooms action beside the report title | Keeps room management available while allowing a persistent report-focus mode |
| Contest sources permanently displaced the report | Sources and merge overview sit in a labeled collapsible region above the report | Preserves every source action while letting the report lead |

## Review flow

1. Review `TrainerClassroomInterior.jsx` and `trainer-interior-model.mjs` for the compact arrival/live session presentation and deterministic upcoming-session/date formatting. They consume only existing classroom/session/attention values and call existing parent handlers.
2. Review `ClassroomLiveClient.js` from navigation to Updates, then Live. The shell changes are trainer-safe and shared navigation labels remain intact. The assignment form body and existing problem actions were moved rather than rewritten.
3. Review `classroom-contest-room-sort.mjs` and its focused test. The helper copies before sorting, uses a case-insensitive name key with exact-name/ID/input-order tie-breaks, and applies name tie-breaks to contest-count modes.
4. Review `ClassroomContestPanel.jsx` from the trainer return branch. The left room rail renders `sortedRooms`, while `selectedRoom` continues to resolve from the untouched `rooms` array by ID. Then follow selected-room actions, source disclosure, and the report. Existing handlers and dialogs remain authoritative.

## Changed files

- `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`: trainer-only shell, navigation, arrival composition, Live workspace/inspector, and Topics/People consistency.
- `client/src/app/classroom/live/[id]/TrainerClassroomInterior.jsx`: compact arrival and active-session presentation components.
- `client/src/app/classroom/live/[id]/trainer-interior-model.mjs`: safe session formatting and upcoming-session selection.
- `client/src/app/classroom/live/[id]/trainer-interior-model.test.mjs`: focused date/session behavior checks.
- `client/src/components/ClassroomContestPanel.jsx`: trainer room rail, room-sort control, selected-room toolbar, Tools menu, source disclosure, stale-report notice, and report composition.
- `client/src/components/classroom-contest-room-sort.mjs`: deterministic non-mutating room ordering.
- `client/src/components/classroom-contest-room-sort.test.mjs`: default, descending, contest-count, tie-break, and immutability checks.
- `docs/rsd/classroom-interior-design-20260905-rsd.md`: records the user's implementation approval.
- `docs/reviews/classroom-interior-design-20260905-implementation-review.md`: reviewer flow, behavioral boundaries, and verification evidence.

## Behavior and safety checks

- Student tab composition and permissions were not changed.
- Active state still requires a persisted started class; a meeting URL is not treated as live.
- Attention counts keep account links and submitted work separate.
- Assignment uses the same API payload and validation. Successful assignment closes the dialog and refreshes the same problem list.
- Inspector, row, and tab changes preserve unsaved note/hint drafts until the trainer explicitly confirms discard; accepted discard clears both inputs.
- Contest report rows, scoring, exports, sharing, room isolation, provider sessions, mappings, saved HTML recovery, snapshots, and source fetch handlers are unchanged.
- Room sorting is client-only. It never mutates `rooms`, never changes persisted contest order, and never changes the selected room ID when the sort mode changes.
- Provider sessions remain transient; no credentials or sample data were added to application files.
- Motion is limited to existing component transitions and press feedback. Frequent tab/list operations do not add decorative animation.

## Verification

- Targeted ESLint: `./node_modules/.bin/eslint src/app/classroom/live/[id]/ClassroomLiveClient.js src/app/classroom/live/[id]/TrainerClassroomInterior.jsx src/components/ClassroomContestPanel.jsx`
- Focused model checks: `node src/app/classroom/live/[id]/trainer-interior-model.test.mjs` (2 passing)
- Focused room-sort checks: `node src/components/classroom-contest-room-sort.test.mjs` (2 passing)
- Production build: `npm run build`
- Isolated browser fixture review: 29 checks passed across trainer navigation, 390px Contests visibility, arrival, Live, Topics, People, contest controls, inspector focus, and note/hint draft keep/discard behavior. Fixture mutations were disabled.

For the 2026-09-06 Contests v2 revision, targeted ESLint, both room-sort tests, `git diff --check`, and a fresh production build passed with 43/43 routes generated. Integration should rerun the isolated 390px/1366px browser review against the combined workspace.

The subsequent selected-room toolbar cleanup passed targeted `ClassroomContestPanel.jsx` ESLint, both room-sort tests, and `git diff --check`. The authenticated browser fixture was unavailable for this follow-up, so its visual result still requires live-account review.

The room rail is visible by default. Its visibility preference is stored under `mcc_classroom_contest_room_rail_visible`, updated immediately in the current tab, and synchronized from browser `storage` events. Trainer classroom content now uses an 1800px maximum width; the student shell remains unchanged.

## Known limits

The live selected-work inspector uses a fixed right column on desktop and a focus-managed Radix dialog on narrow screens. Report freshness remains local to the contest workspace because the classroom shell does not currently receive report state; no cross-tab freshness count was fabricated. The supplied Updates API exposes read, mark-read, and refresh behavior but no announcement-create mutation, so the static drawing's composer was intentionally omitted. Fixture QA did not authenticate a real account, exercise enabled mutations, or establish production/deployment behavior.
