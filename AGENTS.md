# AGENTS.md

Canonical engineering rules and operating map for coding agents working in `mcc_website`. This repository uses an RSD-first delivery workflow — read this file before planning or editing.

---

## 1. Start Here & Delivery Workflow

1. Read the user task and identify whether it requires an approved RSD (substantive features, schema changes, or broad redesigns) or a bounded bugfix/doc change.
2. Read `DESIGN.md` before designing, generating, or editing any UI, and check `CONTRIBUTING.md` for repository governance and PR rules.
3. Search `docs/knowledge-base/` selectively instead of loading every file at once (the directory is >400 KB). Start with headings (`rg "^## " docs/knowledge-base/`) and read only the relevant entries in `project-index.md`, `decisions.md`, `patterns.md`, `mistakes.md`, `quality-rules.md`, `hci-rules.md`, and `doc-usage.md`.
4. Use Context7 (or official documentation) for current library/framework APIs before writing non-trivial integrations.

---

## 2. Architecture & Project Map

- **`client/`**: Next.js `16.1.1` App Router (`React 18.3`, `output: "standalone"`), Tailwind CSS `3.4`, shadcn/Radix UI primitives (`client/src/components/ui/`, `new-york` JS/JSX style), `lucide-react`, TanStack Query v5, and BFF proxy route handlers under `client/src/app/api/`.
  - Key routes/surfaces: `client/src/app/trainer/`, `client/src/app/classroom/live/[id]/`, `client/src/app/admin/forms/`, `client/src/app/register/[slug]/`, `client/src/app/contests_report/`, and `client/src/components/Navbar.js`.
- **`server/`**: Bun `1.2` + Hono `4.5` API with `postgres` (raw SQL queries, no ORM).
  - Entry point: `server/src/index.ts` (port `5000`).
  - Layers: `server/src/routes/`, `server/src/controllers/`, `server/src/services/`, `server/src/utils/`, and `server/src/workers/discordWorker.ts`.
  - Trainer/classroom entry points: `server/src/routes/classroomRoute.ts`, `server/src/controllers/classroomController.ts`, `server/src/controllers/classroomContestController.ts`, `server/src/routes/trainerFormRoute.ts`, and `server/src/routes/globalFormRoute.ts`.
- **`docs/sql/`**: Manual additive PostgreSQL migration scripts (paired with `-rollback.sql` where appropriate).
- **CI/CD & Repo Policy**:
  - `docker-compose.yml`: `frontend` (`3000`), `backend` (`5000`), and `bot` (`bun run discord:worker`).
  - `.github/workflows/ci.yml`: runs `pr-policy-tests`, client `npm ci` + `npm run build`, server `bun install --frozen-lockfile`, and `docker compose build` using `ci_env.txt`.
  - `.github/workflows/cd.yml`: automatically deploys on push to `master` once `CI` succeeds on the self-hosted runner.
  - `.github/workflows/pr-convention.yml`: runs trusted default-branch code via `scripts/pr-convention.mjs` and publishes the required `PR convention` commit status.

---

## 3. Critical Repo Invariants & Hotspots

- **Dual `/api/*` Routing:** Production deployments can hit either Next.js route handlers (`client/src/app/api/*`) or Hono directly behind nginx. Keep contracts, query params (such as `dashboard=true`), and provider session handling (`X-VJudge-Session` / `vj_session`, `X-Codeforces-Session` / `cf_session`) consistent across both paths.
- **Manual SQL Migrations Before Auto-CD:** Merging to `master` triggers automatic deployment after `CI` passes. Never assume migrations run automatically — record exact ordered `docs/sql/` apply steps and rollback notes before merge.
- **Docker Build Env Parity:** Whenever adding or changing `NEXT_PUBLIC_*` variables or `docker-compose.yml` build args, update both `ci_env.txt` and `.env.example` so `docker compose config` in CI stays green.
- **Monolithic Hotspots:** Make surgical edits and extract pure `.mjs`/`.ts` helpers with unit tests rather than rewriting large files wholesale:
  - `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  - `server/src/controllers/classroomController.ts`
  - `server/src/controllers/classroomContestController.ts`
  - `client/src/app/globals.css`

---

## 4. Local Commands & Verification

Run the narrowest verification covering your change, then scale up when risk justifies it:

```bash
# Repo policy / PR convention tests
node --test scripts/pr-convention.test.mjs

