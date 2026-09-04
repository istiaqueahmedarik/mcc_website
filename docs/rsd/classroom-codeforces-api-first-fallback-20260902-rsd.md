# Classroom Codeforces API-First Fallback RSD

> Superseded in part on 2026-09-04: saved signed API credentials are now retried after anonymous API failure and before web crawling. The anonymous-first requirement remains current.

## Requirement

For numeric classroom Codeforces contests, try the official API first and use the authenticated HTML crawler only as fallback. Keep EDU lesson standings on the existing authenticated crawler. Determine whether Codeforces OAuth improves this workflow.

## Acceptance Criteria

- Numeric sources first request anonymous `contest.standings` with exactly `contestId`.
- Successful API results are normalized into the existing rank contract and filtered to classroom handles before persistence.
- API failure, invalid data, private-source rejection, or zero classroom matches falls back to the existing fixed-origin friends standings crawler.
- Public API success works without a Codeforces web session.
- EDU, fallback crawling, and opt-in web upsolve crawling retain existing session privacy and safety limits.
- API calls respect Codeforces's one-request-per-two-seconds limit.
- No OAuth, API key, or API secret persistence is added.

## Out of Scope

- Restoring the removed trainer API credential UI.
- Changing snapshot tables, report scoring formulas, VJudge behavior, or global contest routes.
- Deploying or restarting production.
