# Contributing to MCC Website

## Work and review

Choose an issue, agree its scope and acceptance criteria, and ask a maintainer to assign it before starting. Follow AGENTS.md, the RSD workflow, and docs/knowledge-base. Keep changes focused and include validation evidence. Open a pull request against master and link its issues with closing keywords where appropriate. Contributors can use repository branches where authorized or submit from forks.

The master branch and the repository default branch are protected by two active rulesets:

- A pull request with at least one eligible approval is required. New pushes dismiss stale approvals; the most recent reviewable push must be approved by someone other than its pusher. Review conversations must be resolved.
- The GitHub Actions checks client, server, and docker must pass against the current base. The deploy job is deliberately not a pre-merge requirement.
- Direct pushes, force pushes, and deletion of the protected branch are blocked.
- Only istiaqueahmedarik has an explicit always-allowed User bypass on both rulesets. The owner can merge without peer approval, override CI requirements, and push directly when needed. Everyone else must follow the rules above and cannot merge into the protected branch. The exception is bound to this account, not inherited by every future administrator.

Existing Write collaborators can contribute and provide eligible reviews; they cannot merge into the protected branch. Owner-authored PRs do not require another collaborator's approval because the owner may bypass the review requirement. No CODEOWNERS requirement is enabled because the repository currently has no CODEOWNERS file. Any future administrator can edit repository settings; grant administration deliberately. The configured bypass list itself names only the owner.

Current CI performs a client build, server dependency installation, and Docker builds; it does not run every application test or lint command. PR authors must still run checks appropriate to their change. Passing CI is not a substitute for review.

## Story points

Use exactly one estimate label per issue: sp:1, sp:2, sp:3, sp:5, sp:8, or sp:13. These measure relative scope, complexity, and uncertainty, not hours or personal ability. Split a 13-point issue where practical. Estimates are agreed before work starts; a maintainer must review any scope-driven change. Do not inflate estimates after completion.

Initial estimates for the forms follow-up are #48 = 5, #50 = 5, #51 = 3, and #49 = 8. They are estimates only and give no contribution credit until acceptance.

A maintainer may add points:accepted only when:

1. The issue's acceptance criteria are demonstrated.
2. Its implementation PR has been reviewed and merged.
3. The issue is closed as completed and links to that PR.
4. The credited contributor and any shared-work split are recorded.

Reopened, duplicate, abandoned, or unmerged work does not earn completed story points. Reverting delivery requires rechecking its acceptance label. Do not count the same issue or delivery twice. A sole contributor can be identified by the issue's sole assignee. For multiple contributors, use points:shared and record a split whose total does not exceed the issue estimate; never award the entire estimate to each person.

## Recognition and responsibility

All contributors may offer review comments. Required-review eligibility follows GitHub's permissions and is distinct from informal review participation.

At 20 accepted points, a contributor may be nominated with role:reviewer-candidate. A maintainer then assesses correctness, testing, security judgment, communication, and the usefulness of prior reviews. The label is a nomination only; it grants no permissions. Existing collaborators retain their current review access.

At 50 accepted points, a contributor may be considered for maintainer responsibilities after an explicit owner decision. Meeting a threshold never automatically grants Write, Admin, merge, secret, or deployment access. Technical estimates alone are insufficient evidence of trust.

Recognition can include a contributor acknowledgement, reviewer mentorship, and responsibility for a module. Record actual grants separately and keep merge authority limited to designated administrators. This personal-account repository has no organization teams; an organization migration requires a separate explicit decision.

## Projects board and accounting status

Use [MCC Website — Development](https://github.com/users/istiaqueahmedarik/projects/3), linked to this repository. The existing project was reused, preserving its original issues and private visibility. Access to the private board is managed separately from repository access.

The numeric Story points field contains the agreed estimates for #48 (5), #50 (5), #51 (3), and #49 (8). The existing status workflow is Backlog, Ready, In progress, In review, and Done. Status and Assignees remain available. Keep the field aligned with the issue's sp label when changing an estimate.

Point acceptance, cumulative totals, nominations, and promotions are manual. No bot currently awards points or changes permissions. Moving an item to Done alone does not award accepted credit.

## Ruleset administration

Review/CI rules: https://github.com/istiaqueahmedarik/mcc_website/rules/7545747

Owner-only updates and merges: https://github.com/istiaqueahmedarik/mcc_website/rules/27380497

Both rulesets target the default branch and refs/heads/master, with no exclusions. Rulesets aggregate. Both explicitly allow only User istiaqueahmedarik (ID 69030256) to bypass at any time. The owner requested final authority over all repository changes. Other collaborators have no configured bypass. Prefer reviewed PRs and successful checks in normal work; exercising owner override is a deliberate exception.


## Contributor scorecard and board-member assignments

Use the [Contributions view](https://github.com/users/istiaqueahmedarik/projects/3/views/7) and [scorecard #54](https://github.com/istiaqueahmedarik/mcc_website/issues/54) for ticket types and accepted story points. The approved assignment roster mirrors private project access in .github/contribution-policy.json. Board access alone does not make GitHub assign a user automatically; its native picker remains unchanged. Once merged, the workflow asynchronously removes non-roster issue assignees. The owner must synchronize the roster whenever board access changes. No automatic access grants or promotions occur. See docs/features/contributor-scorecard.md for acceptance, exclusions, current-metadata accounting, membership drift, and operation details. Onboarding is a separate task.


## New member onboarding

Use master epic #56 and child templates #57–60 as a separate learning track. After Onboard approved contributors is merged, adding a new approved member to .github/contribution-policy.json triggers a personalized epic plus four sub-issues, with hourly/manual recovery and duplicate protection. Existing owner/trqrizu are baseline members and are not auto-onboarded. Repository or board invitations alone do not trigger the workflow. Keep the membership roster synchronized. Templates, mentor responsibilities, progress evidence, assignment limits, and manual-run instructions are documented in docs/features/contributor-onboarding.md. Onboarding/template tickets stay outside Development auto-add and never earn contribution points.