# Client
cd client && npm run lint
cd client && npm run build
node --test client/src/<path-to-file>.test.mjs

# Server
cd server && bun run dev
cd server && bun test
cd server && bun test src/<path-to-file>.test.ts
cd server && bunx tsc --noEmit
cd server && bun run discord:worker
```

- For client navigation/UI changes, run `cd client && npm run lint`, then `cd client && npm run build` when scope or risk justifies it.
- Loopback QA and verification scripts live under `client/scripts/` and `server/scripts/` and must use synthetic/loopback fixtures only — never live production accounts or databases.
- Always report exactly what **was verified** (commands and observed results) and what **was not verified** (hosted DB, live browser QA, external provider credentials, production deployment).

---

## 5. Pull Request & Commit Conventions

### PR Title (CI-Enforced by `scripts/pr-convention.mjs` via `.github/workflows/pr-convention.yml`, documented in `CONTRIBUTING.md`)

Every pull request title targeting `master` must use `<ISSUE>: <Title>`:

- **GitHub issue:** `#47: Preserve campaign assignments`
- **External / tracker ID (`2–10` uppercase letters + `-<number>`):** `MCC-12: Support Codeforces group contests`
- **Untracked chores/docs/hotfixes opt-out:** `NO-ISSUE: Add DESIGN.md and CLAUDE.md`
- **GitHub revert titles:** `Revert "..."` is permitted for emergency rollbacks (`<= 100` chars, single line).

Title rules:
- Use a single space after the colon (the validator also accepts `<ISSUE>:<Title>` without a space).
- Write a concrete imperative summary (`>= 10` chars), single line, with **no trailing period**.
- Keep total length `<= 72` chars recommended (`<= 100` chars enforced by `scripts/pr-convention.mjs`).
- Append optional rollout flags (`[+sql]`, `[!env]`) inside `<Title>` when manual migration or env rollout steps are required before merge.

### PR Description (`.github/pull_request_template.md`, enforced by `scripts/pr-convention.mjs`)

- Complete these exact level-two headings once each, with at least 20 characters and 3 words of substantive prose outside HTML comments and fenced examples (no bare `TODO`, `TBD`, `N/A`, or untouched template text):
  1. `## Problem` — concrete problem, trigger, reason, and linked issue (`Closes #<num>` / `Fixes #<num>` / `Refs #<num>` / `NO-ISSUE`).
  2. `## Changes` — resulting behavior and key implementation decisions.
  3. `## Validation` — exact commands/checks run and observed results, plus explicit **Not verified** boundaries.
  4. `## Review notes` — ordered **Reading Order** (`docs/sql/` -> `server/` -> `client/` -> tests, never alphabetical or random), risks, and migrations/env/rollback instructions (or brief explanation if none apply).

### Commits & Branches

- **Commits:** Conventional Commits (`feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`, `perf(scope): ...`, `docs(scope): ...`, `test(scope): ...`, `chore(scope): ...`), subject `<= 72` chars (`<= 50` preferred).
- **Branches:** Short semantic kebab-case (`feat/<slug>`, `fix/<slug>`, `docs/<slug>`, `refactor/<slug>`, `codex/<slug>`).

---

## 6. UI & Design Guidelines

