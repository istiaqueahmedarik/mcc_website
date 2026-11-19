# Signup proxy compatibility review

On the live site, a signup containing a deliberately short password reached validation with 984,000 image bytes. At 1,060,000 image bytes, nginx returned HTTP 413 before Next.js could validate the same password. The prior fix caught that rejection and preserved the form. This follow-up fits the submission through the proxy.

## Review in request order

1. `client/src/app/signup/page.js` prepares the selected images after normal file validation and while the submit button is disabled. A preparation error stays in the form, where the applicant can replace the named file and retry.
2. `client/src/lib/prepare-signup-images.js` allows 960 KiB for both images together, leaving margin for the rest of the multipart request. It keeps files that fit and uses the largest practical dimensions and JPEG quality for files that need resizing. Both original selections remain in the file inputs.
3. `server/src/controllers/authController.ts` inserts an explicitly pending account and returns its ID. The API response carries the information Next.js needs for its confirmation check.
4. `server/src/utils/classroomPreEnrollment.ts` lets a reapplication claim a matching `link_pending` membership after the prior applicant was deleted and the reference was cleared. The SQL still protects existing claimants and active memberships.

## Verification

- Chromium with Pixel 7 settings and WebKit with iPhone 13 settings completed signup through real nginx configured at 1 MiB, the Next.js Server Action, actual Hono handlers, and disposable PostgreSQL. Synthetic storage recorded the files. Two 5 MiB inputs yielded 948,458-byte and 952,728-byte multipart requests respectively, with readable 1,050 × 1,400 output images for the test fixture.
- Both browsers verified field-specific decode failure, preserved form entries, byte-for-byte preservation of small images, duplicate email feedback, pending approval, and login with an HTTP-only session after admin approval.
- The isolated database regression checked explicit pending state with a `granted=true` database default, a duplicate rejection, matching pre-enrollment, reclaim after rejection, protection of another applicant's live claim and active memberships, admin authorization, and one mocked notification for repeated approval attempts. It also verified rollback when a dependent schema table is missing.

The change uses the existing schema and deployment workflow. The public-site probes intentionally failed validation before uploads or account writes. Storage and mail delivery during the successful flow used local stubs.
