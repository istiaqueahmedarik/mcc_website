# [Onboarding] {{member}} — Technical terms and contribution workflow

Parent epic: {{epic_url}}
Member: @{{member}} · Mentor: @{{mentor}}

## Goal

Understand enough implementation and delivery vocabulary to follow a small issue through review and testing.

| Term | Plain-language meaning / where to look |
| --- | --- |
| Repository | Version-controlled project source and documentation |
| Branch, commit, diff | A line of work, a saved change, and the differences being reviewed |
| Issue / epic / sub-issue | A scoped task, a larger outcome, and its related smaller tasks |
| PR | Pull request: a proposed branch change for review and integration |
| Frontend / client | The Next.js/React app in client/ |
| Backend / API | The Bun/Hono service in server/ that processes requests and enforces rules |
| Component / route | Reusable UI and an addressable page or request handler |
| HTTP request / response | A client asking a service for work and the service returning a result |
| PostgreSQL / SQL | The database and the language used to query/change its data |
| Schema / migration / rollback | Data structure, a deliberate structure change, and its recovery procedure |
| Supabase | A service integrated with this project; its exact local Auth/Storage/Realtime requirements depend on the task |
| Authentication / authorization | Proving who you are versus deciding what you may do |
| Environment variable / secret | Runtime configuration; sensitive values stay out of issues, screenshots, commits, and browser bundles |
| NEXT_PUBLIC_ | A Next.js convention for values that may be exposed to the browser; never use it for a privileged key |
| CI / CD | Automated change checks versus release/deployment automation |
| Acceptance criteria / Gherkin | Observable completion conditions, often written Given / When / Then |
| Regression | A change breaking previously working behavior |
| Story point | Relative estimated complexity/effort, not hours or automatically earned credit |
| RSD / ADR | Project planning/decision artifacts; read AGENTS.md and existing examples for the project's expected format |

## Repository map

- client/src/app/: pages and Next route handlers, including app/api/.
- client/src/components/: shared UI; Navbar.js is a useful product navigation entry point.
- server/src/index.ts: API route registration and backend port configuration.
- server/src/routes/: API route definitions.
- server/src/controllers/: request and business logic.
- server/src/db.ts: PostgreSQL connection configuration.
- docs/sql/: feature migrations; do not run the directory indiscriminately.
- docs/knowledge-base/: project index, patterns, decisions, mistakes, and quality rules.
- .github/workflows/: CI/CD automation.

## Tasks

- [ ] Read AGENTS.md and CONTRIBUTING.md on the current default branch.
- [ ] Use a docs-only example to explain branch → commit → PR → review → merge.
- [ ] Trace one UI action to a Next API route or backend route and controller, with mentor help.
- [ ] Explain authentication versus authorization and a failure case for each.
- [ ] Explain local testing versus CI versus deployed verification.
- [ ] Explain the workflow: Backlog → Todo → In progress → Ready for testing → In testing → Done.
- [ ] Explain why failed testing returns work to In progress and why Done needs acceptance evidence.
- [ ] Explain that only the owner has the configured merge override; story points do not grant access automatically.

## Acceptance criteria

- [ ] The member locates relevant files without needing to understand every module.
- [ ] The member can describe one request path and one permission boundary.
- [ ] The member can explain how a change becomes reviewable and how its behavior is validated.
- [ ] No secret values are included in examples or posted evidence.

```gherkin
Feature: Contribution readiness
  Scenario: Prepare a change for testing
    Given the member has implemented a scoped issue on a branch
    When they open a PR and hand it off for testing
    Then the PR explains what changed, why, and how it was checked
    And provides reproducible acceptance steps
    And testing failures return the work to In progress
    And merge authority is not inferred from completed story points
```

## Completion evidence

Post a small request-path sketch, definitions of five previously unfamiliar terms, and a short description of the PR/testing workflow. Mentor reviews it; publishing a throwaway PR is not required.

## Checkpoint update

Before requesting sign-off, post: **what I tried → what I observed → what I can explain → remaining blocker → next action/owner**. Include links or sanitized evidence; never include environment files or tokens. Mentor: confirm the acceptance criteria or leave a specific next step.

## Practical first-change exercise (local only)

1. Choose a documentation sentence the mentor agrees could be clearer.
2. Create a local branch and edit that sentence.
3. Inspect the diff and explain the before/after behavior or meaning.
4. Write a proposed PR description with purpose and verification.
5. Ask the mentor to review the diff locally; a public PR is optional and requires an agreed useful change.

Do not include credentials, alter access checks, or run a migration for this exercise. Explain why a passing build alone is insufficient proof that a user journey works.
