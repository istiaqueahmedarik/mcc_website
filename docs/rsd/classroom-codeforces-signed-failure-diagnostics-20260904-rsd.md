# Classroom Codeforces Signed Failure Diagnostics RSD

## Problem

When signed Codeforces API standings fail and the later HTML fallback is blocked, the response exposes only `CODEFORCES_WEB_BLOCKED`. This masks the provider's signed API failure comment, which is the actionable evidence for an invalid key, signature, time, source restriction, or missing private-Gym access.

## Requirement

If saved credentials were available and the signed API attempt failed, prefer that bounded provider error when the HTML fallback also fails. Include only the non-sensitive fallback error code as context. Preserve the existing web error when no API credentials are configured.

## Acceptance Criteria

- A failed signed API attempt followed by a failed web fallback returns the signed API code/message.
- A successful signed API response with no classroom handles returns that mapping error without making an unnecessary HTML request.
- The response includes the web fallback code but not its session, API key, API secret, signature, URL, or response body.
- A credentials-missing request followed by a blocked web fallback still returns `CODEFORCES_WEB_BLOCKED`.
- Successful API and successful web fallback behavior are unchanged.

## Out of Scope

- Replaying stored or pasted provider credentials.
- Adding provider secrets to logs or snapshots.
- Changing Codeforces access order, scoring, or database schema.
