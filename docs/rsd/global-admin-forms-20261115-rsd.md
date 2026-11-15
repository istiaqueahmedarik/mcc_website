# Global Admin Forms and Registration Campaigns

Status: Approved — user approved scope and autonomous completion on 2026-11-15
Date: 2026-11-15
Owner: User / Codex

## Goal and delivery boundary

Give MCC administrators a global form workspace, accessible from the Admin dropdown, that reuses the classroom form concepts without requiring a classroom. Students register with their MCC account, reuse their profile information, supply missing information through the normal profile-update rules, and review their registration before submitting. Administrators reuse templates, run campaigns, monitor responses and current activity, and filter global contest reports by campaign participation.

This document records the scope approved by the user under the RSD-first workflow in `AGENTS.md`. Implementation and verification evidence are recorded separately in `docs/reviews/global-admin-forms-20261115-implementation-review.md`. Hosted migration and deployment are separate rollout actions.

## User journey

1. An admin opens **Admin → Forms** and chooses **Templates** or **Campaigns**.
2. The admin starts with **TFC Registration** or **General**, edits or clones a template, previews the student experience, and creates a named campaign from it.
3. Starting the campaign activates a shareable campaign link. Ending it closes submissions while retaining its responses and dashboard.
4. A student follows the link. A signed-out visitor sees campaign context and a login action, with the same campaign restored after successful login. New students can create an account and then return through the existing account eligibility process.
5. The server resolves the authenticated student's own profile. Known required data appears in the preview. Only missing or invalid required data needs entry. Existing unverified handles are clearly marked pending, rather than requested again.
6. For a complete TFC profile, the student reviews the preview, checks the agreement, and registers. Otherwise they provide the missing fields first and review the complete proposed submission.
7. Submission records a campaign response and performs the allowed profile updates with the same validation, verification flags, and downstream effects as ordinary profile edits. The receipt distinguishes successful registration from pending profile verification.
8. The admin sees completed registrations, profile-verification attention, and an approximate count of distinct students currently completing the form.
9. In `/contests_report/details/[id]`, the admin can select a campaign and filter report rows to its submitted respondents.

## Requirements

### R1. Administration and access

- Add **Forms** to the existing Admin dropdown on desktop and mobile, linking to `/admin/forms`.
- Administrators can manage all global templates and campaigns. Ordinary trainers do not gain global-form management rights from their trainer role.
- Recheck current account and admin permission on every management read, mutation, response export, and realtime subscription authorization.
- Require an authenticated eligible student account for profile resolution, activity tracking, and submission. Resolve identity from the session, never a typed student ID or request-supplied user ID.
- Before login, expose only intentionally shared campaign title, description, open/closed state, and login action; expose no profile, response, or live administrative counts.
- Scope this policy to new global forms. Existing classroom invitation, attendance, and trainer-form behavior remains compatible.

### R2. Templates and fields

- Seed two usable starters: **TFC Registration** and **General**.
- Proposed TFC required profile fields: student ID (`mist_id`), full name, Codeforces handle (`cf_id`), and VJudge username (`vjudge_id`), plus required registration agreement. Account email can appear as account context; phone, batch, and other OJ fields are optional additions selected by an admin.
- General starts with account identity, a configurable title/description, and editable custom questions. It must not silently require every OJ account.
- Support the existing useful field types: text, long text, number, date, select, and checkbox. Support labels, required state, help text, options, ordering, and a bounded allowlist of student-profile mappings.
- Student ID is a text identifier with a numeric keyboard hint, not a numeric quantity. Validate exactly nine ASCII digits after trimming on both client and server. Apply this to existing invalid IDs as well as newly supplied values when a campaign requires student ID.
- Required false checkboxes fail validation; select answers must belong to configured options; number/date values require type-appropriate validation. Field IDs must be stable and unique within the template; mapped profile fields cannot conflict.
- Admins can create, edit, clone, and preview templates. Clones receive new identities and do not copy responses or activity.
- Starting a campaign freezes its field definitions, required-profile rules, and agreement text. Editing a reusable template affects future campaigns. A changed questionnaire requires a new campaign rather than changing the meaning of historical answers.
- Built-in starters remain available as a recovery path; editable copies can be customized.

### R3. Campaign lifecycle and response integrity

