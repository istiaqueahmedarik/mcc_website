# [Onboarding] {{member}} — Product glossary

Parent epic: {{epic_url}}
Member: @{{member}} · Mentor: @{{mentor}}

## Goal

Learn the words used by club members and in product issues. Technical implementation vocabulary belongs in the separate technical-terms ticket.

| Term | Meaning in this project |
| --- | --- |
| MCC | MIST Computer Club, the community served by the website |
| Student ID / MIST ID | The student's nine-digit institutional identifier; different from an account's internal database ID |
| Batch | A student intake/group used for organizing profiles and activities |
| OJ | Online judge: a platform hosting programming problems and contests |
| Handle / OJ ID | A username on an online judge, different from the student's institutional ID |
| CF / Codeforces | A supported contest platform and source of student handles/results |
| VJudge | A contest platform/provider used in report workflows |
| CodeChef / AtCoder | Other judge platforms whose handles can appear in profiles |
| Verification | Administrative review of identity/profile updates; submission alone does not imply approval |
| Trainer | A member responsible for classroom teaching/operations |
| Classroom | A managed teaching group with students and learning activities |
| Template | A reusable definition of questions and registration information |
| Campaign | A particular registration round created from a template with its own link and lifecycle |
| Response / registration | A student's saved submission to a campaign |
| Contest room / report | A grouping of contest inputs and the resulting student performance report |
| Eligibility filter | A restriction selecting which students a report includes, for example campaign respondents |
| Standings | A contest's participant results and rankings |
| Upsolving | Solving contest problems after the contest has ended |
| ICPC | International Collegiate Programming Contest |
| TFC | A club-specific registration/program label; ask the mentor for the current official expansion and scope rather than guessing |

## Tasks

- [ ] Read the glossary and locate at least five terms in the website.
- [ ] Explain account identity, institutional ID, and judge handle with a synthetic example.
- [ ] Explain template → campaign → response in your own words.
- [ ] Explain classroom membership versus a global campaign registration.
- [ ] Ask the mentor to confirm TFC and any club-specific abbreviations.
- [ ] Propose one glossary clarification based on something you found confusing.

## Acceptance criteria

- [ ] The member accurately distinguishes the identity and forms concepts above.
- [ ] Unknown abbreviations are confirmed or explicitly left unresolved.
- [ ] Examples use invented student data and no real personal information.

```gherkin
Feature: Shared product vocabulary
  Scenario: Distinguish a template from a registration
    Given an administrator creates a campaign from a template
    When a student submits that campaign
    Then the member identifies the reusable question definition as the template
    And the registration round as the campaign
    And the student's submission as a response
```

## Completion evidence

Post five short explanations, one synthetic identity example, and any terms requiring mentor clarification. Mentor confirms or corrects the explanations.

## Checkpoint update

Before requesting sign-off, post: **what I tried → what I observed → what I can explain → remaining blocker → next action/owner**. Include links or sanitized evidence; never include environment files or tokens. Mentor: confirm the acceptance criteria or leave a specific next step.

## Practice with invented data

Use a fictional student with a nine-digit institutional ID and unrelated judge handle. Describe a template reused for two campaigns and one response to each. Explain which objects can change independently. Ask the mentor to correct any mistaken assumptions; update your explanation before sign-off.

Distinguish contest participant rankings (standings) from the club's generated report and its eligibility/scoring choices. A cohort is a group of selected students; use the actual product labels when discussing the UI.
