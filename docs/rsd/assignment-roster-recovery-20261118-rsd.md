# Recover issue assignment for current board members

The user reported inability to assign issues. Live board access shows six approved members, while the repository policy still listed two. The guard could remove legitimate assignments to four newly added board members. Native GitHub eligibility is independent: issue #63 assignment checks returned eligible for arifulmist but 404 for trqrizu and ADIB3883. No issue assignment/removal events were found in the recent repository event sample, so a particular failed UI operation is not claimed to have been reproduced.

Latest guard run 44335597347 reconciled with removed:[] and then failed GET /issues/54 with 410 because the scorecard issue was deleted. Do not recreate deleted user content automatically.

Authorized correction: mirror all six approved board users; set publishing to inactive with dashboardIssueNumber=0; preserve issue-assignment enforcement and score summaries without requesting the deleted issue. New members remain subject to native issue eligibility; no Write access, board invitations, owner merge override changes, or arbitrary issue assignments.

Acceptance: six-member roster matches observed access; inactive publishing does not suppress guard work; real API errors remain visible; active dashboard mode retains behavior; onboarding remains compatible. Roster merge will also allow the existing onboarding workflow to recognize the four newly approved members. Native external-user limitations are communicated rather than bypassed with unwanted permissions.
