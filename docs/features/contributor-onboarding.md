# Contributor onboarding

Master epic: [#56](https://github.com/istiaqueahmedarik/mcc_website/issues/56). Child templates: local setup #57, website introduction #58, technical terms/workflow #59, product glossary #60. This is a learning track, separate from the contribution scoreboard and Development project.

## Template improvements

The master descriptions and version-controlled .github/onboarding/*.md provide a staged learning sequence, mentor/member responsibilities, teach-back questions, a local documentation exercise, a setup checkpoint table, acceptance scenarios, and a standard blocker report. Local setup distinguishes tools, client/API startup, development schema/access, authentication/roles, and actual feature verification. A missing bootstrap is a mentor-owned dependency; startup alone is not full setup proof. No production credentials or data are requested.

## Automatic creation after merge

1. Give the member appropriate board access through the owner's normal approval process.
2. Update .github/contribution-policy.json with the approved username and membership verification date. This roster is a manual mirror of board access, not a live membership API.
3. Review and merge the roster change into master. The Onboard approved contributors workflow creates one epic and four labelled child tickets for each non-baseline member.
4. Inspect the Actions run summary for all five links and assignment results. Outside contributors may need to comment on their tickets to become assignable; rerun after that. The automation never grants Write access.
5. The mentor guides the learning tasks and records sign-off. Completing them does not award points or grant permissions.

An hourly scheduled reconciliation repairs missed or partial work. Schedules are best effort and can be disabled for public repositories after inactivity; manual dispatch is the recovery path. Repo invitation acceptance alone does not trigger this workflow. No webhook server or new PAT is installed.

## Manual run

Open Actions → Onboard approved contributors → Run workflow. Leave member empty to reconcile new approved members. Supply a member username to onboard an existing baseline member deliberately. Mentor defaults to the owner and must be in the roster. CLI equivalent:

```bash
gh workflow run onboard-contributors.yml --ref master -f member=APPROVED_USERNAME
```

The workflow is available after its file is merged to the default branch. It always checks out the trusted default branch even if a dispatch names another ref. Inputs enter through environment values and validation, never shell interpolation.

## Recovery and customization

Stable per-user/per-step markers identify issues created by the owner or GitHub Actions bot across open and closed issues. The script searches all pages, rejects duplicate trusted markers before mutation, creates only missing tickets, repairs native sub-issue relationships, and updates only the epic's managed link section. Learner text and completed child states are preserved. Rerunning is not a reset or annual second onboarding cohort; a new-generation/reset feature is not included.

To change future learning content, edit .github/onboarding/*.md in a reviewed PR. Existing personal tickets are not rewritten. config.json records baseline members, default mentor, and an informational mapping to master issue numbers. The script reads the version-controlled files, not mutable public issue bodies. Synchronize the public master descriptions when changing those files; the mapping does not synchronize them automatically.

## Board and credit separation

The project's auto-add filter was changed to is:issue is:open -label:onboarding -label:template. All generated tickets receive onboarding at creation. Do not manually add the epic to the Development project: its native auto-add-subissues feature could then import its children. The script intentionally has no Project-write credential and cannot remove manually imported items.

The contributor-policy scorer now explicitly excludes onboarding and template labels, even if someone adds points:accepted and point/type labels by mistake. Assignment guardrails still apply: use an approved roster member.

## Validation limits

Run node --test scripts/onboard-members.test.mjs scripts/contributor-policy.test.mjs. A read-only preview uses GH_TOKEN supplied securely at runtime and node scripts/onboard-members.mjs --preview. Apply is explicit via --apply. No preview creates issues. Tests use a synthetic API for retries/partial failures and do not prove hosted token permissions. No fake member was added to the live roster for testing.

Official references: [Actions triggers](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [member webhook](https://docs.github.com/en/webhooks/webhook-events-and-payloads#member), [sub-issue REST API](https://docs.github.com/en/rest/issues/sub-issues), [issue assignment](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/assigning-issues-and-pull-requests-to-other-github-users).