- A template can produce multiple independently named campaigns, each with its own share link and responses.
- Initial lifecycle: **Draft → Open → Ended**. An ended campaign remains readable and can be cloned into a new draft; reopening is outside the initial scope.
- Admin preview is clearly labeled and does not create a real student response or active-student count.
- Enforce open/closed state on the server at commit time. Ending and submitting concurrently must have a deterministic transactional outcome; a closed campaign cannot accept a late response because an old browser tab still shows it open.
- Allow one submitted response per immutable MCC student account per campaign. Concurrent tabs and retries must produce one receipt, never silently replace an earlier answer.
- A response stores the campaign definition/version, authenticated student identity, submitted answers, profile values used at submission, agreement, and submission time. Subsequent profile edits do not rewrite the historical response.
- The initial student flow provides submission and receipt, with no silent editing/resubmission. New registration rounds use a new campaign.
- Preserve typed data on validation or network errors and clearly surface campaign closure or a changed preview before committing.

### R4. Missing profile data and existing verification

- Reuse the business rules behind ordinary profile updates, not a second, more permissive profile-update path. Extract small shared helpers only where real reuse requires it.
- Re-read the profile before submit. Do not overwrite an existing or concurrently updated value with an old missing-field answer. If the preview is no longer accurate, return a recoverable conflict and ask the student to review the refreshed values.
- Codeforces and VJudge updates currently save the supplied value immediately with `cf_verified = false` / `vjudge_verified = false`. Admin approval sets the verified flag; rejection clears that handle. Global-form updates must enter that same queue and never set verified flags themselves.
- Thus a pending value may be prefilled in a later form, but must remain explicitly **Pending verification**. Persisted, submitted, and verified are separate states.
- Name changes currently reset `granted = false`; student-ID updates trigger pre-enrollment claim handling. Preserve these side effects for fields collected by a global form, subject to the safe rejection requirement below.
- Existing general account rejection deletes the user. A profile completion must never accidentally become a deletable new signup. Distinguish profile-origin review from new-account approval, retain the prior values/reason as needed, and ensure rejection of the profile change preserves the existing account and registration. Review this bounded change with the existing admin verification UI; do not repurpose its delete action for profile-change rejection.
- Tighten nine-digit validation in the shared student-ID update path and new form path so ordinary self-service updates cannot undo the rule. Do not bulk rewrite historical IDs or broaden this into unrelated signup/admin import cleanup.
- Custom answers are campaign data unless explicitly mapped to an allowed profile field. Never allow field mappings to roles, password hashes, verification flags, account grants, or arbitrary database columns. Account email/internal identity are read-only context.
- Commit the response and applicable profile updates atomically. A failed update cannot leave a false successful registration; a duplicate retry cannot reapply pending profile changes.
- Admin verification after submission updates current verification badges/attention without changing the submitted answer snapshot. Rejection leaves the historical registration intact and marks its current profile issue.

### R5. Student preview and submission

- Show campaign identity, required profile facts, extra answers, pending-verification labels, agreement, and a single clear registration action.
- Known values remain readable without requiring repetitive typing. Correcting an already present profile value uses the existing profile-edit flow and returns to the form for a fresh preview.
- Complete TFC profiles require only review, agreement, and submit. General forms display their custom questions normally.
- A missing account or expired session returns to login safely, preserving only an allowlisted internal campaign return path. Reject external/protocol-relative redirect targets server-side.
- Invalid or closed links, account eligibility restrictions, already submitted, missing data, pending verification, submitting, success, and recoverable failure all have explicit states.

### R6. Response dashboard and live activity

- Campaign dashboard shows campaign state and controls, submitted count, distinct students currently completing the form, recent responses, and profile-verification attention.
- Provide searchable, paginated responses with submission time, identity, required answers, and separately labeled verification status. Support response detail and CSV export of the current response filters, with safe escaping and spreadsheet-formula protection.
- Use authenticated server-authorized realtime updates for committed response counts and current activity. Reconcile from authoritative reads after connection recovery and show stale/disconnected status honestly.
- **Currently completing** means a distinct authenticated student with a recent server-accepted heartbeat, no submitted response, and a visible campaign page. Proposed heartbeat: every 20 seconds while visible; expire after 60 seconds. Count a student once across tabs; exclude admin previews.
- Stop heartbeats when hidden, closed, or submitted. Use server time and TTL expiry for crashed tabs and missed leave events. Do not depend on browser unload delivery for correctness.
- This is an approximate active count, not proof of typing or a count of all students who will finish. Do not label timed-out students as definitively abandoned or calculate nonrespondents without a defined target roster.
- Never transmit partial answer text or profile data as presence metadata. Students cannot read the admin dashboard, other students' activity, or response feeds.
- Bound heartbeat work, dashboard queries, payload sizes, pagination, and resubscription behavior. An outage must not block normal durable submission.

