# Trainer Classroom Discord Integration Task Plan

Status: Approved by user implementation request
Task ID: trainer-classroom-discord-integration-20260802
Last updated: 2026-08-09

## Tasks

- [x] Create RSD, technical decision package, ADR-0012, task plan, and SQL artifact.
- [x] Add `discord.js` and a separate `discord:worker` script.
- [x] Add additive `mcc_private` Discord schema SQL and public deadline/thread mutation columns.
- [x] Add Discord OAuth authorize/callback/status endpoints.
- [x] Add classroom Discord guild/settings/rules/reconcile/check-in endpoints.
- [x] Extend classroom create to accept Discord guild/timezone/automation data behind feature flags.
- [x] Add feature-flagged Discord link enforcement middleware.
- [x] Add durable delivery queue leasing helpers.
- [x] Add Discord message create/edit/delete bridge helpers.
- [x] Add reusable classroom creation wizard with Discord server and automation steps.
- [x] Add focused Discord-link-required recovery UI on trainer classroom entry points.
- [x] Add implementation review and knowledge-base updates.
- [x] Apply SQL to the target Supabase project after review.
- [x] Add classroom Settings Discord Integration UI for rule management, roster states, and Repair.
- [x] Add safe `/mcc` read-only/status command handlers plus trainer Repair queueing.
- [x] Add student `/mcc checkin` Discord modal backed by `classroom_daily_checkins`.
- [x] Add student `/mcc submit` Discord modal backed by live/topic pending-review submissions and website thread system events.
- [x] Add trainer `/mcc review` Discord modal backed by live/topic final-verdict ownership and website thread feedback events.
- [x] Add classroom-aware Discord gating so active real students must connect Discord before entering a Discord-bound classroom.
- [x] Add trusted/manual Discord ID linking for classroom managers/admins, with Discord ID/@mention authorization and display-name-only labels.
- [x] Queue Discord reconcile jobs after OAuth linking, student enrollment, bulk enrollment, pre-enrollment approval, and trusted/manual linking.
- [x] Reconcile existing private student channels by resetting permission overwrites instead of skipping already-created channel rows.
- [x] Reconcile existing private student channel names to `Student Name [Student ID]` product convention with Discord-safe slugs.
- [x] Apply follow-up SQL `docs/sql/trainer-classroom-discord-manual-links-20260809.sql` to the Supabase Postgres database through the server `DATABASE_URL` after Supabase MCP was unavailable.
- [x] Add trainer `/mcc assign` live-class modal/autocomplete workflow backed by `class_problems`, Discord delivery jobs, website thread system events, and body-free command audit metadata.
- [ ] Configure Discord app secrets, redirect URI, privileged Message Content intent, and bot install URL in the deployment environment.
- [ ] Run a live Discord guild smoke test with separate trainer/student accounts.
- [ ] Run `/mcc assign` live Discord smoke coverage.
- [ ] Run Supabase advisors after the manual-link follow-up SQL once the Supabase connector/plugin is available.

## Verification

- Passed server HTTP bundle smoke: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build`.
- Passed server HTTP bundle smoke after frontend callback bridge/dev-guild config changes: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-server-callback`.
- Passed server worker bundle smoke: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker`.
- Passed server worker bundle smoke after dev-guild command registration: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-callback`.
- Passed server worker bundle smoke after `/mcc` command handler implementation: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-commands`.
- Passed server worker bundle smoke after `/mcc checkin` modal implementation: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-checkin`.
- Passed server worker bundle smoke after `/mcc submit` modal implementation: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-submit-2`.
- Passed server worker bundle smoke after `/mcc review` modal/help implementation: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-review-help`.
- TypeScript smoke with `bun x tsc --noEmit --pretty false` is currently blocked by the existing `tsconfig.json` setting `moduleResolution=node10`, which TypeScript now rejects.
- Passed targeted client ESLint for the new wizard, Discord-link recovery card, thread delta handling, dashboard/list integrations, and proxy route.
- Passed targeted client ESLint for the Discord Settings card, classroom Settings integration, and Discord settings/rules/roster/reconcile proxy routes.
- Passed targeted client ESLint for the frontend Discord OAuth callback bridge.
- Passed full client production build: `npm run build`.
- Server `bun test` is currently unavailable for this scope because the server package has no test files.
- Supabase MCP migration apply succeeded as `20260802150430 trainer_classroom_discord_integration_20260802`; follow-up checks confirmed the new private tables, revision ledger, RLS state, browser-role revokes, deadline columns, and thread mutation columns.
- Live Discord worker smoke reached `Ready as MCC_Trainer#8415`; guild command readback in `test_server` confirmed `/mcc` registered with expected subcommands.
- Passed server HTTP bundle smoke after classroom-aware gating/trusted manual links: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-server-discord-manual`.
- Passed server worker bundle smoke after provisioning overwrite reconciliation: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-discord-manual`.
- Passed targeted client ESLint for Discord connection recovery, classroom live gating, Discord Settings trusted-link controls, and trusted-link proxy route.
- Follow-up SQL was applied on 2026-08-09 through direct Postgres because the Supabase MCP/plugin tools were not exposed in the current session; verification confirmed manual-link columns, constraints, indexes, RLS, and no browser grants.
- Passed server HTTP bundle smoke after `/mcc assign`: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-server-discord-assign`.
- Passed server worker bundle smoke after `/mcc assign`: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-discord-assign`.
- Passed server HTTP bundle smoke after Discord channel naming update: `/home/arik/.bun/bin/bun build src/index.ts --target=bun --outdir .codex-build-discord-naming`.
- Passed server worker bundle smoke after Discord channel naming update: `/home/arik/.bun/bin/bun build src/workers/discordWorker.ts --target=bun --outdir .codex-build-worker-discord-naming`.
- Passed `git diff --check` after `/mcc assign`.
- Supabase advisors after the follow-up SQL are still pending because Supabase MCP/plugin tools are unavailable.

## Deployment Order

1. Configure server-only Discord env vars.
2. Confirm the base SQL and the follow-up trusted/manual link SQL are present in the target database.
3. Deploy HTTP API with `DISCORD_INTEGRATION_ENABLED=false`.
4. Start `bun run discord:worker` in a separate process.
5. Enable integration in a development guild.
6. Move enforcement from `off` to `new_users`, then `all` after migration and RLS remediation.

## Required Environment

- `DISCORD_INTEGRATION_ENABLED`
- `DISCORD_LINK_ENFORCEMENT_MODE=off|new_users|all`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `DISCORD_REDIRECT_URI`
- `DISCORD_TOKEN_ENCRYPTION_KEY`
- `DISCORD_DEV_GUILD_ID` or `DISCORD_TEST_GUILD_ID` for local slash-command registration in a dedicated test guild
- `APP_BASE_URL` or existing frontend URL equivalent
