# Global Contest Report Codeforces Provider RSD

Date: 2026-09-19

## Requirement

Bring the trainer classroom Codeforces fetching model into the admin/global Generate Contest Report workflow. Provider fetching changes; the existing global scoring formulas and report mathematics remain authoritative and unchanged.

## Scope

- Global/admin contest rooms under `/contests_report`.
- Provider-aware contest items for VJudge and Codeforces.
- Just-in-time provider access after contests are added instead of a VJudge-only gate before rooms can be opened.
- Codeforces anonymous API, encrypted signed-API retry, and transient JSESSIONID crawl fallback by reusing the existing provider adapter.
- VJudge transient JSESSIONID access.
- Provider-aware report source keys, diagnostics, SQL rollout artifact, focused tests, and reviewer documentation.

## Out Of Scope

- Changes to score formulas, ranking variables, precision, merge groups, drop-worst behavior, adjustment rules, or report rendering mathematics.
- Codeforces-specific global demerit authoring or automatic cross-provider identity mapping.
- Deployment, applying the SQL artifact to production, or replaying real provider credentials.

## Functional Requirements

- Existing global contest items are treated as VJudge items.
- New items require an explicit `vjudge` or `codeforces` provider.
- VJudge IDs remain numeric. Codeforces accepts numeric contest/Gym IDs, supported contest URLs, and supported EDU standings URLs using the same normalization as classroom contests.
- Global report fetching dispatches each stored item through the existing provider adapter.
- Numeric Codeforces sources preserve the existing order: anonymous official API, signed API using the acting admin's encrypted per-user credentials, then the bounded fixed-origin JSESSIONID crawl fallback.
- Codeforces EDU sources use the bounded authenticated crawl path. Raw HTML import remains classroom-only.
- Provider credentials and sessions are never written to report rows, logs, URLs, or source control. API secrets use the existing encrypted per-user credential table; web sessions remain HTTP-only cookies.
- Rooms and contest lists are accessible without a provider session. Only provider access needed by configured items is shown.
- VJudge access is requested only when at least one VJudge item exists. Codeforces access is shown only when at least one Codeforces item exists; public numeric contests may still succeed anonymously, and a pasted Codeforces session must be verified before it is stored.
- A room may contain the same external numeric ID once per provider.
- New report contest keys are provider-prefixed to prevent VJudge/Codeforces collisions. Existing published JSON remains readable.
- Single-contest generation addresses the stored item ID, not an ambiguous external contest ID.
- If one source fails and another succeeds, preserve the existing partial-report behavior and return provider-specific missing-source diagnostics.

## Data Requirements

- Add `provider text not null default 'vjudge'` to `public."Contest_room_contests"` with a `vjudge | codeforces` check.
- Replace room/external-ID uniqueness with `(room_id, provider, contest_id)`.
- Keep existing formula keys unchanged. New Codeforces formula keys receive a provider prefix so they cannot collide with VJudge keys.
- Add no public Data API grants and create no new credential table.

## Interface Requirements

- Remove the initial VJudge login page and the VJudge-session requirement from the contest-room layout.
- Add a provider selector to Add Contest and show provider badges on saved items.
- Add a compact Provider access section to the room only for providers used by that room.
- VJudge collects JSESSIONID only; MCC does not collect or retain the VJudge username/password in this flow.
- Codeforces access shows encrypted API-key/secret controls and an optional 12-hour JSESSIONID fallback, with clear notes about public API behavior.
- Preserve semantic form controls, visible labels/focus, 44px primary targets, responsive stacking, and existing theme tokens.

## Acceptance Checks

- Focused server tests cover provider/source normalization and dispatch behavior.
- Existing Codeforces provider-service and scoring tests pass.
- Targeted client lint covers the changed contest-report pages/actions/components.
- Full client build is run because server actions, route structure, and provider forms changed.
- SQL is statically reviewed for default/backfill behavior, constraints, provider-aware uniqueness, and least privilege.
- Knowledge-base and implementation-review artifacts record the new global provider boundary and verification limits.
