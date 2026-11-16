# Contributor policy implementation review

## Review order

1. .github/contribution-policy.json records the repository, private board URL, owner, two verified board members, and dashboard issue #54. This is a manually maintained membership snapshot.
2. scripts/contributor-policy.mjs validates configuration, calculates category totals and exclusions, lists all repository issues with pagination, fetches fresh assignees before removing nonmembers, and updates the dashboard only when its content differs. Preview is read-only; apply must be explicit.
3. scripts/contributor-policy.test.mjs covers 12 distinct scoring, attribution, roster, pagination, API-failure, and assignment cases.
4. .github/workflows/contributor-policy.yml executes trusted default-branch code with pinned checkout/setup actions, minimal permissions, serialization, and a timeout. It reconciles all issues on issue events, policy pushes, manual dispatch, and schedule.
5. RSD and feature documentation define credit and membership maintenance, failure boundaries, and what remains manual. The contribution guide/knowledge-base record the integration.

## Evidence

- All 12 Node tests passed on Node 22.23.2. A read-only preview against actual GitHub issues produced zero accepted points for both approved members; current form estimates remain unaccepted and unassigned.
- Signed-in Manage access page showed exactly istiaqueahmedarik and trqrizu. No invitations or access grants were made.
- Live project settings now include Ticket type and Contributions view 7, with Assignees grouping, count and Story points sum, and accepted/closed/non-shared filter. Existing four forms issues are type:feature in labels and project fields.
- Saved view options were verified through UI and GraphQL. A screenshot captures grouping/sum settings; no fake earned credit was added for visual evidence.
- Scorecard #54 was initialized from the read-only renderer; no live assignment was changed. Workflow enforcement/automatic updates have not run because the branch is not merged.
- Independent read-only review found no blocking correctness/security defects in script, tests, roster, and workflow.

## Security and limits

No secret values are persisted or logged. Issue content is not executed or interpolated into commands. The workflow cannot run PR code with its write token. API errors omit response bodies and credentials. Invalid roster fails before mutation. No automatic promotions or repository permission grants are included.

GitHub cannot limit its picker by board membership. This implementation removes unsupported assignments after the fact against a manual roster, with a race window and operational failures possible. The roster can drift from the private board. Acceptance labels remain editable by Write collaborators, and totals reflect mutable current metadata. Shared credit is excluded. The native view sums displayed project fields while the stricter scorecard validates canonical labels and attribution; maintainers must keep fields aligned. These limitations are explicit rather than hidden behind a claim of a strict native gate.
