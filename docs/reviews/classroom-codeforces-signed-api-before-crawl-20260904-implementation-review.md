# Classroom Codeforces Signed API Before Crawl Implementation Review

> Superseded in part on 2026-09-04 by `classroom-codeforces-unmapped-api-snapshots-20260904-implementation-review.md`: successful numeric API results now retain official rows for trainer mapping.

## Review Flow

1. `server/src/utils/codeforcesCredentialCrypto.ts` owns AES-256-GCM encryption, decryption, key validation, randomized IVs, and safe key hints.
2. `server/src/controllers/classroomContestController.ts` adds manager-authorized credential status/save/delete behavior and lazily decrypts credentials for a fetch without returning plaintext.
3. `server/src/routes/classroomRoute.ts` registers protected GET/PUT/DELETE routes at `/classroom/:id/contests/codeforces-credentials`.
4. `server/src/services/classroomContestRankService.ts` passes the lazy credential provider into `server/src/services/codeforcesContestService.ts`.
5. The provider service keeps anonymous `contest.standings` first, builds a sorted SHA-512 `apiSig` for the signed retry, and then uses the existing bounded authenticated crawl fallback. Both API paths normalize and filter through the same classroom-owned contract.
6. `client/src/components/ClassroomContestPanel.jsx` presents API credentials first and the web session second inside the existing Codeforces Access dialog, with separate save/clear actions, password masking, status hints, responsive fields, and existing focus-managed dialog behavior.
7. Service and crypto tests cover anonymous isolation, signed ordering/signature transport, fallback behavior, bounds, encryption randomness, missing encryption configuration, and safe hints.

## Why

Public contests work without trainer secrets, while private Gym/mashup access can use the provider's supported signed API before relying on HTML crawling. Keeping JSESSIONID as an explicit second mechanism preserves EDU and crawl recovery without confusing it with the API credential pair.

## Security and Privacy

- API secrets and JSESSIONID are never included in responses, logs, snapshots, or reports.
- API key and secret ciphertexts use separate randomized authenticated-encryption envelopes.
- The encryption key remains server-only and is not reused as a browser-visible value.
- Credential rows are trainer-scoped, manager-controlled, protected by RLS, and unavailable to anon/authenticated database roles.
- The signed URL contains the provider-required API key and signature but never the API secret.
- No pasted production credential was replayed during verification.

## Interface Audit

The change reuses the established Radix dialog and project components, preserves keyboard focus management and visible labels, keeps controls at existing hit-target sizes, stacks fields on narrow screens, bounds long modal content with scrolling, masks the secret, exposes loading/connected states, and adds no motion that needs a reduced-motion alternative.

| Before | After | Why |
| --- | --- | --- |
| Session-only Codeforces modal | One Codeforces Access dialog with API credentials first and crawl session second | Makes the provider order visible without adding a new page or duplicating setup surfaces |
| JSESSIONID was the only visible private-access control | Labelled API key and masked API secret inputs with saved-state metadata | Restores the requested API-key workflow while keeping secrets undiscoverable after save |
| Saving the session closed the modal | Each credential mechanism saves independently and the dialog remains open | Lets trainers configure or verify both fallback layers without losing context |
| Session readiness alone controlled the toolbar state | Either saved API credentials or a connected session marks Codeforces access ready | Reflects both supported authenticated access mechanisms |

## Verification

- `bun test src/services/codeforcesContestService.test.ts src/utils/codeforcesSession.test.ts src/utils/codeforcesCredentialCrypto.test.ts`
- `bun build src/index.ts --target=bun --outdir /tmp/mcc-codeforces-signed-api-check`
- `npx eslint src/components/ClassroomContestPanel.jsx` from `client/`
- Read-only live Postgres inspection confirmed the existing credentials table, RLS, and revoked anon/authenticated DML.
- `git diff --check`

Production deployment, process restart, a real signed provider request, and authenticated browser verification remain pending.
