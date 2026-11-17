# [Onboarding] {{member}} — Local development setup

Parent epic: {{epic_url}}
Member: @{{member}} · Mentor: @{{mentor}}

## Goal

Run the client and API against an approved development environment and demonstrate one read-only or synthetic-data journey. Starting a page alone does not prove authentication or database setup works.

## Before starting: mentor preparation

- [ ] Confirm the member's OS and available disk space.
- [ ] Provide approved development PostgreSQL/Supabase resources, sanitized data, and access privately.
- [ ] Supply the current schema bootstrap and ordered migrations appropriate to those resources.
- [ ] Supply a test account and required roles through an approved private channel.
- [ ] Explain which integrations are needed and which can remain disabled.

Important setup gap: the inspected repository contains feature migrations and test fixtures, but this draft does not establish a complete clean-database bootstrap. Do not run every file in docs/sql or treat a feature-test fixture as the full application schema. If bootstrap or development access is unavailable, record that dependency and have the mentor resolve it before claiming full setup.

## Prerequisites

Install Git, Node.js with npm, and Bun from their official distributions. The inspected CI uses Node 24.x and Bun 1.2.x; confirm the current .github/workflows/ci.yml before installation because versions may change. Docker is optional for a mentor-approved container route; the repository Compose file is a production-style stack and does not itself provision a development database.

```bash
git --version
node --version
npm --version
bun --version
```

## 1. Obtain the source

Use your fork for contributions unless the maintainer has explicitly granted repository branch access.

```bash
git clone https://github.com/istiaqueahmedarik/mcc_website.git
cd mcc_website
```

Read AGENTS.md, CONTRIBUTING.md, and docs/knowledge-base/. Run from the current default branch, master, unless the mentor specifies another reviewed starting point.

## 2. Configure development-only environment files

Use the tracked .env.example as a variable-name reference. Ask the mentor for minimal client and server snippets rather than copying production credentials or every optional integration setting.

Create client/.env.local and server/.env. Keep both untracked. At minimum, coordinate these values:

| File | Configuration |
| --- | --- |
| client/.env.local | SERVER_URL=http://localhost:5000 and NEXT_PUBLIC_SERVER_URL=http://localhost:5000 |
| client/.env.local | Approved NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY; any required server-only Supabase configuration supplied separately by the mentor |
| server/.env | PORT=5000, DATABASE_URL for the approved development database, SECRET for development authentication, and the Supabase configuration required by the selected user journey |
| Both as needed | Client/site origin settings from .env.example, aligned with http://localhost:3000 and the mentor's authentication callback configuration |

An anonymous/public key is not a service-role key. Never put DATABASE_URL, SECRET, Supabase service keys, judge credentials, or bot tokens into NEXT_PUBLIC_ variables. Do not paste environment-file contents into this issue.

Disable Discord and other outbound integrations unless the mentor explicitly sets up test destinations. Do not use production email, bot, judge, or database credentials for onboarding.

## 3. Install dependencies

From client/:

```bash
npm ci
```

From server/:

```bash
bun install --frozen-lockfile
```

If a lockfile/version error occurs, record the error and runtime version. Do not delete or regenerate lockfiles just to get past it.

## 4. Start the API

In one terminal, from server/:

```bash
bun run dev
```

The backend's default port is 5000, as defined in server/src/index.ts. The short server README's localhost:3000 note is not the backend port. Missing DATABASE_URL prevents startup; an unreachable database can also cause the background scheduler to stop the process. Fix approved development configuration rather than disabling safety/authorization logic.

## 5. Start the client

In a second terminal, from client/:

```bash
npm run dev
```

Open http://localhost:3000. Confirm that client API requests target the approved local backend, not the deployed website.

## 6. Verify the environment

- [ ] Client loads at localhost:3000 and API stays running at localhost:5000.
- [ ] A mentor-approved database-backed page loads without connection/schema errors.
- [ ] A supplied test account can sign in and access the expected role-specific area.
- [ ] A student account cannot use admin-only operations.
- [ ] One agreed feature works using synthetic/read-only data.
- [ ] From client/, npm run lint completes; record existing warnings separately from new errors.
- [ ] Run npm run build when appropriate for the machine/task; record any environment-specific failure honestly.
- [ ] git status --short shows no credential files or unintended lockfile changes.

## Troubleshooting

| Symptom | First checks |
| --- | --- |
| Port already in use | Identify the process with the mentor; do not stop someone else's service |
| Missing DATABASE_URL | Check the server environment file and launch directory |
| Repeated database failures / missing tables | Confirm approved database reachability and the mentor's schema/migration sequence |
| Client loads but API fails | Inspect the browser request URL, backend terminal, SERVER_URL and NEXT_PUBLIC_SERVER_URL; restart after changing environment values |
| Sign-in or callback failure | Check approved test account, Supabase configuration, callback origin, and cookies with the mentor |
| Optional integration errors | Keep the integration disabled or obtain approved test-only configuration |

## Acceptance criteria

- [ ] Runtime versions, commands, and local ports are recorded.
- [ ] Client, API, development database, and an agreed authenticated flow work together.
- [ ] Local setup makes no production data changes or real external notifications.
- [ ] Evidence distinguishes successful checks from unresolved dependencies.
- [ ] Mentor can reproduce the setup from the recorded non-secret instructions.

```gherkin
Feature: Safe local development
  Scenario: Run the website with approved development resources
    Given the mentor supplies a development schema, environment configuration, and test account
    When the member installs locked dependencies and starts the API and client
    Then the client loads on port 3000 and the API runs on port 5000
    And an agreed database-backed authenticated journey works
    And a student cannot perform an administrator-only action
    And no production data or notifications are changed

  Scenario: Required development resources are missing
    Given the member has not received the schema or development access
    When local setup reaches that dependency
    Then the member records the blocker without exposing secrets
    And the mentor resolves the missing resource
    And full local-setup acceptance remains incomplete until verified
```

## Completion evidence

Post OS/runtime versions, completed commands/checks, the tested journey, sanitized error summaries, unresolved blockers, and mentor acknowledgement. Screenshots must use synthetic data. Never attach environment files, tokens, cookies, or connection strings.

## Checkpoint update

Before requesting sign-off, post: **what I tried → what I observed → what I can explain → remaining blocker → next action/owner**. Include links or sanitized evidence; never include environment files or tokens. Mentor: confirm the acceptance criteria or leave a specific next step.

## Setup checkpoint log

| Checkpoint | Expected observation | Member evidence / blocker | Mentor review |
| --- | --- | --- | --- |
| Toolchain | Git, Node/npm and Bun versions match the agreed versions | Pending | Pending |
| Source and environment | Correct checkout; local-only secrets remain ignored | Pending | Pending |
| Data dependencies | Approved development schema and account are supplied | Pending | Pending |
| API | Port 5000 responds; no repeated DB failures | Pending | Pending |
| Client | Port 3000 loads and reaches the intended API | Pending | Pending |
| Auth and roles | Test sign-in works; student cannot perform an admin operation | Pending | Pending |
| Relevant feature | Mentor-selected journey behaves correctly with synthetic data | Pending | Pending |
| Handoff | Another member can follow the recorded non-secret steps | Pending | Pending |

If a step fails, stop at that checkpoint, capture only sanitized errors, and name the person/action needed to unblock it. Optional integrations are not required unless they are part of the agreed journey. Do not solve a blocker by pointing the app at production.
