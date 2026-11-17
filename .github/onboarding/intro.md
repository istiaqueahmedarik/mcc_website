# [Onboarding] {{member}} — Website introduction

Parent epic: {{epic_url}}
Member: @{{member}} · Mentor: @{{mentor}}

## Goal

Understand who the website serves and what users are trying to accomplish before reading implementation details.

## Guided tour

Ask the mentor for the current website URL and approved test accounts. Browse public areas first; use a development/test environment for actions that create or change data.

| Area | What to understand |
| --- | --- |
| Contests and reminders | How members discover upcoming practice and contest opportunities |
| Profiles and OJ identities | Student identity, judge handles, and why verification matters |
| Contest reports | How a contest room combines provider results and scores students |
| Trainer/classroom | Classroom membership, learning activities, and trainer responsibilities |
| Global forms | Templates, campaigns, sign-in, registration, and admin response review |
| Other club areas | Locate achievements, alumni, ICPC, teams, and typing; ask which are relevant to your role |

Public visitors, students, trainers, and administrators do not see the same controls. A hidden button is not proof of server authorization.

## Tasks

- [ ] Browse the public navigation and identify three useful areas.
- [ ] Explain the difference between student, trainer, and administrator access.
- [ ] With mentor guidance, walk through one relevant journey using approved test data.
- [ ] Identify its success state, one error/blocked state, and who can perform it.
- [ ] Explain the difference between classroom forms and global registration campaigns.
- [ ] Record three questions or confusing product terms for the glossary discussion.

Example journey: student opens a registration URL → signs in → reviews profile/form details → submits → administrator reviews the registration. A submitted registration does not automatically verify a pending judge-identity update.

## Acceptance criteria

- [ ] The member explains the product in their own words rather than copying a feature list.
- [ ] One journey identifies actor, goal, steps, expected result, and access boundary.
- [ ] Exploration creates no production registrations, reports, or account changes.
- [ ] The mentor confirms the member can choose a relevant area for a first issue.

```gherkin
Feature: Website orientation
  Scenario: Explain a real user journey
    Given the member has toured the website using approved access
    When the mentor asks how a student completes registration
    Then the member identifies the actor, steps, and expected result
    And distinguishes submission from identity verification
    And explains which admin actions the student cannot perform
```

## Completion evidence

Post a short product summary, one journey in five to eight steps, remaining questions, and mentor acknowledgement. Screenshots are optional and must use public or synthetic data.

## Checkpoint update

Before requesting sign-off, post: **what I tried → what I observed → what I can explain → remaining blocker → next action/owner**. Include links or sanitized evidence; never include environment files or tokens. Mentor: confirm the acceptance criteria or leave a specific next step.

## Teach-back questions

1. What problem does the site solve for a student? For a trainer?
2. Which page would you use to find a contest, register for a campaign, and review a report?
3. What should happen when a signed-out visitor opens a registration link?
4. Why does a submitted form not automatically verify a judge handle?

Completion means explaining these with one demonstrated journey, not memorizing menu names. Use the current UI rather than assuming every area is available to every role.
