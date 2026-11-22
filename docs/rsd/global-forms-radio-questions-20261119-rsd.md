# Global Forms Radio-Button Questions

Status: Draft — implemented with the proposed defaults below; decisions to be confirmed by the maintainer in PR review
Date: 2026-11-19
Issue: [#50](https://github.com/istiaqueahmedarik/mcc_website/issues/50) (`sp:5`, `type:feature`)
Contributor: rashed-48

## Goal and delivery boundary

Administrators can add a single-choice **radio** question to global form templates. Students see every option at once and can select exactly one. The server accepts only one value from the campaign's frozen options.

This change is limited to global forms (`/admin/forms`, `/register/[slug]`, `/global-forms` routes). It adds no database migration, package dependency, or environment variable. Field definitions are already stored as JSON arrays without a type constraint. Trainer/classroom forms, existing global field types, campaign lifecycle, profile verification, and contest-report filtering are unchanged. Hosted deployment is a separate owner action after merge.

## User journey

1. An admin edits or creates a template, adds a question, and chooses **Radio**.
2. The admin enters a label, at least two options (one per line), and a required/optional setting, then saves. Unusable option lists are rejected with an error naming the question.
3. A campaign created from the template freezes that question, as for every other field type.
4. A student opens `/register/<slug>` and sees a labelled group of radio buttons. Pointer or keyboard selection keeps exactly one option selected.
5. On submit, the server validates the answer against the campaign's frozen options and stores it as a single string.
6. The admin sees the chosen option in response details and the CSV export.

## Requirements

### R1. Template definition (AC1, AC2, AC7)

- Add `radio` to `GLOBAL_FORM_FIELD_TYPES` and to the editor's question-type list as **Radio**.
- A radio question reuses the existing field shape (`id`, `label`, `type`, `required`, `mapUserField`, `options`, `helpText`). No new properties.
- Server rules for `radio`, enforced in `validateFormDefinition`:
  - Reject any submitted option that is blank after trimming. Unlike the existing behavior for other types, blanks are not silently dropped.
  - Require at least two options.
  - Reject options that are indistinguishable to a student. Two options are indistinguishable when they are equal after Unicode NFKC normalization, whitespace collapsing, and case folding (for example, `Morning` and ` morning`).
  - Each error identifies the question (`Field <id> ...`) and the problem.
- Editor rules: show the existing **Options (one per line)** textarea for radio questions. Blank lines are line separators and are not options; the existing parsing is unchanged. Before saving, show a question-specific error when a radio question has fewer than two options or indistinguishable options. The server remains authoritative.
- Clone, edit, and campaign creation already copy `fields` JSON unchanged. Radio configuration (label, options, option order, required state) is preserved by those paths and verified rather than reimplemented.

### R2. Student rendering (AC3, AC4)

- Render a radio question as a native `<fieldset>` with a `<legend>` containing the question label. Each option is an `<input type="radio">` with its own `<label>`. All inputs in the group share one `name`.
- Native radios provide single selection, pointer selection, Tab into the group, and arrow-key movement between options without a new dependency. Follow the page's existing spacing, 44px minimum targets, and visible focus styling.
- Required questions show the required marker and the existing question-level error when submitted without a selection. Optional questions may be submitted unanswered.
- Help text and error text remain associated with the group through `aria-describedby`. The invalid group is focusable by the existing "focus first invalid field" behavior.

### R3. Server submission validation (AC4, AC5)

- `validateSubmission` validates radio answers against the campaign's own `fields`. `submitCampaign` already passes `campaign.fields`, not the template.
- Accept only a string that exactly matches one configured option after trimming. Reject unlisted strings, arrays, objects, numbers, and booleans with a question-level error.
- A rejected submission stores no response. This is existing transactional behavior and must be verified for radio.
- Required and optional semantics match the existing non-checkbox types.

### R4. Responses and export (AC6)

- The stored answer is the selected option string. Response details and CSV export already display string answers, with CSV escaping and formula protection, so no change is expected. Verify with a persisted radio response.

### R5. Compatibility

- Existing `text`, `long_text`, `number`, `date`, `select`, and `checkbox` validation and rendering are unchanged. In particular, `select` keeps its current one-option minimum and blank-dropping behavior.
- Existing templates, campaigns, and responses require no migration and render as before.

## Decisions requiring approval

1. **Native radio inputs instead of a new component library.** The repository has no radio-group component and does not depend on `@radix-ui/react-radio-group`. Native inputs inside a fieldset meet the keyboard and accessibility criteria without a dependency. A shadcn/Radix RadioGroup can replace them later if the owner prefers.
2. **Radio questions cannot use profile mapping.** Mapped questions take their value from the student profile, such as `tshirt_size`. An existing profile value outside the option list could make a campaign impossible to submit, and the issue does not ask for mapping. The server and editor will reject a radio question with `mapUserField`. Admins needing a profile-mapped choice can keep using `select`.
3. **"Distinguishable" means case-, width-, and whitespace-insensitive comparison** as defined in R1. The stored option text keeps the admin's original spelling.
4. **Blank editor lines are not options.** The server rejects blank entries sent through the API. The editor ignores blank lines and reports the remaining "fewer than two options" problem.

## Existing code and why it matters

| Review order | Source | Change boundary |
| --- | --- | --- |
| 1 | `server/src/services/globalFormService.ts` | Add `radio` type, definition rules, and submission validation. |
| 2 | `server/src/services/globalFormService.test.ts` | Add radio unit tests and keep existing type regressions. |
| 3 | `server/src/controllers/globalFormController.ts` | Read-only: confirm the campaign-frozen `fields` are used for submission. No change expected. |
| 4 | `client/src/app/admin/forms/AdminFormsClient.js` | Type list, options textarea visibility, pre-save checks, template preview text. |
| 5 | `client/src/app/register/[slug]/RegistrationClient.js` | Radio group rendering and client validation. |
| 6 | `docs/features/global-admin-forms.md` | List the new type and its rules. |

## Verification plan

Run all database checks only against the disposable local `forms_test` database required by `docs/features/global-admin-forms.md`.

1. **Unit tests** (`bun test` on `globalFormService.test.ts`):
   - Definition: valid radio; fewer than two options; blank option; case/whitespace duplicate; profile mapping rejected; option order preserved.
   - Submission: valid option accepted; unlisted string, array, object, and number rejected; required missing rejected; optional missing accepted.
   - Existing type tests still pass.
2. **Integration (local DB)**:
   - Create a template with a radio question, clone it, and confirm its configuration.
   - Create a campaign, then edit the template's options, and confirm the campaign still validates against its original options.
   - Submit a tampered answer and confirm that no response row exists.
   - Submit a valid answer and confirm the stored value.
   - Re-run `server/scripts/verify-global-forms.ts` for regressions.
3. **Client**: run `npm run lint` and `npm run build` in `client/`.
4. **Browser (local fixtures)**:
   - Admin creates the radio question.
   - The student selects with mouse, then changes the selection with arrow keys.
   - Submitting a required question empty shows the error and moves focus to it.
   - Response details and the CSV contain the chosen option.
   - Record screenshots or notes as evidence.
5. **Review note** in `docs/reviews/`, following the review order above. Clearly distinguish local fixture evidence from deployed evidence.

## Acceptance summary

The feature is complete when AC1–AC7 and the issue's Gherkin scenarios are demonstrated with the evidence above, existing field types are unchanged, and a PR referencing #50 passes CI and review. Approval of this RSD authorizes implementation and local verification only. It does not authorize database changes outside `forms_test`, a hosted migration, or deployment.
