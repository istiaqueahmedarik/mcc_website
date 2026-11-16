# Contributor scorecard and assignment policy

[Contributions view](https://github.com/users/istiaqueahmedarik/projects/3/views/7) groups accepted completed project tickets by assignee and displays Ticket type, Story points, and count/point sums. The board remains private. The view uses GitHub's native field sums; it is a drill-down convenience, not an authoritative shared-credit ledger. Keep ambiguous/multi-assignee tickets out of accepted credit. Project fields and type/point labels must be kept aligned.

[Contributor scorecard #54](https://github.com/istiaqueahmedarik/mcc_website/issues/54) is the stricter repository-wide summary. It lists approved members including zero totals, counts and points for each ticket type, accepted issue links, and records needing review. It is currently initialized with verified live data; automatic refresh requires merging the policy workflow.

## Maintain membership

The approved roster is .github/contribution-policy.json. It mirrors project 3 access, verified through the project's Manage access page. Initially it contains istiaqueahmedarik and trqrizu. Repository Write access alone is not sufficient.

When the owner adds or removes a board member, update members and membershipVerifiedOn in the same change-management process. Review the roster change, merge it, and run the Contributor scorecard and assignment policy workflow if needed. No code here queries the private project access list; stale roster entries can allow former members or reject newly added members until synchronized. Do not describe this as live membership enforcement.

The native assignee picker is unchanged. After the workflow is on master, issue events trigger a trusted default-branch reconciliation that removes non-roster assignees. Every run reconciles the whole repository, including closed issues, so roster removals can affect old attribution. The owner is included as an allowed assignee; the actor who makes the assignment is not an exemption. Failed runs must be investigated; they do not prove policy enforcement. Public external contributors still need to satisfy GitHub's issue assignment eligibility, for example by commenting on the specific issue; board membership alone does not add repository Write access.

## Record accepted credit

1. Assign an approved member and use exactly one type:feature, type:bug, type:documentation, type:maintenance, or type:support label.
2. Set exactly one sp:1, sp:2, sp:3, sp:5, sp:8, or sp:13 estimate before work. Keep the board fields aligned.
3. After acceptance evidence and merged delivery are verified, close the issue as completed and apply points:accepted.
4. The summary counts the points only with exactly one approved assignee. PRs, reopened/not-planned issues, shared work, multiple assignees, and ambiguous/missing labels do not earn automatic credit. Accepted-but-invalid records appear under Needs credit review.
5. Use points:shared for shared work; automatic allocation is deferred until an explicit reviewed split is supported. Do not give every assignee the full estimate.

Acceptance approval is procedural: current Write collaborators can edit labels, and the workflow does not make points:accepted owner-only. Maintainers must review credit metadata. Totals are calculated from current issue metadata; reassignment, relabelling, reopened issues, or roster changes can alter prior totals. No permanent historical ledger or automatic permission promotion is claimed.

## Automation and verification

The workflow uses GitHub's repository token with contents:read and issues:write; it requires no new token/secret or private-project credential. It runs on issue events, relevant master pushes, manual dispatch, and daily. Global serialized runs each reconcile all issues so a superseded pending event is covered by a later run. It never checks out contributor PR code.

Preview without writes: node scripts/contributor-policy.mjs --preview with GH_TOKEN supplied securely in the runtime environment. Do not paste credentials into a command history. Apply only deliberately with --apply after configuring dashboardIssueNumber. The workflow runs the focused tests first. No application database, migration, dependency installation, or deployment is involved. Onboarding remains separate.
