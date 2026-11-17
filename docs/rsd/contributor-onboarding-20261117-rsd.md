# Improved and automatic contributor onboarding

The user requested stronger onboarding and asked whether it can be created when a contributor is added. Existing template epic #56 and children #57–60 remain a separate learning track outside the Development board.

## Authorized delivery

Improve the five public master descriptions with a learning sequence, mentor responsibilities, observable checkpoints, teach-back exercises, blocker updates, and setup evidence. Add reviewable automation that creates one personalized epic and four native sub-issues when a new member enters the approved contributor roster. Preserve completed work and recover interrupted runs. No member invitations, access grants, production setup, or application feature changes.

## Trigger decision

GitHub documents member:added as an invitation-acceptance webhook, not a direct Actions trigger. Do not invent on:member. Use a default-branch push touching the approved roster, an hourly best-effort reconciliation, and workflow_dispatch. Joining only the GitHub repository or private board does not update the repository roster automatically. The owner maintains that established membership mirror. A webhook receiver for raw invitation events is a separate future integration requiring its own secure endpoint; none is deployed here.

Existing owner and trqrizu are baseline members and are skipped automatically. Manual dispatch can explicitly onboard either. Targets and mentors must already be in the approved roster. Existing membership/merge permissions remain unchanged.

## Acceptance criteria

- A new approved non-baseline member receives one epic and four child tickets with member, mentor, Dhaka start date, correct links, and onboarding labels.
- Repeated runs create no duplicate trusted records. Lost responses and missing relationships can be repaired independently.
- Closed tickets, learner answers, and mentor notes survive reruns; only the epic's managed child-link region is maintained.
- A spoofed marker in a public outsider's issue cannot suppress onboarding. Duplicate trusted markers fail before writes.
- Unassignable outside contributors remain visible as assignment pending; no false success or Write grant.
- Onboarding/template issues stay outside development auto-add and never earn contribution points.
- Execution uses trusted default-branch source, pinned actions, contents:read/issues:write, serialization and a timeout. No new token or server is required.
- Tests and read-only preview are reported as such; a hosted automatic creation is not claimed until the workflow is merged and a real member is onboarded.
