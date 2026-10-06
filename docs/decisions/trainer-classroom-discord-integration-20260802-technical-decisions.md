# Trainer Classroom Discord Integration Technical Decisions

Status: Approved by user implementation request
Task ID: trainer-classroom-discord-integration-20260802
Last updated: 2026-08-02

## TD-001: One MCC App, One Dedicated Guild Per Classroom

Use one MCC Discord application across many guilds. In v1, each classroom binds to exactly one Discord guild and each bound guild hosts exactly one classroom. This keeps channel permissions, reminders, and roster repair understandable.

## TD-002: MCC Remains Source Of Truth

Postgres remains authoritative for users, classrooms, threads, submissions, reviews, schedules, deadlines, notification rules, and check-ins. Discord is an authenticated input and notification surface.

## TD-003: Unique Discord Linking With Encrypted Tokens

Each active real MCC user links one unique Discord account. Store OAuth access and refresh tokens encrypted in `mcc_private.discord_user_connections`. Store Discord IDs as `text`. Mark expired/revoked accounts as `reauth_required` or `revoked` rather than silently failing.

## TD-004: Directional Message Sync

Discord private-channel messages write into the website student thread. Website-authored human messages never post outward. Bot-authored system events and content-free deep-link alerts may post to Discord through durable jobs.

## TD-005: Separate Worker

Run the Gateway, slash commands, provisioning, reminders, and delivery queue in `bun run discord:worker`. The Hono HTTP server only exposes OAuth/API routes and writes durable jobs.

## TD-006: Durable Queue And Rate-Limit Discipline

Every outbound or provisioning action is represented as a `discord_delivery_jobs` row with an idempotency key. Workers lease ready work with `FOR UPDATE SKIP LOCKED`, retry transient failures with jitter, honor returned `Retry-After`, and dead-letter after 8 attempts.

## TD-007: Private Channel Permissions

Student channels deny `@everyone` and allow the bot, the target student, classroom owner, and substitutes. The product must state that Discord admins can bypass these channel denies.

## TD-008: Explicit Deadlines

Submission reminders use explicit `due_at`, not `timer_minutes`. Existing assignments have no surprise reminders until a trainer sets a deadline.

## TD-009: Feature-Flagged Enforcement

Gate protected classroom APIs only when `DISCORD_INTEGRATION_ENABLED` is true and `DISCORD_LINK_ENFORCEMENT_MODE` is `new_users` or `all`. Unlinked users receive HTTP 428 with `DISCORD_LINK_REQUIRED`.

## TD-010: UI Placement

Use a compact three-step classroom creation wizard and classroom Settings Discord section. Do not add a new top-level Discord tab.

## Rollout Blocker

Production hard cutover is blocked until the separate critical Supabase RLS issue on core public classroom tables is remediated with table-specific policies.
