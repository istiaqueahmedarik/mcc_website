# ADR-0012: Classroom Discord Bridge

Status: Accepted
Date: 2026-08-02
Task ID: trainer-classroom-discord-integration-20260802

## Context

The trainer/classroom product already has private, gap-free student threads and trainer-owned submission review. The requested Discord feature must not create a second source of truth or bypass those rules.

## Decision

Add a Discord bridge as a separate integration layer:

- MCC/Postgres remains authoritative.
- Discord OAuth links one unique Discord account to one MCC user.
- One classroom binds to one dedicated Discord guild in v1.
- Each active student gets one private Discord text channel mapped to the existing MCC student thread.
- Discord-origin messages, edits, deletions, and accepted attachments write into MCC thread data with Discord message idempotency.
- Website human messages never post to Discord; bot-authored notifications are durable jobs.
- A separate `discord:worker` owns the Gateway, commands, provisioning, reminders, and job delivery.
- Discord data lives in `mcc_private` with browser roles revoked.

## Consequences

Positive:

- Discord can become a real student workflow surface without duplicating classroom business rules.
- The worker can scale and restart independently from the HTTP API.
- Durable jobs give outbound delivery observability and retry control.

Negative:

- The system now depends on Discord OAuth token lifecycle, bot permissions, Gateway health, and Message Content intent approval.
- Discord admins can still bypass channel permissions, which must be explained in the product.
- Full production enforcement must wait for separate public-table RLS remediation.

## References

- `docs/rsd/trainer-classroom-discord-integration-20260802-rsd.md`
- `docs/decisions/trainer-classroom-discord-integration-20260802-technical-decisions.md`
- https://docs.discord.com/developers/platform/oauth2-and-permissions
- https://docs.discord.com/developers/events/gateway
- https://docs.discord.com/developers/topics/rate-limits
