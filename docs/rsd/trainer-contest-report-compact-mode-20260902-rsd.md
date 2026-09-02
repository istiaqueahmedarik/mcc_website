# Trainer Contest Report Compact Mode

## Request

1. Add Compact and Extended modes to trainer contest reports, with Compact selected by default.
2. Make Compact omit participant images and secondary report metrics.
3. Show participant Name/ID and render result values as `solved(penalty)` in a small, dense table.
4. Add aligned VJudge and Codeforces profile icons beside each compact participant name when those IDs exist.
5. Exclude standings participants who are not mapped to a student or group in the classroom from generated classroom reports.

## Scope

- Reuse the existing shared report renderer and table/scroll primitives.
- Enable the view switch on the global generated trainer report and the classroom trainer workbench report.
- Keep the classroom student report presentation unchanged.
- Treat the mode as local presentation state only.
- Retain complete provider standings in raw snapshots for trainer mapping while filtering generated and previewed classroom reports to mapped classroom identities.

## Acceptance Criteria

- Trainer reports open in Compact mode and can switch to the existing Extended mode.
- Compact rows show rank, Name/ID, aggregate `solved(penalty)`, and one `solved(penalty)` cell per contest.
- Compact rows do not show avatars, contests attended, score/deviation details, demerits, provider badges, or per-contest auxiliary score details.
- Compact Name/ID cells reserve aligned slots for small VJudge and Codeforces profile links when present.
- Generated and previewed classroom reports contain only mapped classroom students/groups; unmatched VJudge standings rows remain available only in raw snapshots.
- The switch is keyboard accessible, exposes its selected state, and retains visible focus behavior.
- Search, ranking, highlighting, scrolling, sharing, CSV, and PDF behavior remain unchanged.
- Targeted lint, client production build, and diff checks pass.

## Exclusions

- No API, database, scoring formula, snapshot, or export schema changes.
- No change to public live reports or classroom student report defaults.
- No persistence of a trainer's mode choice across page loads.
