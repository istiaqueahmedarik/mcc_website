@AGENTS.md
@DESIGN.md

## Claude Code Operating Notes

### Context Hygiene & Monoliths
- `docs/knowledge-base/*.md` totals >400 KB. Never load entire files blindly: run `rg "^## " docs/knowledge-base/` and read only relevant sections.
- Make surgical edits and extract pure `.mjs`/`.ts` helpers with unit tests rather than rewriting monolithic files (`client/src/app/classroom/live/[id]/ClassroomLiveClient.js`, `server/src/controllers/classroomController.ts`, `server/src/controllers/classroomContestController.ts`, `client/src/app/globals.css`).

### Fast Command Reference
```bash
# Repo PR & policy checks
node --test scripts/pr-convention.test.mjs

# Client (Next.js 16 + React 18 + Tailwind + shadcn JS/JSX)
cd client && npm run lint
cd client && npm run build
node --test client/src/<path-to-file>.test.mjs

# Server (Bun + Hono + raw postgres)
cd server && bun run dev
cd server && bun test
cd server && bun test src/<path-to-file>.test.ts
cd server && bunx tsc --noEmit
```

### Critical Repo Gotchas
- **Dual `/api/*` Routing:** Requests may enter via Next route handlers (`client/src/app/api/*`) or directly into Hono behind nginx. Keep query params (`dashboard=true`), headers/cookies (`X-VJudge-Session` / `vj_session`, `X-Codeforces-Session` / `cf_session`), and error contracts working on both paths.
- **Manual SQL Before Auto-CD:** Merging to `master` auto-deploys via `.github/workflows/cd.yml` after CI succeeds. Apply and document ordered `docs/sql/` migrations before merge.
- **Docker Env Parity:** Changes to `NEXT_PUBLIC_*` or `docker-compose.yml` build args must also update `ci_env.txt` and `.env.example` or CI will fail.
- **Dark-Mode Error Contrast:** Global `.dark` `--destructive` (`#7F1D1D`) is a fill color and is unreadable as foreground text on dark surfaces — override `--destructive: 0 85% 72%` (`#F47B7B`) or use `.trainer-status-danger` (`#F27D7D`), per `DESIGN.md`.
- **Secrets Stay Untouched:** Never read, print, log, or commit `.env`, `.env.local`, `client/.env.local`, `server/.env`, `TYPESAFE_API_KEY`, `JSESSIONID`, or Codeforces API secrets.

### PR & Review Handoff
- **PR Titles:** Must match `<ISSUE>: <Title>` (e.g., `#47: Preserve campaign assignments`, `MCC-12: Support Codeforces group contests`, `NO-ISSUE: Add DESIGN.md and CLAUDE.md`) — enforced by `scripts/pr-convention.mjs` via `.github/workflows/pr-convention.yml` and documented in `CONTRIBUTING.md` (`>= 10` summary chars, `<= 72` recommended / `<= 100` max, single line, no trailing period; `Revert "..."` allowed).
- **PR Body & Final Reply:** Follow `.github/pull_request_template.md` (`## Problem`, `## Changes`, `## Validation`, `## Review notes` with substantive prose) and `AGENTS.md` `## END` — explain what & why, present files in logical execution/reading order (not alphabetical), document migrations/rollback, and separate **Verified** commands/outcomes from **Not verified** boundaries.

### Project Skills & Subagents
- Domain skills live in `.agents/skills/` (including `supabase`, `supabase-postgres-best-practices`, `apple-design`, `emil-design-eng`, `stitch-design-taste`, `caveman-commit`, `jev-subagent-router`). Read the relevant `SKILL.md` before database/RLS, UI, or routing tasks.
- When running parallel Claude Code subagents or Git worktrees, keep one branch per worktree with disjoint write scopes, review every diff before merge, and re-run verification after integration.
