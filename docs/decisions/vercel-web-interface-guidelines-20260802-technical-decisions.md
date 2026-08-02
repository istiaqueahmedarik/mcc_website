# Vercel Web Interface Guidelines Agent Policy Technical Decisions

Status: Approved
Task ID: vercel-web-interface-guidelines-20260802
Last updated: 2026-08-02
Approved: 2026-08-02 by user

## Documentation and Knowledge Used

- Source: `docs/rsd/vercel-web-interface-guidelines-20260802-rsd.md`
  Used for: approved scope, requirements, acceptance criteria, and non-goals.
  Confidence: High

- Source: `AGENTS.md`
  Used for: repository agent workflow, required approval gates, project memory rules, and local verification expectations.
  Confidence: High

- Source: `docs/knowledge-base/quality-rules.md`
  Used for: existing quality-rule format and trainer operational UI baseline.
  Confidence: High

- Source: `docs/knowledge-base/hci-rules.md`
  Used for: existing HCI-memory format and classroom/trainer interaction rules.
  Confidence: High

- Source: `https://vercel.com/design/guidelines`
  Used for: canonical Vercel Web Interface Guidelines categories and agent-integration recommendation.
  Confidence: High

- Source: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/AGENTS.md`
  Used for: concise agent-oriented MUST/SHOULD/NEVER checklist shape.
  Confidence: High

## TD-001: Canonical Link, Local Summary

Decision:
Add a concise local rule that links to `https://vercel.com/design/guidelines` as the canonical source. Do not paste the full guideline body into `AGENTS.md`.

Rationale:
The Vercel page is a living guideline. A local summary keeps `AGENTS.md` readable while directing future agents to the current source.

Implementation impact:
- Add a clearly named section to `AGENTS.md`.
- Summarize required review areas rather than duplicating the full checklist.

ADR required: No.

## TD-002: Applies To New Pages And Major Redesigns

Decision:
Apply the rule to new pages and major page redesigns, including page-level UI work in trainer/classroom areas. Retroactive cleanup of existing pages requires a separate approved RSD.

Rationale:
The user asked future Codex page design to maintain the guidelines. Applying it prospectively avoids uncontrolled scope creep.

Implementation impact:
- The `AGENTS.md` rule will explicitly say it is not approval for broad retroactive redesign.

ADR required: No.

## TD-003: Vercel Guidelines Are A Quality Baseline, Not A Product Theme

Decision:
Use Vercel's guidance as an interface-quality baseline for accessibility, interaction, layout, content, forms, animation, performance, and polish, while preserving this repository's approved product-specific design decisions and local UI patterns.

Rationale:
Vercel's page includes some brand-specific preferences, and the MCC trainer/classroom product already has approved operational UI guidance. The new rule should improve craft without forcing the app to look like Vercel.

Implementation impact:
- Mention preserving approved RSD/decision guidance.
- Mention using existing shadcn/Radix/Tailwind/lucide patterns.

ADR required: No.

## TD-004: Generated Interface Review Becomes Required

Decision:
Require future agents to audit generated page interfaces before final handoff for the Vercel guideline categories most likely to affect this app: keyboard access, visible focus, hit targets, semantic links/buttons, deep-linkable URL state when relevant, loading/empty/error states, responsive layout, long-content resilience, form behavior, reduced motion, compositor-friendly animation, contrast, and performance basics.

Rationale:
The Vercel guideline explicitly recommends auditing AI-generated interfaces. A review checkpoint is more actionable than a passive link.

Implementation impact:
- Add review language to `AGENTS.md`.
- Record a durable knowledge-base quality rule.

ADR required: No.

## TD-005: No External Installer Or Dependency Change

Decision:
Do not install Vercel's optional review command or add dependencies for this policy update.

Rationale:
The approved scope is a durable instruction change, not tooling installation. Avoiding dependency/tool churn keeps the change low risk.

Implementation impact:
- Documentation-only change.
- Verification can be limited to inspecting the resulting docs and git diff.

ADR required: No.

## Approval Gate

Technical decision package approved by user on 2026-08-02.
