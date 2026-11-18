# Signup through the production proxy

The live signup form returned the generic retry message after PR #62 deployed. A synthetic request with a deliberately short password reached Next.js with two 32 KiB files. With two 530,000-byte files, nginx returned HTTP 413 before the same password validation could run. Both probes stop before uploads or account creation.

## Acceptance criteria

- Signup accepts the advertised JPG and PNG files up to 5 MiB each, including mobile photos. The submitted images and multipart overhead fit inside a 1 MiB proxy request.
- Files already within the request budget retain their original bytes. Larger files are resized only as needed and keep enough resolution for identity review. Decode failures during resizing get a field-specific error and allow replacement without retyping the form.
- A successful signup creates exactly one pending user, records any matching pre-enrollment claim, and opens the pending page. An account rejected during signup review can reapply and recover an unclaimed placeholder. Approval and login are verified against disposable Postgres using the real Hono handlers.
- Browser verification exercises actual nginx, Next.js, and Hono together with synthetic images and an isolated storage stub. Live write-free probes establish the current proxy behavior. Hosted account creation and notification delivery require production rollout and access.
