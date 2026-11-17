# [Onboarding] {{member}} — MCC Website contributor

> Member onboarding for @{{member}}. Mentor: @{{mentor}}. Started {{start_date}}. This learning track stays outside the Development board and does not award story points.

## Purpose

Welcome to MCC Website, the MIST Computer Club's platform for students, trainers, and administrators. This onboarding helps you understand the product, run a safe development environment, learn our vocabulary, and become ready for a first contribution.

You are not expected to know the entire codebase. By the end, you should know where to start, how to ask for help, and how to show that your work behaves correctly.

## Member and mentor

- Member: @{{member}}
- Mentor: @{{mentor}}
- Start date: {{start_date}}
- Intended area of contribution: <area or exploring>
- First contribution, if agreed: <issue link>

Do not include personal contact details, credentials, tokens, or private environment values in this public issue.

## Learning sequence and child tickets

<!-- onboarding-links:start -->
{{child_links}}
<!-- onboarding-links:end -->

Suggested order: introduction → glossary → technical terms → local setup. Tasks can overlap with mentor help. A blocked dependency is recorded, not treated as a member failure.

## Overall understanding

The website supports contest information and reminders, student profiles and online-judge identities, contest reports, trainer/classroom learning, global registration forms, and other club activities. Public visitors, signed-in students, trainers, and administrators have different access.

The repository has a Next.js/React client in `client/` and a Bun/Hono API in `server/`, with PostgreSQL and Supabase-related integrations. Domain rules and authorization matter as much as UI changes.

Start with:

- [Repository](https://github.com/istiaqueahmedarik/mcc_website)
- [Agent/contribution rules](https://github.com/istiaqueahmedarik/mcc_website/blob/master/AGENTS.md)
- [Contributor guide](https://github.com/istiaqueahmedarik/mcc_website/blob/master/CONTRIBUTING.md)
- [Project knowledge base](https://github.com/istiaqueahmedarik/mcc_website/tree/master/docs/knowledge-base)

## Definition of complete

- [ ] All four child tickets are complete with evidence and mentor acknowledgement.
- [ ] The member can explain one user journey and identify the related UI/API areas.
- [ ] A local client and API work with an approved development environment, or a specific access/setup blocker is recorded and resolved before technical sign-off.
- [ ] The member understands issue → implementation → PR → review → testing → acceptance.
- [ ] The member knows who can approve access and merge changes.
- [ ] The mentor agrees the member is ready for a scoped first issue.

Onboarding completion does not automatically grant Write, merge, admin, deployment, or secret access. These learning tickets earn no contribution points. Ask the mentor to select a separate scoped delivery issue after sign-off.

## Acceptance scenario

```gherkin
Feature: New contributor onboarding
  Scenario: Become ready for a first contribution
    Given a new member and mentor have copied this epic and its four child tickets
    When the member completes the learning tasks and demonstrates the local setup
    And the mentor reviews the evidence and resolves the recorded blockers
    Then the member can explain the product and contribution workflow
    And the mentor can recommend a scoped first contribution
    And repository permissions remain subject to a separate owner decision
```

## Mentor closeout

- Strengths / areas to practise: <notes>
- Setup or documentation gaps discovered: <links>
- Recommended first issue: <link>
- Mentor sign-off: @<username>, <date>


## How to work through this

1. Introduce yourself with your intended contribution area and current experience; no prior framework knowledge is assumed.
2. Meet the mentor to confirm development access, test data, and the learning order. The mentor owns access/schema blockers.
3. Work through one child ticket at a time. Read → try → explain what happened → ask for feedback.
4. Use the update format below when completing a checkpoint or asking for help. The mentor reviews evidence and records corrections; reading alone is not sign-off.
5. Hold a final walkthrough: explain one user journey, demonstrate local setup, and propose a safe first contribution.

### Progress / blocker update

- Step attempted:
- Expected result:
- Actual result (sanitized):
- What I tried:
- Help or access needed:
- Next action and owner:

### Mentor responsibilities

- Confirm a contact/working arrangement privately and provide approved development resources.
- Give feedback on each ticket, record blockers and owners, and clarify unfamiliar terminology.
- Verify demonstrations before sign-off; do not grant production credentials to get around a setup problem.
- Confirm the member knows how to request review and when a change is ready for testing.

### Final teach-back

- Explain template → campaign → registration and student versus administrator permissions.
- Trace one browser action to the relevant client/API/database area.
- Demonstrate the local client and API using synthetic data, including one failure/blocked state.
- Show a small local documentation diff and explain the checks/review it would need.

Automation creates or repairs missing tickets and relationships. It preserves your existing answers, completed tickets, and mentor notes; rerunning it is not a reset.
