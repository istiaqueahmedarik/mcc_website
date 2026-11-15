# Global admin forms implementation plan

Status: Authorized for autonomous completion, 2026-11-15
RSD: `docs/rsd/global-admin-forms-20261115-rsd.md`
ADR: `docs/adr/20261115-global-admin-forms.md`

## Work packages and ownership

1. **Forms server:** additive templates/campaigns/responses/presence/profile-review migration and rollback; bounded domain validation; authorized controllers/routes; atomic submission/profile updates; safe profile review; nine-digit self-service ID validation; heartbeat and authenticated SSE; focused tests. Isolated branch `codex/global-forms-server`.
2. **Forms interface:** `/admin/forms` and `/register/[slug]`; builder/clone/preview; campaign lifecycle; dashboard/search/pagination/export/response detail/live state; missing profile completion and receipt; safe login return; Admin navigation and streaming proxy. Isolated branch `codex/global-forms-ui`.
3. **Report cohort:** persisted room eligibility and migration/rollback; canonical pre-score filtering; source-cache reuse; membership/version invalidation and safe publication; report selector/context; focused tests. Isolated branch `codex/global-forms-reports`.
4. **Orchestration and integration:** requirements/ADR/task and knowledge-base updates; review isolated diffs and integrate into `codex/global-admin-forms`; run integrated server tests, client lint/build, isolated migration/integration checks and browser QA; resolve cross-package issues; produce reviewer-oriented implementation review and exact rollout limits.

Each worker has one worktree/branch and disjoint write scope. Do not introduce dependencies, production writes, unrelated redesigns, or destructive cleanup. The user approved the RSD and authorized the remaining technical decisions and implementation without further intermediate approvals.

## Verification order

1. Validate domain field mapping, nine-digit IDs, required/checkbox/select/number/date answers and campaign definition immutability.
2. Verify migrations/rollback and server role boundaries without touching hosted student data.
3. Verify authenticated own-account resolution, duplicate and race behavior, campaign end race, profile concurrency, and safe rejection semantics.
4. Verify SSE disconnect/reauthorization, heartbeat visibility/expiry/deduplication, and response reconciliation.
5. Verify canonical report filtering and no-filter compatibility; cohort score/rank changes, empty cohorts, stale snapshot checks and public data boundaries.
6. Run focused server suites, integrated frontend lint, and production build; distinguish pre-existing failures from new failures.
7. Browser-check the real app where local dependencies permit; otherwise use isolated fixtures and explicitly report that boundary. Check mobile/laptop/dark mode, long content, focus, reduced motion/transparency and glass fallback.
8. Publish an ordered implementation review: data/lifecycle → profile safety → student flow → admin dashboard → report cohort → verification/rollout. Update the durable knowledge base after implementation review. No automatic deployment or hosted migration is included.

## Authorized follow-up: neutral design, clear labels, deliberate submit

- [x] Record the user's revised direction in the RSD and ADR.
- [x] Revise forms surfaces and route-scoped shared footer without decorative gradients.
- [x] Replace visible cohort/version jargon with form response filter and registered-student terminology.
- [x] Implement and locally exercise one-second hold, cancellation, keyboard, retry, reduced-motion, and standard-button flows.
- [x] Record reviewer path, screenshots, fixture browser runner, and knowledge-base lessons.
- [x] Complete production build and final integration handoff (evidence in the design-revision review).