- Read `DESIGN.md` and applicable sections of `docs/knowledge-base/hci-rules.md` before designing or updating interfaces.
- Follow Vercel's Web Interface Guidelines (`https://vercel.com/design/guidelines`) for any new page, new product surface, reusable UI component, or major page redesign unless an approved RSD records a deliberate exception.
- Load and apply the UI design skill stack before choosing layout, component structure, motion, or polish details:
  - `interface-design` (from your agent's global skills if installed) for product intent, hierarchy, tokens, density, states, and design-system fit.
  - `.agents/skills/apple-design/SKILL.md` for direct manipulation, fluid/interruptible motion, spatial consistency, translucent materials, typography, and reduced-motion behavior.
  - `.agents/skills/emil-design-eng/SKILL.md` for component polish, animation timing/easing, press feedback, transform-origin details, and UI review formatting.
- Before final handoff, audit generated interfaces for keyboard access, visible `:focus-visible`, focus management/return, `>= 44px` hit targets, semantic `<button>` vs `<Link>`, URL-backed state where relevant, loading/empty/error states, responsive mobile/laptop/ultra-wide layout, long-content resilience, form whitespace/error behavior, `prefers-reduced-motion`, `prefers-reduced-transparency`, `forced-colors`, dark-mode error contrast, compositor-only animation, and avoiding layout shift.
- Preserve approved trainer/classroom operational UI decisions and prefer existing shadcn/Radix primitives (`client/src/components/ui/`), Tailwind semantic tokens, and `lucide-react` icons over new abstractions.
- Do not perform unrequested retroactive cleanup of unrelated existing pages; broad redesign or compliance sweeps require a separate approved RSD.

---

## 7. Jev-Orchestrated Subagents & Parallel Work

- For substantive project tasks, load and follow `.agents/skills/jev-subagent-router/SKILL.md`. The main task acts as orchestrator: use Jev to select the configured model/reasoning tier and agent role, delegate the bounded work with `fork_turns: "none"`, then review and integrate the result. Keep greetings, status checks, tiny factual replies, and user-blocked questions in the main task.
- Before presenting a multiple-choice question, use the same skill's `recommend` mode to select one recommended option from the finalized choices. Put that option first and mark it `(Recommended)` **only** when the router reports sufficient confidence; never answer or authorize an action on the user's behalf.
- **Parallel Work (Git Worktrees):**
  - Parallel agents must run in separate Git worktrees.
  - One agent per worktree; one branch per worktree.
  - Disjoint write scopes only.
  - Review diffs before merge and re-run verification after integration.

---

## 8. Project Memory & Planning Artifacts

Keep durable project memory in `docs/knowledge-base/`:
- `project-index.md`: capabilities, entry points, important files, owners
- `patterns.md`: reusable implementation and testing patterns
- `decisions.md`: durable project decisions
- `mistakes.md`: mistakes, near misses, and prevention notes
- `quality-rules.md`: repository-specific quality rules
- `hci-rules.md`: operational UI and HCI rules
- `doc-usage.md`: documentation/source audit trail

Update project memory after every approved RSD, approved technical decision package, approved task plan, implementation review, final merge, and mistake note.

Default artifact directories:
- RSDs: `docs/rsd/`
- ADRs: `docs/adr/`
- Technical Decisions: `docs/decisions/`
- Task Plans: `docs/tasks/`
- Reviews: `docs/reviews/`
- SQL Migrations: `docs/sql/`

---

## 9. Review Standards, Code Quality Bar & Security Checklist

### Review Standards
Review for: requirement satisfaction, correctness, maintainability, RSD/code-quality adherence, test coverage, security & privacy, migration & rollback safety, and documentation/knowledge-base updates.

### Code Quality Bar
- Keep designs simple and requirement-driven; prefer existing local patterns over speculative abstractions or cargo-cult patterns.
- Hide volatile implementation details and avoid code smells (bloaters, change preventers, dispensables, excessive coupling, pattern misuse).
- Refactor in small test-backed steps and remove duplicate knowledge, dead code, and unclear names within the approved scope.
- Record durable quality lessons in `docs/knowledge-base/quality-rules.md`.

### Security Checklist
Before final merge, verify:
- Authorization and permissions (and Supabase/Postgres RLS + grant boundaries)
- Data exposure (never leak unmapped external data, raw upstream payloads, or internal error internals)
- Input validation and injection risks (parameterized SQL, bounded uploads/URLs, no shell interpolation of untrusted PR/user strings in workflows)
- Secret handling and logging: never commit, print, or expose `.env`, `.env.local`, `client/.env.local`, `server/.env`, `TYPESAFE_API_KEY`, `JSESSIONID`, or Codeforces API keys/secrets
- Dependency risk and unsafe defaults

---

## END

Write for the reviewer to review:
- Explain clearly what you did and why you did it.
- Present changed files in a logical reading flow (not random or alphabetical order) so the reviewer can review as if they wrote it.
- State exact verification runs alongside any unverified boundaries.
