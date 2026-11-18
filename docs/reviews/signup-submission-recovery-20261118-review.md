# Account signup submission recovery review

The original `/signup` reproduced two page exceptions in mobile Chromium emulation. Two 5 MiB PNG files triggered Next.js's `Body exceeded 10mb limit` error. Two small images reached the signup service, where a dropped connection surfaced as `fetch failed` and also interrupted the page.

## Follow the submission through the diff

1. `client/src/app/signup/page.js` handles submission from the existing form, displays errors inline, and keeps inputs intact while waiting for a response or retry. The old React form action could clear uncontrolled inputs when it settled. An invalid replacement ID card clears the previous preview so the preview reflects the file being submitted.
2. `client/src/lib/signup-validation.mjs` applies the same JPG/PNG and 5 MiB rules to the files selected in the browser and the files the server will upload. This rejects invalid selections before the browser sends the request while retaining server validation.
3. `client/next.config.mjs` gives the multipart request 1 MiB of headroom above the combined 10 MiB file limit. This setting applies to all Server Actions.
4. `client/src/lib/action.js` keeps the existing Supabase uploads and Hono signup call. A response with a created user ID allows the page to navigate to `/signup/pending`. The action returns a signup outcome without sending the created user record to the client.

## Verification

Chromium in Pixel 7 emulation tested the real Next.js action against local storage and signup stubs with synthetic files. Both 5 MiB images reached storage, and one account request led to the pending page. Duplicate email, failed uploads, a dropped backend connection, and an unexpected backend response all stayed in the form and preserved both files. A simulated proxy 413 and browser network abort recovered on the same form. Invalid and oversized images and a missing ID card were caught before submission. A modified multipart request with an oversized repeated upload field was rejected on the server before storage. A second submit while the first request was pending produced a single signup request. Replacing an oversized ID card with a valid image restored the preview and allowed the signup to complete.

Targeted ESLint and the existing safe return-path tests passed. Full client lint passed with nine warnings in unrelated files. Production ingress and hosted signup were outside the local test setup.
