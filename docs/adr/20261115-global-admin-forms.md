# Global admin forms: campaign identity, profile updates, and report cohorts

Status: Accepted under the user's 2026-11-15 approval of autonomous implementation
Requirement: `docs/rsd/global-admin-forms-20261115-rsd.md`

## Decisions

1. **Separate global workflows from trainer forms.** New `/global-forms` Hono routes and `/admin/forms` management pages enforce current database-backed admin authorization. Student share links use `/register/[slug]`; existing `/forms/[slug]` classroom forms retain their behavior.
2. **Templates are reusable; campaigns freeze definitions.** Seed TFC and General starters, allow editing/cloning reusable templates, and snapshot the questions/agreement into each campaign. Campaign lifecycle is draft, open, ended. Responses reference immutable account and campaign IDs, with database uniqueness preventing concurrent duplicates.
3. **Submission and profile completion are one transaction.** Lock current profile and campaign, revalidate preview/version, apply only eligible missing/invalid data, preserve CF/VJudge pending verification, and retain a historical response snapshot. Profile-review rejection must preserve existing accounts. Nine-digit student-ID validation is shared with self-service updates; existing data is not bulk rewritten. The legacy numeric column cannot preserve leading zeroes, so new form/self-service input must use a canonical nine-digit representation.
4. **Live updates use authenticated SSE with database reconciliation.** The browser forwards its HTTP-only cookie through the Next proxy; the Hono stream rechecks admin authority and emits bounded dashboard counts approximately every five seconds. This avoids exposing private response tables to public Realtime subscriptions and works across API processes. It is periodic database-backed reconciliation, not instantaneous database change delivery. Visible student pages send heartbeats every twenty seconds; sixty-second expiry and account-level deduplication provide approximate active counts. Do not collect partial answers.
5. **Contest eligibility precedes scoring.** Persist a room's selected campaign, use canonical `student:<user_id>` identities, preserve unfiltered provider snapshots, and invalidate scored/public snapshots when campaign membership changes. Recompute eligible scores from cached provider inputs when possible. Preview/export/publication use the same generated cohort. Preserve published linked TFC values for TSC composition and disclose the source cohort.
6. **Glass is a material layer around semantic HTML.** Use project SF typography, semantic tokens, Radix controls, and focused glass chrome. The optional lens is decorative, pointer-transparent, bounded, and replaceable by CSS/opaque fallbacks. Forms and table text remain readable with reduced transparency and forced colors.

## API coordination

- Management: templates CRUD/clone, campaign create/read/update/start/end, paginated response reads, campaign dashboard, and SSE under `/global-forms/manage/`.
- Student: minimal public campaign metadata, authenticated preview, submit, and presence under `/global-forms/public/:slug/`.
- Submission: `answers`, `profile_values`, `profile_version`, and explicit `agreement`; the authenticated session supplies identity.
- Report cohort selection: a dedicated authorized room endpoint, persisted independently from source provider identity.
- The Next proxy preserves query strings and streaming responses, forwards only the server cookie bearer token, disables caching, and aborts upstream streams when disconnected.

## Safety and rollout

New tables are server-owned: enable RLS and revoke public/anon/authenticated access, without inventing a browser Data API permission path. Migrations are additive, reviewed SQL artifacts in this repository's established `docs/sql/` workflow. Test them against an isolated disposable local database if available; do not point verification at production. Applying hosted migrations and deployment are separate rollout actions.

Read current Context7 Next.js authorization guidance and Hono streaming guidance. Check the Supabase changelog before integration; CLI v3 default/confirmation changes and locked `realtime` schema do not require schema or CLI changes for this server-owned SSE design.

## Consequences

The initial implementation adds no new dependency or external judge verification. Keeping global workflows separate avoids coupling campaign policy to classroom enrollment. SSE offers bounded near-live counts with explicit connection state; a five-second reconciliation interval is observable and should be described accurately. Source snapshots remain reusable while cohort-specific score snapshots are versioned and audited.
