# Jev subagent router implementation review

## Outcome

The repository now supports a main-task orchestration workflow in which TypeSafe Jev recommends the Codex subagent model tier and role. It also supports Jev-backed recommended-option selection before a multiple-choice user question. No application runtime, API route, database, or deployment behavior changed.

Router commands load `TYPESAFE_API_KEY` from the process environment and may source the project-local, Git-ignored `.env.local` through Node's environment-file option. Live Jev routing and recommendation calls succeeded; missing-key behavior returns a structured deterministic fallback.

## Review flow

1. `AGENTS.md` activates the repository-scoped orchestration policy for substantive tasks and recommended-choice questions.
2. `.agents/skills/jev-subagent-router/SKILL.md` defines the main-task/subagent boundary, exact model tier mapping, role behavior, worktree constraint, and recommendation workflow.
3. `.agents/skills/jev-subagent-router/scripts/route-task.mjs` performs the bounded TypeSafe HTTP request, validates typed Choice responses, maps them to spawn settings, and handles confidence or service failure without exposing credentials.
4. `.agents/skills/jev-subagent-router/scripts/route-task.test.mjs` locks the model mapping, role mapping, low-confidence escalation, stable option mapping, missing-key behavior, and conservative fallback tiers.
5. `docs/knowledge-base/project-index.md`, `decisions.md`, and `patterns.md` record the durable entry points, authority boundary, and reusable routing pattern.

## Safety review

- The TypeSafe API key is read only from `TYPESAFE_API_KEY` and is not logged or serialized into the request body. The local `.env.local` credential file is Git-ignored and must remain owner-readable only.
- Input is limited to 32 KiB and the external request timeout is bounded from 250 to 5000 ms.
- User task text and option labels are state only; they are never evaluated as code.
- API and validation failures return sanitized reason codes.
- Low-confidence tier selection escalates to the best tier. Missing-service fallback uses conservative task and role patterns.
- Jev cannot override authorization, safety constraints, explicit user choices, or repository instructions.

## Verification

- `node --test .agents/skills/jev-subagent-router/scripts/route-task.test.mjs` — 8 tests passed.
- `python3 /home/arik/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/jev-subagent-router` — skill valid.
- Missing-key route smoke test — correctly chose the conservative `best`/`worker` fallback for an authentication task.
- Independent read-only subagent review identified the original under-routing fallback; the fallback was corrected and retested.
- Live route smoke test — `jev-1.13.0` selected the `low` tier for a documentation-only review with 0.85 tier confidence.
- Live recommendation smoke test — Jev selected the safer staged rollout with sufficient confidence to display it as recommended.

## Credential setup

The credential is stored only in the project-local `.env.local`, which is Git-ignored and mode `0600`. Router commands use Node's environment-file option to load it into the subprocess. Never record the key or raw private prompts in documentation, logs, fixtures, or source control.
