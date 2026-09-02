# Contest Score Adjustment Rules

## Request

1. Add another tab to the existing Scoring & Merge dialog for specific score rules.
2. Let managers modify an individual score field, including boosting solves and reducing penalty.
3. Keep global/admin scoring unchanged by default.
4. For classroom/trainer scoring, add a default rule that ignores penalty by multiplying it by zero.
5. Keep the dialog fully visible and usable on short browser viewports.

## Scope

- Add ordered adjustment rules to the existing global/admin and classroom/trainer scoring configurations.
- Apply each rule to all result units or one selected result unit.
- Support `solved`, `penalty`, `raw_score`, and `demerits` fields with add, subtract, multiply, and set operations.
- Apply rules to attended rows by default, with an explicit option to include missing rows.
- Evaluate adjustments server-side after result units are built and before drop-worst and final score formulas.
- Persist the rules as a bounded JSON array on the existing scoring-config rows and include them in report scoring metadata and participant traces.
- Keep the dialog header, tab strip, and footer fixed inside the viewport while only the content area scrolls.

## Acceptance Criteria

- A fourth Adjustments tab appears in the shared Scoring & Merge dialog.
- The empty state clearly says that no adjustments means scores remain unchanged.
- Managers can add, edit, reorder, and remove rules with keyboard-accessible controls.
- Every rule exposes result-unit scope, field, operation, numeric value, and attendance scope.
- Rules execute top-to-bottom and can boost solved values or reduce penalties without producing negative solved, penalty, or demerit values.
- Invalid fields, operations, values, scopes, duplicate IDs, and more than 32 rules are rejected by the server.
- Preview, saved report generation, ranking, and trace output use the same authoritative adjusted values.
- Saving rules retains the existing authorization, optimistic version check, and stale-report behavior.
- No rules is a true no-op for global/admin rooms and reports.
- New and existing empty classroom/trainer configs receive `penalty × 0` for attended result rows; non-empty manager-authored rules remain unchanged.
- The dialog never extends below the viewport, and all five rule fields share a balanced row at laptop widths.
- Targeted server tests, server bundle, targeted client lint, client build, migration checks, and diff checks pass.

## Exclusions

- No participant-specific overrides or free-form executable rule code.
- No changes to provider snapshots, manual solve overrides, demerit records, or source standings.
- No automatic database deployment or production verification.
