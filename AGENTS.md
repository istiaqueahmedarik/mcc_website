# AGENTS.md

This repository uses an RSD-first delivery workflow. Agents must read this file before planning or editing.

## Project Shape

- `client/`: Next.js app using React, Tailwind CSS, shadcn/Radix UI components, lucide icons, and route handlers under `client/src/app/api/`.
- `server/`: Bun-powered Hono API with PostgreSQL access under `server/src/`.
- Trainer/classroom UI entry points live mainly under `client/src/app/trainer/`, `client/src/app/classroom/`, and `client/src/components/Navbar.js`.
- Trainer/classroom API entry points live under `server/src/routes/classroomRoute.ts`, `server/src/controllers/classroomController.ts`, and trainer form routes/controllers.

## Start Here

1. Read the user task.
2. Read the knowledge base under `docs/knowledge-base/` if present.
3. Create or update the RSD before implementation planning.
4. Stop for user approval at required gates.
5. Keep changes scoped to the approved task plan.

## Required Gates

Agents must pause and ask for user approval after:

- Primary Requirement Satisfaction Document
- Technical decisions and any ADRs
- Full task plan and dependency graph
- Implementation review before final merge

## Project Memory

Keep durable project memory in `docs/knowledge-base/`:

- `project-index.md`: capabilities, entry points, important files, owners
- `patterns.md`: reusable implementation and testing patterns
- `decisions.md`: durable project decisions
- `mistakes.md`: mistakes, near misses, and prevention notes
- `quality-rules.md`: repository-specific quality rules

Update project memory after every approved RSD, approved technical decision package, approved task plan, implementation review, final merge, and mistake note.

## Planning Artifacts

Use these default locations:

- RSDs: `docs/rsd/`
- Technical decisions: `docs/decisions/`
- ADRs: `docs/adr/`
- Task plans: `docs/tasks/`
- Reviews: `docs/reviews/`

## Parallel Work

Parallel agents must run in separate Git worktrees.

Rules:

- One agent per worktree.
- One branch per worktree.
- Disjoint write scopes only.
- Review diffs before merge.
- Re-run verification after integration.

## Local Commands

Client:

```powershell
Set-Location client
npm run lint
npm run build
```

Server:

```powershell
Set-Location server
bun run dev
```

Use the narrowest verification that covers the changed files. For client navigation/UI changes, prefer `npm run lint` in `client/`, then `npm run build` when risk or scope justifies it.

## Review Standards

Review for:

- Requirement satisfaction
- Correctness
- Maintainability
- Code-quality rules from the RSD orchestrator references
- Test coverage
- Security and privacy
- Migration and rollback safety
- Documentation and knowledge-base updates

## Code Quality Bar

Agents must optimize for readable, maintainable, deliberately designed code.

Apply these rules:

- Keep designs simple and requirement-driven.
- Prefer existing local patterns over new abstractions.
- Hide volatile implementation details.
- Avoid code smells: bloaters, change preventers, dispensables, excessive coupling, and pattern misuse.
- Refactor in small test-backed steps.
- Avoid speculative abstractions and cargo-cult design patterns.
- Remove duplicate knowledge, dead code, and unclear names within the approved scope.
- Record durable quality lessons in `docs/knowledge-base/quality-rules.md`.

## Security Checklist

Before final merge, check:

- Authorization and permissions
- Data exposure
- Input validation and injection risks
- Secret handling
- Logging of sensitive data
- Dependency risk
- Unsafe defaults