### R7. Global contest report filtering

- Add a campaign selector at `/contests_report/details/[id]` and preserve it when opening the generated report, refreshing provider data, and navigating Back/Forward.
- Initial filter modes: **All participants** and **Submitted to selected campaign**. Draft/in-progress visits are never counted as responses. Submission eligibility is independent of whether an OJ handle is awaiting approval.
- Join campaign respondents to the existing canonical `student:<users.id>` report identity, not display names, student IDs, or newly supplied unverified handles. Show unmapped/ambiguous report participants as excluded with an explanatory count rather than guessing.
- Proposed semantics: make the selected campaign a persisted participant-eligibility rule for the report. Apply it after canonical identity resolution and before the existing scoring pipeline. Scores that depend on the participant cohort and ranks are calculated consistently for that cohort; formulas, demerits, and adjustment rules themselves remain unchanged. Show the selected campaign, eligible count, excluded/unmapped count, and filter revision. Empty campaigns yield an explicit empty result; never fall back silently to everyone.
- Preserve unfiltered normalized provider source snapshots. Recompute the scored report from those sources when campaign eligibility changes, without requiring fresh provider requests merely to apply a filter. Changing the selected campaign or its respondent set invalidates the scored snapshot; cache/scoring versions must distinguish the chosen cohort and membership revision/cutoff.
- Generated view, exports, and published JSON must consume the same scored cohort snapshot. Publication requires an explicit up-to-date generated report and retains the existing source-availability safeguards. New submissions mark affected saved/public reports stale rather than silently rewriting already published results. Removing the campaign rule restores the full participant cohort through regeneration.
- For TSC reports linked to an existing TFC report, keep the linked published TFC score as the existing reference; apply campaign eligibility to the current report's participants and disclose that the linked TFC values come from their published cohort. Do not silently recalculate another room's historical TFC scores.

### R8. Apple-inspired liquid glass

- Use the existing SF Pro typography, semantic theme tokens, shadcn/Radix controls, and lucide icons.
- Admin workspace: compact campaign/template switcher, clear campaign lifecycle action, quiet metric strip, and a dense response table. Student workspace: a focused preview and agreement with one primary action.
- Use liquid glass for floating navigation, view selection, and the registration action area. Keep table text, form fields, and dense details on stable readable surfaces.
- Reuse or narrowly adapt the existing trainer glass/WebGL lens as the first implementation candidate. Three.js is permitted by the request, but adding another rendering system is unnecessary if the existing lens meets the visual goal.
- Rendering layers remain decorative and pointer-transparent; real semantic controls sit above them. Support context loss, unsupported WebGL/backdrop filtering, reduced motion/transparency, high contrast, and light/dark themes with complete CSS/opaque fallbacks.
- Cap device pixel ratio, render only during changes, pause hidden views, and dispose GPU resources. Lens interaction must not delay typing, keyboard navigation, submission, or live updates.
- Audit keyboard access, visible focus, modal focus management, 44px mobile targets, long titles/answers, loading/empty/error states, URL-backed navigation, mobile/laptop/ultra-wide layouts, contrast, and layout stability against https://vercel.com/design/guidelines.

## Approved defaults

1. TFC requires student ID, name, Codeforces, and VJudge; other OJs and contact questions are optional admin additions.
2. Registration completes while profile/OJ verification is pending. Verification status remains visible; submission never implies approval.
3. One response per account per campaign, frozen campaign questions, and new campaigns for new registration rounds.
4. Contest filtering selects the scoring cohort before ranking; generated results, exports, and publication stay consistent, with explicit regeneration after respondent changes.
5. Nine-digit ID enforcement covers the new form and ordinary self-service student-ID update path; historical database cleanup is excluded.

The user approved these defaults and authorized autonomous completion of the remaining technical decisions, implementation, and verification on 2026-11-15.

## Existing code and why it matters

