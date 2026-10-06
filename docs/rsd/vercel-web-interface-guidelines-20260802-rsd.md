# Vercel Web Interface Guidelines Agent Policy RSD

Status: Approved
Task ID: vercel-web-interface-guidelines-20260802
Owner: Codex
Last updated: 2026-08-02
Approved: 2026-08-02 by user

## 1. Request

Make future Codex-designed pages in this repository consistently follow Vercel's Web Interface Guidelines:

- https://vercel.com/design/guidelines

## 2. Source Context

- `AGENTS.md` requires RSD-first delivery, approval gates, and durable project memory updates.
- The Vercel guidelines cover interaction, animation, layout, content, accessibility, forms, performance, dark mode, hydration, and visual design rules for high-quality web interfaces.
- The Vercel guideline page includes an agent-integration section that recommends adding agent guidance so generated interfaces are audited during generation.
- This repository already keeps persistent design and quality rules in `AGENTS.md`, `docs/knowledge-base/quality-rules.md`, and `docs/knowledge-base/hci-rules.md`.
- Existing project memory says trainer pages should remain dense operational surfaces and should use calm controls, bounded panels, deliberate responsive layouts, accessible states, and existing shadcn/Radix/Tailwind/lucide patterns.

## 3. Problem

Future page-design work can drift if Vercel's interface guidelines live only in the chat thread. Codex needs a durable local instruction that is read before planning or editing, and project memory should make the rule discoverable during future RSD, implementation, and review work.

## 4. Scope

Included:

- Add a concise Vercel Web Interface Guidelines rule to `AGENTS.md`.
- Add a durable quality/HCI memory entry so future UI work references the same guideline.
- Require new page or major page-redesign work to consider keyboard access, focus, hit targets, semantic navigation, URL state, loading/empty/error states, responsive layout, content resilience, forms, animation, performance, contrast, and visual polish from the Vercel guidance.
- Keep the rule compatible with existing project-specific design decisions, especially trainer/classroom operational UI guidance.

Excluded:

- Installing Vercel's optional review command or external scripts.
- Refactoring existing UI to comply retroactively.
- Adding new dependencies.
- Changing application behavior, routes, API calls, server code, database schema, or authorization.
- Replacing this repository's existing RSD approval workflow.

## 5. Requirements

- REQ-1: `AGENTS.md` must tell future agents that new pages and major page redesigns must follow the Vercel Web Interface Guidelines unless an approved RSD records a deliberate exception.
- REQ-2: The local rule must point to `https://vercel.com/design/guidelines` as the canonical source rather than copying the full guideline body.
- REQ-3: The rule must require design review for generated interfaces before final handoff, including interaction, accessibility, responsive layout, content states, animation, and performance-relevant concerns.
- REQ-4: The rule must preserve existing repository-specific UI guidance and prefer local shadcn/Radix/Tailwind/lucide patterns over new abstractions.
- REQ-5: Project memory must record the durable quality lesson so future tasks can discover it from `docs/knowledge-base/`.

## 6. Acceptance Criteria

- [ ] `AGENTS.md` contains a clearly named Vercel Web Interface Guidelines section for future page design.
- [ ] `docs/knowledge-base/quality-rules.md` or `docs/knowledge-base/hci-rules.md` records the rule with date, source, applicability, and non-overgeneralization notes.
- [ ] The instruction explicitly applies to new pages and major page redesigns.
- [ ] The instruction does not require retroactive cleanup of existing pages.
- [ ] The instruction does not install external commands or dependencies.

## 7. Risks

- Risk: Copying the entire Vercel checklist into repo guidance could make `AGENTS.md` too long and stale.
  Mitigation: Link to the canonical guideline and summarize the required review areas locally.

- Risk: Vercel-specific preferences could conflict with this product's classroom/trainer design decisions.
  Mitigation: Treat the Vercel guidance as a quality baseline while preserving approved project-specific RSD decisions and local design-system patterns.

- Risk: Future agents might treat the rule as approval to redesign existing pages.
  Mitigation: State that the rule applies to new pages and major redesigns, not retroactive cleanup unless separately approved.

## 8. Approval Gate

Primary RSD approved by user on 2026-08-02.
