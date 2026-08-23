# ADR-0013: Shared Discord Guild Classroom Bindings

Status: Accepted through user full-auto instruction
Date: 2026-08-09
Task ID: trainer-shared-discord-guild-classrooms-20260809
Supersedes: ADR-0012 only where it requires one dedicated guild per classroom

## Context

ADR-0012 chose one dedicated Discord guild per classroom for v1 simplicity. The product now needs several MCC classrooms to coexist in one organization Discord guild. The existing implementation already stores one bot installation separately from classroom bindings and resolves inbound activity through exact mapped channel IDs, but a unique constraint on binding `guild_id` prevents reuse.

## Decision

- One Discord guild installation may be referenced by many classroom bindings.
- One classroom continues to have at most one Discord binding.
- Every classroom keeps distinct staff/student channel mappings, rules, jobs, and provisioning state.
- Discord-origin messages and `/mcc` commands continue resolving classroom context from exact mapped channel IDs.
- Shared-guild channel presentation uses clean classroom slugs by default and adds a stable short classroom-ID suffix only when another bound classroom in the same guild has the same normalized slug.
- Existing mapped channels are reconciled in place; channel IDs are not replaced solely for naming.
- Provisioning failures become binding-scoped action-required state after retries are exhausted.
- The migration drops only guild uniqueness and replaces its lookup index.

All other ADR-0012 boundaries remain: MCC/Postgres is authoritative, Discord accounts are unique and securely linked, browser access to `mcc_private` remains revoked, website-authored human bodies do not post to Discord, and the Gateway stays in the separate worker.

## Consequences

Positive:

- Organizations can operate several cohorts in one Discord server.
- Existing channel-ID routing avoids an extra classroom selection step in Discord.
- Classroom privacy and repair remain scoped to binding/channel mappings.

Negative:

- Guild channel capacity is shared across classrooms and can be exhausted sooner.
- Discord admins retain their platform-level ability to bypass channel denies.
- Channel trees need stable classroom suffixes only for duplicate normalized classroom names.
- Live testing must cover users who belong to one versus several classrooms in the same guild.

## Rejected Alternatives

- One Discord application/guild installation per classroom: duplicates bot installation state and does not meet the reuse request.
- Route commands by channel/category name: names are mutable and not safe authorization identifiers.
- Add a classroom picker to every command: unnecessary inside already-mapped private/staff channels and increases selection mistakes.
- Hold Postgres advisory locks during Discord API calls: creates long lock lifetimes around an external system.

## References

- `docs/rsd/trainer-shared-discord-guild-classrooms-20260809-rsd.md`
- `docs/decisions/trainer-shared-discord-guild-classrooms-20260809-technical-decisions.md`
- `docs/adr/0012-classroom-discord-bridge.md`
- Official Discord API documentation for guild channels and permission overwrites, reviewed through Context7 on 2026-08-09.
- Supabase changelog reviewed on 2026-08-09; no breaking change affects this private-schema constraint migration.
