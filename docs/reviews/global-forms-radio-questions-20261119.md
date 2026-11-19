# Global forms radio-button questions

Scope: [issue #50](https://github.com/istiaqueahmedarik/mcc_website/issues/50). Requirements and proposed decisions are in `docs/rsd/global-forms-radio-questions-20261119-rsd.md`. The change starts from `master` commit `4abf432`. It adds no migration, dependency, or environment variable.

## Reviewer path

1. **Server rules: `server/src/services/globalFormService.ts`.** `radio` joins `GLOBAL_FORM_FIELD_TYPES`. In `validateFormDefinition`, a radio question is checked before the shared option normalization:
   - It cannot carry `mapUserField`.
   - `radioOptionsError` rejects blank or non-text options instead of silently dropping them.
   - It requires at least two options.
   - It rejects options that look the same to a student: equal after NFKC, whitespace collapsing, and lower-casing. Stored option text keeps the admin's spelling.
   - Every message names the field ID.

   `validateSubmission` reuses the existing select check (`select || radio`). Answers are already required to be one trimmed string, so arrays, objects, numbers, and booleans fail as "must be text", and an unlisted string fails as "must use an available option". Select rules are unchanged. The magic option limits became named constants with the same values.
2. **Campaign freezing: `server/src/controllers/globalFormController.ts` (read only).** `submitCampaign` validates against `campaign.fields`, the copy taken when the campaign was created, inside the existing transaction. Radio therefore inherits frozen meaning and "no row on rejection" without controller changes.
3. **Unit tests: `server/src/services/globalFormService.test.ts`.** A `radio questions` block covers:
   - a valid definition with preserved order and requiredness
   - each unusable option shape and the profile-mapping rejection
   - unchanged select behavior
   - single-string storage, tampered values, required versus optional, and frozen options

   Three of these failed before the implementation, confirming that they exercise the new behavior.
4. **Integration: `server/scripts/verify-global-form-radio.ts`.** This follows the existing per-topic verify scripts, refuses non-local databases, and uses real Hono handlers with synthetic accounts. It checks:
   - API rejection of bad configurations
   - preserved configuration after reopen, edit, and clone
   - a template option edit after campaign creation (`Night` replaces `Evening`), after which `Night` is still rejected
   - missing, unlisted, array, and object answers, with zero stored rows asserted in Postgres
   - a valid stored `{ slot: "Morning" }`
   - the admin responses API returning that answer
5. **Admin editor: `client/src/app/admin/forms/AdminFormsClient.js`.**
   - **Radio buttons** appears in the type list.
   - Choosing radio clears and disables **Profile mapping** and explains why.
   - The existing options textarea, which ignores blank lines on save, is shown with an "at least 2" label.
   - `radioQuestionIssue` mirrors the server checks before the request and names the question by label.
   - The preview shows options as for select.
   - **Pre-existing defect fixed in scope:** template-editor errors were rendered only by the page-level alert behind the modal overlay, so this AC2 error and the existing title and select errors were hidden. The editor now repeats the error inside the dialog with `role="alert"`, matching the delete dialog. The page-level alert is unchanged.
6. **Student page: `client/src/app/register/[slug]/RegistrationClient.js`.**
   - `RadioQuestion` renders native radios sharing one `name` inside `<fieldset role="radiogroup">`, named by its legend. The browser therefore provides single selection, Tab into the group, and arrow-key movement.
   - The group carries `aria-required`, `aria-invalid`, and `aria-describedby` for help and error text. ARIA does not support `aria-invalid` on individual radios (flagged by `jsx-a11y`), so inputs carry `data-invalid`.
   - The existing first-invalid focus selector now also matches `data-invalid` and skips the non-focusable group.
   - Client validation applies the existing select membership check to radio.
   - Each option row is a full-width label of at least 44px, with focus and checked styling from existing tokens.
7. **Browser checks: `client/scripts/verify-global-form-radio-browser.mjs`.** This follows the existing forms browser script and its loopback/synthetic guards. It drives the real Next client against `serve-global-forms-fixtures.ts`. Screenshots and the exported CSV are in `global-forms-radio-questions-20261119-assets/`.
8. **Docs.** The RSD, `docs/features/global-admin-forms.md` (question-type list and radio rules), and the project index entry.

## Decisions for maintainer review

These are proposed defaults from the RSD. Each is isolated:

1. **Native radios instead of adding `@radix-ui/react-radio-group`.** Changing this would replace one component.
2. **No profile mapping on radio questions.** Changing this would remove one server check and the editor lock.
3. **"Distinguishable" means case-, width-, and whitespace-insensitive.** Changing this would replace one key function on each side.
4. **Blank editor lines are separators.** Blank API options are rejected.

## Interface audit

| Before | After | Why |
| --- | --- | --- |
| Single choice only as a dropdown | Radio buttons with every option visible | Issue #50 |
| Editor save errors hidden behind the modal overlay | Same error also inside the editor, announced as an alert | AC2 requires an actionable error the admin can see |
| — | Profile mapping disabled with an explanation for radio | Prevent a profile value outside the options from blocking submission |

Existing typography, tokens, focus rings, and dialog widths are retained. Native radio inputs keep platform keyboard behavior.

Known pre-existing behavior, unchanged: student field errors refresh only on the next submit, so after choosing an option the required error remains until **Confirm registration** is pressed again. This applies to every field type.

## Verification

All database checks ran against the disposable local `forms_test` database built from `tests/fixtures/global-forms-baseline.sql` and the documented migrations. No hosted database was contacted.

| Check | Result |
| --- | --- |
| `globalFormService.test.ts` | 14 passing (6 existing + 8 radio) |
| Full server `bun test` | 121 passing, 14 files |
| `verify-global-form-radio.ts` (new) | 21 checks passing |
| `verify-global-forms.ts` (existing) | 41 checks passing |
| `verify-global-form-profile-review.ts` (existing) | 21 checks passing |
| `verify-global-form-reports.ts` (existing) | 25 checks passing |
| ESLint on changed client files and browser script | 0 errors, 0 warnings |
| `npm run build` (Next.js 16, webpack) | Passed |
| `verify-global-form-radio-browser.mjs` (new) | 10 grouped checks passing, no page errors (Chromium 1248, production build) |

Browser checks: radio offered and mapping locked; one-option and look-alike errors visible in the dialog; saved order and requiredness; accessible group/options/required state; required error and focus; keyboard Space and arrow keys keep one selection; pointer replaces the selection; mobile 390px with no horizontal scroll and 44px targets; submission; response detail and CSV export showing the chosen option.

Reproduce from the repository root after preparing `forms_test` as in `docs/features/global-admin-forms.md`:

```bash
DATABASE_URL=<local-forms_test-url> bun server/scripts/verify-global-form-radio.ts
DATABASE_URL=<local-forms_test-url> bun server/scripts/serve-global-forms-fixtures.ts      # port 55441
SERVER_URL=http://127.0.0.1:55441 npx next start -H 127.0.0.1 -p 55443                       # in client/, after build
PLAYWRIGHT_MODULE=<playwright-core entry> FORMS_QA_CHROME=<chromium path> \
  FORMS_QA_OUTPUT=docs/reviews/global-forms-radio-questions-20261119-assets \
  node client/scripts/verify-global-form-radio-browser.mjs
```

## Rollout and limits

- No migration: radio definitions live in the existing `fields` JSONB columns, and older campaigns are unaffected.
- Rolling back the code leaves saved radio templates, campaigns, and responses in the database. Older code rejects saving such a template. It also renders an open radio campaign's question as a single unlabeled input and does not check options on submit. End or avoid radio campaigns before rolling back.
- The evidence uses a local fixture and Chromium on Windows only. Screen-reader output, Safari, Firefox, physical mobile devices, and hosted deployment were not verified.
