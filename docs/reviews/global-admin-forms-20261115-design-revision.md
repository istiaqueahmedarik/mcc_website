# Global forms design and submission revision

Approved by the user's 2026-11-15 follow-up: remove gradients, use Apple design, replace “cohort” terminology, and use Motion's press-and-hold example for registration submission. Scope: the new forms screens, their report filter copy, and related error messages.

## Reviewer path

1. `client/src/app/admin/forms/forms.module.css` and `AdminFormsClient.js` establish the neutral admin workspace. Review the toolbar, template/campaign surfaces, and hierarchy first.
2. `client/src/components/FooterBackdrop.jsx` keeps the shared footer neutral on forms and report-detail routes without changing other pages. `Footer.jsx` hosts this small route-aware decoration.
3. `client/src/app/register/[slug]/registration.module.css` supplies opaque neutral content surfaces. The agreement area remains in normal flow to keep focused fields unobscured.
4. `HoldToRegister.js` owns the one-second gesture and its cancellation, keyboard, reduced-motion, and standard-button alternative. `RegistrationClient.js` retains field/agreement validation, prevents implicit form submission from bypassing the control, and guards the asynchronous request synchronously. Existing server idempotence and profile verification remain authoritative.
5. `client/src/app/contests_report/details/[id]/page.js` and `generate_report/page.js` replace jargon with **Form response filter**, **Apply filter**, and **Registered students**. Internal selection/membership identifiers remain intact and hidden from ordinary UI. `server/src/controllers/contestRoomController.ts` updates two matching user-visible error strings.
6. `client/scripts/verify-global-forms-browser.mjs` provides a repeatable interaction check against the local synthetic fixture services. The RSD addendum and feature guide explain the revised flow. No schema, authentication, provider, or scoring algorithm change is included.

## Design review

| Before | After | Why |
| --- | --- | --- |
| Decorative radial gradients behind the form pages | Neutral semantic backgrounds and opaque content surfaces | Keep attention on profile review, responses, and campaign actions |
| Broad shadows and glass across content | Restrained depth; translucent admin navigation only | Material communicates hierarchy without adding decoration |
| “Apply cohort,” “Change cohort,” internal revision counters | “Apply filter,” “Change form filter,” plain registered-student counts | Explain the action using the user's domain language |
| Immediate registration submit | One-second hold with progress and early-release cancellation; optional standard button | Follow the requested deliberate interaction while retaining an accessible alternative |

The [Motion long-press example](https://motion.dev/examples/react-press-hold) supplies the interaction reference. The repository's installed Framer Motion 11 supports SVG progress animation but predates the example's newer `tap.hold` option; explicit input handling adapts the same interaction without upgrading dependencies. The Apple, interface-design, Emil, and [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) informed the scoped design audit.

## Verification

- Full client lint: zero errors; nine existing unrelated warnings. Focused lint also passes for the new components and browser script.
- Browser interaction checks passed: missing-field validation, implicit-submit protection, short pointer/keyboard cancellation, pointer-leave and window-blur cancellation, full keyboard hold with exactly one request and disabled pending state, standard-button mode, complete-profile registration, and emulated mobile touch hold.
- Additional browser checks passed: partial ring progress, Escape cancellation, failed-request recovery preserving agreement, gradient-free shared footer on feature routes, 390px dark/reduced-motion and forced-colors views, visible keyboard focus, and 2560px admin layout. Reduced-motion ring visibility uses CSS so it also responds to preference changes while the page is open. Dark registration errors use a scoped high-contrast semantic color.
- Report browser checks passed: select/apply the renamed filter, render registered students from saved synthetic standings, hide internal revision labels, and 390px layout.
- Existing report integration check: 17 assertions passed against disposable local PostgreSQL, including filter regeneration and cached source preservation. No provider access was used.
- Final Next.js production build passed, including TypeScript, page-data collection, and route generation.
- Final source review of the footer scoping, reduced-motion fallback, error contrast, submission guards, and fixture runner found no concrete correctness/accessibility issues. No new packages, credentials, schema changes, or hosted writes were introduced.

Screenshots and compact browser results are retained in `global-admin-forms-20261115-design-assets/`. These supersede the initial design screenshots for the revised surfaces. The dark screenshot intentionally shows a simulated request failure to demonstrate error visibility and retry state. Local browser data uses disposable PostgreSQL `forms_test`, the real feature handlers, and synthetic `@forms.invalid` accounts. Hosted deployment, real user data, physical touch hardware, and Safari are outside this verification.


## Reproduce the hold checks

Use a fresh disposable `forms_test` database and the migration/fixture sequence in `docs/features/global-admin-forms.md`. Start `server/scripts/serve-global-forms-fixtures.ts` on loopback port 55441 and the client pointing to it on port 55443. The script expects the fixture student's original incomplete profile; use a fresh database between runs. Supply an available Playwright Core module through `PLAYWRIGHT_MODULE` if it is not locally installed:

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright-core/index.mjs node client/scripts/verify-global-forms-browser.mjs
```

Optional `FORMS_QA_CLIENT`, `FORMS_QA_API`, `FORMS_QA_OUTPUT`, and `FORMS_QA_CHROME` override the loopback URLs, screenshot directory, and Chrome executable. The script refuses non-loopback services and non-fixture email identities. It uses only the explicit synthetic fixture password. No new production dependency was added.
