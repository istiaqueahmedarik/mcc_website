# Assignment recovery review

Review .github/contribution-policy.json first: it mirrors the six names observed in signed-in project access, updates the verification date, and explicitly disables deleted scorecard publishing with 0. No permission is granted by this roster.

Next, scripts/contributor-policy.mjs extracts applyPolicy to run validated assignment reconciliation, calculate the summary, and publish only when a positive dashboard issue number is configured. Removing the former positive-only precondition allows the guard to remain healthy after deliberate publisher shutdown. This does not hide arbitrary 404/410 failures or recreate issue #54.

Tests add inactive-mode enforcement without dashboard GET/PATCH/creation, active publishing, genuine API failure propagation, and invalid-policy rejection before API access. Combined policy/onboarding run passed 31 tests. A read-only live preview using the corrected six-member policy succeeded. Independent read-only review found no blocking regressions.

Evidence: board access names were istiaqueahmedarik, trqrizu, ADIB3883, arifulmist, ragibmahtab, rashed-48. Native eligible-assignee listing includes the three new repository collaborators arifulmist, ragibmahtab, rashed-48, but not trqrizu or ADIB3883. Per-issue checks for #63 confirmed arifulmist eligible and the latter two ineligible. Latest guard run 44335597347 failed only after successful reconciliation when reading deleted #54. No actual issue assignee was changed to test this fix.

Hosted execution of this branch is not claimed before merge. Project access is still mirrored manually, and outside users may need to comment on each issue before native GitHub assignment is available. Board membership alone does not grant repository Write access. Owner override and all branch protections are untouched. Publishing can later be re-enabled by explicitly configuring a valid dashboard issue number.
