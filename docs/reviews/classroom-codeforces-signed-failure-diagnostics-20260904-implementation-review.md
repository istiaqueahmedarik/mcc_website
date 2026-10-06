# Classroom Codeforces Signed Failure Diagnostics Implementation Review

> Superseded in part on 2026-09-04 by `classroom-codeforces-unmapped-api-snapshots-20260904-implementation-review.md`: a valid numeric API response with zero classroom matches is now retained for mapping. Signed-failure precedence and redaction remain current.

## Review Flow

1. The deployed API-native upsolve revision was confirmed through GitHub Actions and the updated hosted error text.
2. Read-only live inspection showed the named contest now has `include_upsolves = false`, its saved API credentials were decrypted/attempted during the retry, and no successful snapshot was written.
3. A Codeforces health request showed approximately one second of clock difference, excluding the provider's five-minute signature-time rejection threshold.
4. `server/src/services/codeforcesContestService.ts` now returns a signed API classroom-handle mismatch immediately, otherwise prefers the signed API error when both signed API and authenticated HTML fallback fail, while preserving the web error when credentials are missing.
5. Any provider comment returned to the caller is stripped of the request's API key and `apiSig`; the response adds only the non-sensitive HTML fallback code.
6. `server/src/services/codeforcesContestService.test.ts` covers signed-error precedence, the no-classroom-handle short circuit, literal credential redaction, session/secret absence, and the credentials-missing compatibility path.

## Why

For private Gym `708543`, Codeforces requires an authenticated API user who can view the contest. Returning only the later `CODEFORCES_WEB_BLOCKED` error hid whether the signed request failed because of the saved key/secret, API-source restrictions, or contest access. The provider's documented `FAILED.comment` is the actionable result and should not be discarded.

## Security and Privacy

- No pasted website token, JSESSIONID, stored API key, stored API secret, or live signed request was replayed.
- The error response never includes the signed URL, API secret, JSESSIONID, API key, or `apiSig`.
- Redaction uses literal replacement rather than interpolating provider text into a regular expression.
- Database inspection returned only connection-state timestamps and contest state.

## Verification

- `bun test src/services/codeforcesContestService.test.ts src/utils/codeforcesSession.test.ts src/utils/codeforcesCredentialCrypto.test.ts` — 30 passed, 0 failed.
- `bun build src/index.ts --target=bun --outdir /tmp/mcc-codeforces-signed-diagnostics-check` — passed, 804 modules bundled.
- `git diff --check` — passed.
- Live provider/server clock comparison — approximately one second difference.

This diagnostic revision is not committed or deployed. A real authenticated retry after deployment remains required to obtain the provider's exact safe failure comment.
