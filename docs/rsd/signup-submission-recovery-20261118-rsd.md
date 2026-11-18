# Account signup submission recovery

The reported mobile signup reaches an application exception after the user submits the account form with a profile picture and MIST ID card. The request authorizes a focused fix on a separate branch and a pull request against `master`.

## Acceptance criteria

- A signup request can carry two JPG or PNG images of up to 5 MiB each, including multipart metadata.
- Missing, invalid, and oversized images get a message in the form. The server continues to validate the uploads.
- Validation, upload, and service failures give the applicant an error in the form and let them retry with their existing entries and files. Submission stays disabled while an attempt is in progress.
- A successful signup opens the existing pending-approval page.

Use the existing Server Action and upload and account creation paths. Verify the reported flow with synthetic files at mobile width, including the request size boundary and failed requests.