| Review order | Existing source | Reuse / change boundary |
| --- | --- | --- |
| 1 | `client/src/components/Navbar.js` | Existing desktop/mobile Admin dropdown; add one Forms entry. |
| 2 | `server/src/controllers/trainerFormController.ts`, `server/src/routes/trainerFormRoute.ts` | Field mapping, form definition, shared-form preview and analytics patterns. Current public submission permits identifier lookup and upserts; do not inherit these for authenticated campaign registration. |
| 3 | `client/src/app/trainer/forms/TrainerFormsClient.js`, `client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js`, `client/src/app/forms/[slug]/PublicTrainerFormClient.js` | Builder, response, and prefill patterns; scope global student login requirements separately. |
| 4 | `server/src/controllers/userController.ts`, `server/src/controllers/authController.ts`, `server/src/utils/basicProfile.ts`, `server/src/utils/classroomPreEnrollment.ts` | Preserve profile verification, name reapproval, and student-ID claim side effects; separate profile-change rejection from account deletion. |
| 5 | `client/src/app/login/page.js`, `client/src/lib/action.js` | Inspect and extend safe return-to-campaign handling without changing default login routing. |
| 6 | `server/src/controllers/contestRoomController.ts`, `server/src/services/globalContestReportSnapshotService.ts`, `client/src/app/contests_report/details/[id]/`, `client/src/actions/contest_details.js`, `client/src/components/ReportTable.js` | Canonical report identity, cohort eligibility before scoring, versioned snapshots, consistent exports/publication. |
| 7 | `client/src/app/classroom/live/[id]/TrainerDockLens.jsx`, `client/src/app/classroom/live/[id]/TrainerClassroomDock.module.css` | Existing bounded glass-lens implementation and accessibility fallbacks; verify actual component paths during implementation. |

New global form routes/controllers/services and frontend pages should be separate, small modules. Share proven field/profile helpers where justified; avoid copying the entire trainer controller or weakening classroom permissions to make it global.

## Verification and rollout plan

1. Review the persistence/API/realtime technical design after requirements approval. Load the repository Supabase and Postgres skills before database work. Include additive migration and rollback artifacts, least-privilege grants, RLS, ownership/foreign-key/index/uniqueness constraints, and retention/expiry rules. No production migration is implied by this RSD.
2. Implement persistence and server authorization/lifecycle rules before connecting UI. Use serial writing agents or isolated worktrees with disjoint scopes, following `AGENTS.md`.
3. Verify anonymous, ordinary student, trainer, and admin access; impersonation and unauthorized field mapping; nine-digit ID rejection; existing invalid ID correction; and safe login return handling.
4. Test profile effects for new/pending/verified/rejected CF and VJudge values, name reapproval, safe profile-change rejection without account deletion, pre-enrollment claims, and concurrent profile changes.
5. Test duplicate concurrent submits, lost-response retry, rollback on profile failure, simultaneous campaign end/submission, immutable template snapshots, and cloning isolation.
6. Test presence deduplication across tabs, expiry, hidden tabs, submit removal, disconnect/reconnect, unauthorized subscriptions, and no answer data in activity traffic.
7. Test report eligibility against canonical identities for both providers, empty response sets, pending handles, unmapped participants, correct cohort-dependent scores/ranks, no-filter compatibility, membership-revision cache isolation, source reuse, matching exports/publication, and linked TFC reference semantics.
8. Run focused server tests, client lint, and client build because this crosses navigation, login return handling, and server actions. Record any baseline failures separately.
9. Browser-test complete and incomplete registration, template edit/clone/preview, campaign start/end, live response counts with two sessions, activity expiry, report filters, keyboard use, responsive layouts, and glass fallback. Clearly distinguish fixtures/local tests from authenticated deployed evidence.
10. Write an implementation review in reviewer journey order: lifecycle/data → profile effects → student flow → admin controls/live dashboard → report filtering → design/accessibility → verification and rollout limits. Update `docs/knowledge-base/` at approved workflow milestones.

## Acceptance summary

The feature is complete only when an admin can start a campaign from either starter, share it, receive an authenticated student's reviewed registration with correct profile-update semantics, see responses and approximate active activity update, end submissions reliably, and view/export a contest report narrowed to that campaign's respondents. Existing classroom forms, profile approval authority, and contest scoring remain compatible. User approval authorizes autonomous technical decisions, implementation, verification, and review within this scope. Production deployment remains a separate rollout boundary.
