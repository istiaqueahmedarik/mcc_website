# Public Trainer Form Share Identity RSD

Status: Draft
Task ID: public-trainer-form-share-identity-20260726
Owner: Codex/User
Last updated: 2026-07-26
Delivery mode: Manual

## Mode and Gate Policy

Manual mode is selected because the user did not request semi-auto or auto. Required approval gates: RSD, technical decisions, full task plan, and implementation review before final integration. No gates are skipped.

## Grill Mode Summary

Task restatement:
Fix shared trainer form behavior so authenticated users see known MCC profile data as non-editable submission context and can edit only unknown or extra fields; anonymous users fill the form normally without profile autofill from typed IDs; duplicate submissions by the same form identity are blocked.

Answers received:
- Logged-in shared-form users should only edit fields not already known by MCC.
- Known logged-in values should still be visible in the UI so the user knows what will be submitted.
- Logged-out users should fill the form normally.
- Logged-out users should not be able to resubmit if a response already matches their ID.
- Logged-out typed IDs must not autofill all mapped cells.

Assumptions:
- Duplicate blocking should apply to the same `form_id + primary_key_value` identity for both logged-in and logged-out submitters, because the database already models one response per form identity and overwrite is the risky behavior.
- Logged-out users may still be matched server-side by the configured primary key at submission time so classroom invitation and attendance workflows keep linking to MCC users.
- Logged-out users should manually enter any mapped/profile fields shown on the form; the server should not return profile values to the anonymous UI from the resolve path.
- No database schema change is required because `trainer_form_responses_unique_user` already enforces one response per form identity.

Important unresolved questions:
- None blocking. If the product later needs "edit my previous response", that should be a separate authenticated edit flow rather than anonymous overwrite.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: workflow constraints
  Evidence: MCC requires RSD-first work and approval gates before implementation.
  Confidence: High
- Source: `docs/knowledge-base/project-index.md`
  Used for: existing form toggle behavior
  Evidence: `trainer_forms.accepting_responses` controls public submissions and server returns 403 when closed.
  Confidence: High
- Source: `docs/knowledge-base/decisions.md`
  Used for: preserving prior public form submission toggle decision
  Evidence: closed forms are blocked server-side and public UI shows a closed banner.
  Confidence: High
- Source: `server/src/controllers/trainerFormController.ts`
  Used for: current shared-form auth, resolve, submit, mapped-value, and conflict behavior
  Evidence: authenticated users are loaded from a forwarded Bearer token; anonymous resolve currently returns mapped values; submit currently updates on unique conflict.
  Confidence: High
- Source: `server/src/utils/dbInit.ts`
  Used for: data constraints
  Evidence: `trainer_form_responses` has `UNIQUE (form_id, primary_key_value)`.
  Confidence: High
- Source: `client/src/app/forms/[slug]/PublicTrainerFormClient.js`
  Used for: public UI behavior
  Evidence: mapped fields are disabled and populated after resolve; submit triggers resolve when unmatched.
  Confidence: High
- Source: `client/src/app/api/trainer-forms/[...path]/route.js`
  Used for: auth forwarding
  Evidence: Next proxy forwards the `token` cookie as `Authorization: Bearer ...`.
  Confidence: High
- Source: `client/package.json` and `server/package.json`
  Used for: verification commands
  Evidence: client supports `npm run lint` and `npm run build`; server exposes `bun run dev` but no formal test script.
  Confidence: High
- Source: `rsd-orchestrator-agent/references/hci-design-rules.md`
  Used for: UI states and error-recovery expectations
  Evidence: public form should show visible state, clear signifiers, actionable errors, and prevent invalid or unsafe actions.
  Confidence: High
- Source: `rsd-orchestrator-agent/references/code-quality-rules.md`
  Used for: implementation scope and quality constraints
  Evidence: choose the smallest requirement-driven design, avoid drive-by churn, and keep policy explicit.
  Confidence: High

## Goal

Shared trainer forms enforce identity-sensitive behavior without leaking profile data to anonymous users or overwriting previous responses.

## Non-Goals

- Do not redesign the form builder or trainer analytics pages.
- Do not add a new authentication method, CAPTCHA, OTP, or account-verification flow.
- Do not change the trainer form schema unless current constraints prove insufficient.
- Do not implement "edit previous response" or trainer-managed response deletion.
- Do not change existing form accepting/closed behavior.

## Users and Use Cases

- Logged-in student: opens a shared form and sees MCC-known values locked as context, fills only missing/profile-unknown fields and custom questions, then submits once.
- Logged-out student: opens a shared form, manually fills the identifier and form fields, submits once, and receives a clear duplicate message if the identifier has already submitted.
- Trainer: receives responses linked to MCC users where possible, without anonymous users being able to probe profile data by typing IDs.

