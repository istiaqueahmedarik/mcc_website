# Contributing to MCC Website

## Work and review

Choose an issue, agree its scope and acceptance criteria, and ask a maintainer to assign it before starting. Follow AGENTS.md, the RSD workflow, and docs/knowledge-base. Keep changes focused and include validation evidence. Open a pull request against master and link its issues with closing keywords where appropriate. Contributors can use repository branches where authorized or submit from forks.

The master branch and the repository default branch are protected by two active rulesets:

- A pull request with at least one eligible approval is required. New pushes dismiss stale approvals; the most recent reviewable push must be approved by someone other than its pusher. Review conversations must be resolved.
- The GitHub Actions checks client, server, and docker must pass against the current base. The deploy job is deliberately not a pre-merge requirement.
- Direct pushes, force pushes, and deletion of the protected branch are blocked.
- Only repository administrators can merge, and only through a pull request. Currently istiaqueahmedarik is the sole administrator. The admin-only exception applies exclusively to the merge restriction, not to reviews or CI.

Existing Write collaborators can contribute and provide eligible reviews; they cannot merge into the protected branch. An owner-authored PR still needs another eligible collaborator to approve it. No CODEOWNERS requirement is enabled because the repository currently has no CODEOWNERS file. Assigning future administrators also grants merge authority, so do so deliberately.

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

Story-point labels are configured now. Point acceptance, totals, nominations, and promotions are manual; no bot currently awards points or changes permissions.

The GitHub Projects board could not be created because the current CLI token lacks Projects scope and the available browser is signed out. The owner can authorize Projects access with:

    gh auth refresh -h github.com -s project

After authorization, create or reuse an MCC Website project, add the repository issues, and add a Number field named Story points plus Status and Assignees. Copy the agreed estimates into the field and keep the issue label and field aligned. Use labels as the source of truth until the board is configured. Permission promotion remains manual even after a board exists.

## Ruleset administration

Review/CI rules: https://github.com/istiaqueahmedarik/mcc_website/rules/7545747

Admin-only merges: https://github.com/istiaqueahmedarik/mcc_website/rules/27380497

Both rulesets target the default branch and refs/heads/master, with no exclusions. Rulesets aggregate. Editing one does not bypass the other. The owner can edit rulesets administratively, but normal merges must satisfy the configured rules. Do not weaken protections to merge a routine PR.
