# Contest Score Adjustment Rules Implementation Review

## Review Flow

1. `docs/sql/contest-score-adjustment-rules-20260902.sql` adds a non-null `adjustment_rules` JSON array with an empty-array default and 32-rule database bound to both existing scoring-config tables.
2. `docs/sql/contest-score-adjustment-trainer-default-20260902.sql` changes only the classroom default and backfills existing empty classroom configurations with an attended-row `penalty × 0` rule; non-empty manager configurations are preserved.
3. `server/src/services/contestScoringService.ts` defines and validates the rule contract, keeping supported fields and operations closed rather than accepting executable expressions.
4. The scoring service builds normal result units first, applies ordered adjustments to the selected units and attendance scope, then runs drop-worst and the existing final formulas.
5. Non-raw metrics are floored at zero, raw score retains the existing finite-negative policy, and every applied rule records its before/after values in the unit trace.
6. `contestRoomController.ts` and `classroomContestController.ts` load normalized rules and write them within the existing manager-authorized, version-locked scoring transactions that mark reports stale.
7. `client/src/components/ContestScoringDialog.jsx` adds a fourth Adjustments tab to the shared global/classroom editor, with an explicit Unchanged empty state and ordered rule cards.
8. The dialog is capped to the dynamic viewport, uses a flexible inner scroll area, and keeps header/tabs/footer visible. At laptop widths all five rule fields share one balanced 12-column row.
9. `contestScoringService.test.ts` covers solve boosts, penalty reductions and zero floors, attendance filtering, global no-op defaults, the classroom penalty-zero default, ordered set/multiply behavior, trace output, and invalid rule rejection.

## Requirement Review

- Specific field changes: implemented for solved, penalty, raw score, and demerits.
- Boost or reduce: implemented through add/subtract operations, with multiply and set for explicit corrections.
- Specific scope: each rule targets all result units or one contest/composite result unit.
- Default behavior: global/admin remains an empty no-op; classroom/trainer defaults to an attended-row `penalty × 0` rule.
- Authoritative behavior: preview and generation share the server scoring path; the client does not calculate ranks.
- Safe persistence: both scoring scopes retain their existing authorization, optimistic version check, and stale-report update.

## UI Review

| Before | After | Why |
| --- | --- | --- |
| Three tabs with formulas as the only score-changing mechanism | Fourth Adjustments tab with structured rules | Common corrections no longer require editing formula text. |
| No explicit indication that no overrides exist | Unchanged badge and a no-adjustments empty state | Makes the safe default immediately clear. |
| A correction required remembering formula syntax | Unit, field, operation, value, and attendance selects | Keeps every effect inspectable and keyboard accessible. |
| No ordering affordance for multiple corrections | Numbered rule ledger with up/down controls | Shows that later operations consume the result of earlier ones. |
| Potentially small icon-only actions | 40px controls with accessible names and disabled boundary states | Preserves touch and keyboard usability in the dense dialog. |
| Desktop-oriented control density | Responsive stacked controls and two-row mobile tab list | Prevents horizontal clipping on narrow screens. |
| Fixed 68vh body plus dialog chrome could exceed a short viewport | Dynamic viewport cap with a flexible inner scroll region | Keeps header, tabs, controls, and Save/Close footer reachable. |
| Attendance scope sat alone on a sparse second row | Five controls share a proportional 12-column row on laptops | Uses the available width and makes one rule scan as a single sentence. |

## Security and Data Review

- No free-form code, property access, or dynamic function execution was added.
- The server rejects unknown fields, operations, units, attendance scopes, duplicate IDs, non-finite or over-limit values, and arrays over 32 rules.
- Adjustment rules contain configuration only and add no user/provider credentials or private profile fields.
- Existing RLS/grants and Hono authorization are unchanged; the migration adds columns to already protected tables.
- Existing global rooms remain behaviorally unchanged; empty classroom configs adopt the requested penalty-zero trainer policy while non-empty classroom rule lists remain untouched.

## Verification

- `bun test src/services/contestScoringService.test.ts`: 12 passed, 0 failed.
- `bun build src/index.ts --target=bun --outdir <temporary-directory>`: passed (804 modules bundled).
- `npx eslint src/components/ContestScoringDialog.jsx`: passed.
- `npm run build`: passed with Next.js 16.1.1; all 43 static pages generated.
- `git diff --check`: passed.
- The SQL migration was reviewed statically but not applied to a live database. Authenticated browser and production deployment verification were not performed.
