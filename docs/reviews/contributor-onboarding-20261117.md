# Contributor onboarding implementation review

## Review order

1. .github/onboarding/*.md: improved member-facing learning content. config.json explicitly skips the two existing members and references the five master issue numbers.
2. scripts/onboard-members.mjs: validated target selection, template rendering, trusted durable markers, full preflight, partial creation recovery, assignment verification, native parent relationships, and managed links. Existing member work is preserved.
3. .github/workflows/onboard-contributors.yml: roster/default-branch push, hourly schedule and manual inputs; trusted checkout, pinned actions, least privilege, serialization and timeout.
4. scripts/contributor-policy.mjs: one additional credit exclusion for onboarding/template labels; matching regression test.
5. Tests, feature/RSD documentation, contribution guide, and knowledge-base updates explain operation and boundaries.

## Evidence

All 27 focused Node tests passed: 14 onboarding cases and 13 contribution-policy cases. Cases cover duplicate prevention, lost-create-response recovery, partial native-link repair, closed-child/note preservation, trusted-marker validation, ignored assignments, missing templates, baseline behavior, and point exclusions. Workflow YAML parsed. Independent read-only review found no blocking defects and reproduced 27/27 tests.

A live read-only preview returned an empty target list because both approved members are baseline members. No personal onboarding issues, assignments, access grants, or fake members were created. The existing master descriptions were improved separately under the user's request. The workflow is not active until merge, so no hosted creation or event-trigger proof is claimed.

The signed-in Project auto-add configuration was saved and verified in viewing mode with the onboarding/template exclusions. Its screenshot records the active filter. Existing onboarding issues were checked outside project 3. No other board workflow was changed.

## Security and rollback

No new credentials, database change, packages, service, or project-write permission. Public issue bodies are never executed or used as templates. Manual usernames and mentors must match the approved roster. Script imports the existing safe GitHub API helper. GITHUB_TOKEN-created issue events do not invoke the separate assignment workflow, so this script validates membership and verifies assignment itself.

Rollback: disable Onboard approved contributors, or revert its workflow/script/templates. Created personal issues are retained; close them deliberately if appropriate rather than deleting learner work. Keep onboarding exclusions in board auto-add and points scoring. These are independent protections for the learning track.