## User-Visible Behavior

- Logged-in public form:
  - Primary identifier is filled from the authenticated MCC profile and locked.
  - Mapped fields with known server profile values are displayed and locked.
  - Mapped fields with missing server profile values are editable.
  - Custom fields are editable.
  - Required missing editable fields block submit with a specific message.
- Logged-out public form:
  - Primary identifier remains editable.
  - No typed identifier causes profile fields to autofill in the UI.
  - Mapped/profile fields shown by the form are normal editable fields.
  - Submit performs server-side user matching by primary key.
  - If the identifier does not match an MCC user, submission fails with the existing clear "No MCC user found" style error.
  - If the identifier already submitted this form, submission fails with a clear duplicate-response error and does not overwrite the previous response.

## Acceptance Criteria

- [ ] Anonymous `/public/:slug/resolve` no longer returns mapped profile values for a typed ID.
- [ ] Anonymous UI no longer requires a Verify step or autofills mapped fields from a typed ID before submit.
- [ ] Anonymous users can fill mapped/profile fields manually and submit them with custom answers.
- [ ] Submit rejects duplicate `form_id + primary_key_value` responses with a non-success status and clear message instead of updating existing rows.
- [ ] Logged-in users get primary key from the server-side authenticated profile, regardless of client-submitted primary key.
- [ ] Logged-in known mapped values are visible and non-editable.
- [ ] Logged-in missing mapped values are editable and included in the saved response.
- [ ] Closed forms still reject submissions with the existing 403 behavior.
- [ ] Classroom invitation side effect still enrolls the matched user only after a successful new response.

## Constraints

- Keep changes scoped to `trainerFormController.ts`, `PublicTrainerFormClient.js`, and narrowly necessary docs unless implementation reveals a smaller or safer scope.
- Preserve server-side authority for authenticated identity; never trust client-submitted primary-key values from logged-in users.
- Preserve SQL parameterization and avoid logging sensitive profile or answer data.
- Avoid broad UI redesign; only adjust the public form flow enough to make states and editability correct.

## Dependencies

- Next proxy must continue forwarding auth cookies to the Hono public form endpoints.
- The `users` table fields used by `USER_FIELDS` remain the source for server-known authenticated profile values.
- Existing DB uniqueness on `trainer_form_responses(form_id, primary_key_value)` remains available.

## Assumptions

- A response is identified by the configured primary-key value as stored in `trainer_forms.primary_key_field`.
- For anonymous submissions, manual answers for mapped/profile fields are response answers; server matching only links the response to an MCC user and enforces duplicate prevention.
- For authenticated submissions, server-known values override client input; client input is accepted only for missing mapped/profile fields and custom fields.

## Risks and Open Questions

- Risk: anonymous users can still submit for another valid ID because current product logic trusts ID matching for public forms. Mitigation: keep current ID-match model and avoid expanding scope; note future stronger-auth flow if requested.
- Risk: duplicate rejection changes users who expected resubmission to update answers. Mitigation: clear duplicate error and record edit flow as out of scope.
- Risk: saving anonymous manual profile fields may differ from MCC profile data. Mitigation: store the matched user snapshot separately so trainers can compare if needed.

## Test Expectations

- Targeted server verification by running a Bun bundle or syntax check over `server/src/index.ts`.
- Targeted client lint for the public form route or full `npm run lint` if feasible.
- Manual code-path review for authenticated known/missing mapped fields, anonymous submit, anonymous duplicate, anonymous resolve, and closed-form behavior.

## HCI Expectations

The public form must make the current mode visible: logged-in users understand which fields are locked because MCC already knows them, and logged-out users understand they are filling the form manually. Disabled controls need clear context. Duplicate and missing-field errors must be specific, calm, and preserve user input for recovery. The form should prevent unsafe or confusing ordering by not forcing anonymous users through a lookup step that leaks or surprises them.

## Code Quality Expectations

Keep policy close to the existing trainer form controller and public form client. Prefer small helper functions only if they remove repeated known-vs-editable field logic. Avoid new dependencies, schema churn, or broad refactors. Preserve existing route contracts except where the anonymous resolve response must stop exposing mapped values and submit must stop overwriting duplicates.

## Definition of Done

- [x] Mandatory Grill Mode completed
- [ ] RSD gate satisfied for selected mode
- [ ] Technical decision gate satisfied for selected mode
- [ ] Full task plan gate satisfied for selected mode
- [ ] Implementation passes verification
- [ ] Implementation review gate satisfied for selected mode
- [ ] All task branches/worktrees merged into final Git workflow
- [ ] Knowledge base and mistake note updated
