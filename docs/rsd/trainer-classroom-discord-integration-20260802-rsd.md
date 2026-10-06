# Trainer Classroom Discord Integration RSD

Status: Approved by user implementation request
Task ID: trainer-classroom-discord-integration-20260802
Owner: Codex / Arik
Last updated: 2026-08-02

## Goal

Make Discord a first-class classroom interface for trainer-led classrooms while keeping MCC web/Postgres as the source of truth. Every real user links a unique Discord account, trainers bind each classroom to one dedicated Discord guild in v1, and each active student receives a private trainer/student channel that can write into the existing MCC student thread.

## Scope

- Add the RSD, technical decision, ADR, task plan, SQL, implementation review, and knowledge-base entries required by the repo workflow.
- Add private `mcc_private` Discord schema tables for OAuth, unique account linking, guild/classroom binding, channel mapping, delivery jobs, notification rules, check-ins, command audit, and Discord message idempotency.
- Add nullable `due_at` fields for live problem and topic-assignment deadlines.
- Add thread-message edit/delete/tombstone metadata plus a mutation ledger.
- Add server OAuth endpoints, classroom Discord settings endpoints, check-in endpoints, and feature-flagged Discord-link enforcement.
- Add a separate Bun Discord worker using `discord.js`; the Gateway must not run inside the Hono HTTP server.
- Add Discord-origin message create/edit/delete bridge work that resolves exact guild/channel mappings and writes through the existing student-thread persistence model.
- Add a Discord-aware classroom creation wizard that replaces the duplicate trainer/classroom create forms.

## Requirements

- Discord tokens and message bodies must never be logged. OAuth tokens are encrypted at rest with a server-only key.
- Discord snowflakes are stored as `text`, never JavaScript numbers.
- New Discord data lives in `mcc_private`, with `anon` and `authenticated` access revoked.
- All user-facing enforcement is feature-flagged by `DISCORD_INTEGRATION_ENABLED` and `DISCORD_LINK_ENFORCEMENT_MODE`.
- Website-authored human message bodies do not post to Discord. Discord-origin messages may write to MCC student threads.
- Attachments copied from Discord must use the existing classroom-thread storage validator and size limits.
- Delivery jobs must be durable, idempotent, and leased with `FOR UPDATE SKIP LOCKED`.
- Discord rate limits must use Discord response metadata such as `Retry-After`; no hard-coded global Discord limits.

## Non-Goals

- No broad project-wide RLS remediation in this task. The existing critical public-table RLS finding remains a production blocker and needs a separate security RSD.
- No destructive classroom deletion, bulk import, admin role management, live IDE/board control, or arbitrary website navigation from Discord in v1.
- No guarantee that Discord server admins cannot view channels; trainers must acknowledge the Discord privacy limitation.
- No live production Discord deployment from this repo change alone.

## Acceptance

- Server and client compile/lint checks are run where local tooling permits.
- `docs/sql/trainer-classroom-discord-integration-20260802.sql` is additive and reviewer-readable.
- The HTTP server exposes Discord auth/status/settings/rules/check-in routes.
- `bun run discord:worker` exists as a separate worker entrypoint.
- The create-classroom UI supports details, Discord server selection, and automation settings when the feature is enabled.

## References Used

- Discord OAuth scopes and permissions: https://docs.discord.com/developers/platform/oauth2-and-permissions
- Discord guild member add and guild/channel resources: https://docs.discord.com/developers/resources/guild
- Discord Gateway intents: https://docs.discord.com/developers/events/gateway
- Discord rate limits: https://docs.discord.com/developers/topics/rate-limits
- discord.js 14.26.2 docs through Context7.
- Supabase changelog reviewed on 2026-08-02.
