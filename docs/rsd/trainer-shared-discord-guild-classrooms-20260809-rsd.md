# Trainer Shared Discord Guild Classrooms RSD

Status: Approved by user; remaining gates waived by full-auto instruction
Task ID: trainer-shared-discord-guild-classrooms-20260809
Owner: Codex / Arik
Last updated: 2026-08-09
Delivery mode: Full auto

## Mode and Gate Policy

The user approved this RSD and explicitly requested full-auto delivery on 2026-08-09. The technical decision, ADR, task-plan, and implementation-review gates are therefore recorded without additional pauses while retaining the repository's documentation, verification, and review requirements.

Current gate:

- The primary RSD was approved by the user on 2026-08-09.
- Remaining workflow gates may proceed automatically for this task.

## Task Interpretation

“DC server” is interpreted as a Discord server (Discord guild), and the request is interpreted as: allow a trainer to select a Discord server that is already connected to another MCC classroom when creating a new classroom.

The relationship remains:

- Each classroom has at most one active Discord server binding.
- One Discord server may host multiple MCC classrooms.
- Each classroom keeps its own mapped staff channel, student channel categories, private student channels, rules, jobs, and health state.

## Problem Summary

The classroom creation wizard already lists every Discord server where the trainer has Manage Server permission, including a server previously chosen for another classroom. The server then rejects reuse because `mcc_private.classroom_discord_bindings.guild_id` has a unique constraint and the create handler translates that violation into “already bound to another classroom.” Existing product copy also describes the selected server as dedicated to one classroom.

Most runtime routing is already safer than the binding constraint suggests: inbound messages and `/mcc` commands resolve classroom context through the exact mapped Discord channel and binding. Provisioning records are also binding- and classroom-scoped. The remaining topology assumptions must be removed deliberately without weakening channel privacy or making shared-server failures affect unrelated classrooms.

## Goal

Let authorized trainers create multiple MCC classrooms in the same Discord server while keeping every classroom’s channels, permissions, commands, reminders, roster reconciliation, and website thread bridge isolated by classroom binding.

## Users and Use Cases

- A trainer operates several cohorts in one organization Discord server and wants each cohort represented as a separate MCC classroom channel tree.
- A student belongs to more than one of those classrooms and needs access only to that student’s private channel in each classroom.
- A trainer or substitute uses `/mcc` inside a mapped classroom channel and expects the command to affect only the classroom represented by that channel.
- An administrator repairs one classroom’s Discord provisioning without changing another classroom bound to the same server.

## User-Visible Behavior

- The classroom creation wizard labels the Discord choice as a reusable server, not a dedicated server.
- A trainer with Discord Manage Server permission can select a server already used by another MCC classroom.
- Creating the classroom succeeds and queues provisioning for the new classroom binding.
- Discord creates or reconciles a distinct, recognizable channel area for the new classroom.
- Staff-channel links and classroom Discord status continue to point to the correct classroom-specific channel.
- If the shared Discord server is out of channel/category capacity or the bot lacks permissions, the affected classroom reports actionable provisioning failure without corrupting or rebinding existing classrooms.

## Functional Requirements

- Remove only the one-guild-per-classroom restriction; preserve the one-binding-per-classroom restriction.
- Reuse the existing `discord_guild_installations` row for a shared guild rather than creating duplicate installation records.
- Keep `classroom_discord_bindings`, categories, channel mappings, notification rules, delivery jobs, command audit rows, and message links scoped to the correct classroom/binding.
- Route inbound Discord messages, edits, deletes, autocomplete, modal submissions, and `/mcc` commands by exact mapped channel before applying classroom authorization.
- Give each classroom a distinguishable staff channel in a shared guild. Existing mapped staff channels must remain valid and be safely reconcilable.
- Keep student category names classroom-specific and keep every private channel’s overwrites limited to the bot, the target student, and authorized classroom managers/substitutes.
- Allow one Discord-linked student to be provisioned into separate private channels for each classroom the student actively belongs to.
- Preserve idempotent classroom provisioning and reconciliation when several bindings share one guild installation.
- Keep installation-level state shared only where it truly describes the bot installation; keep provisioning/action-required state classroom-specific.
- Replace dedicated-server error and instructional copy with shared-server-safe wording.
- Represent the database change as reviewed follow-up SQL that is safe for an already-migrated database.

## Security and Privacy Requirements

- A shared guild must not allow a trainer, substitute, or student from classroom A to see or mutate classroom B unless separately authorized for classroom B.
- Discord channel IDs and binding IDs remain the routing authority; channel names, category names, guild membership, labels, and user-provided classroom IDs are not authorization inputs.
- The bot must continue denying `ViewChannel` to `@everyone` on private channels and explicitly granting only authorized Discord identities.
- Existing unique Discord-account linking, encrypted OAuth-token storage, browser-role revocation on `mcc_private`, message-body logging restrictions, and MCC/Postgres source-of-truth rules remain unchanged.
- Dropping the guild uniqueness constraint must not drop the classroom uniqueness constraint, channel uniqueness constraints, or foreign keys.
- SQL rollout must identify the exact constraint before dropping it and must add an ordinary lookup index for `guild_id` if the unique index was previously serving shared-guild queries.

## Acceptance Criteria

- [ ] A trainer can create classroom B using the same Discord guild already bound to classroom A.
- [ ] Both classroom bindings reference the same guild installation and retain different binding IDs and classroom IDs.
- [ ] Classroom A remains operational after classroom B is created and provisioned.
- [ ] Each classroom has its own mapped staff channel and student channel categories that are distinguishable in Discord.
- [ ] The same student enrolled in both classrooms receives two correctly mapped private channels, one per classroom.
- [ ] A student enrolled only in classroom A cannot view or write to classroom B private channels.
- [ ] `/mcc` commands and Discord-origin message create/edit/delete events in a classroom B mapped channel affect only classroom B data.
- [ ] Repairing or reconciling classroom B does not replace, rename to the wrong classroom, or remap classroom A channels.
- [ ] A guild capacity or permission failure becomes an actionable failure for the affected binding/job and does not delete or detach existing classroom bindings.
- [ ] Classroom creation no longer returns the old “server already bound” error for a valid shared guild.
- [ ] Existing single-classroom guild bindings continue working without mandatory remapping.
- [ ] Follow-up SQL, server bundle checks, targeted client lint, and migration verification pass or blockers are documented.

## Non-Goals

- Do not bind one classroom to multiple Discord servers.
- Do not merge classroom rosters, student threads, schedules, notification rules, check-ins, submissions, or trainer permissions because classrooms share a guild.
- Do not authorize users from Discord roles or guild membership alone.
- Do not redesign the classroom creation wizard or Discord Settings surface beyond required labels, descriptions, and error states.
- Do not add automatic deletion of old channels, destructive rebinding, or cross-classroom channel moves.
- Do not change Discord OAuth scopes, token encryption, Message Content intent requirements, or website-to-Discord human-message policy.
- Do not apply the migration to a production database before technical decisions and rollout steps are approved.
- Do not clean up unrelated dirty trainer/classroom/Discord worktree changes.

## Constraints

- Preserve the existing `discord_guild_installations.guild_id` uniqueness: one bot installation record per Discord guild.
- Preserve `classroom_discord_bindings.classroom_id` uniqueness: a classroom still has at most one Discord binding.
- Continue using exact Discord snowflakes as text, never JavaScript numbers.
- Use existing Next.js/React UI patterns, Hono/Bun server structure, `discord.js` worker, PostgreSQL schema, and durable delivery queue.
- Do not add a dependency or new top-level navigation surface.
- Keep changes compatible with the current dirty worktree; the existing Discord integration is uncommitted and must not be reverted or overwritten wholesale.

## Verification Expectations

- Review the follow-up SQL for lock scope, exact constraint targeting, rollback implications, and preservation of dependent foreign keys/indexes.
- Bundle the Hono server entrypoint and Discord worker.
- Run targeted client ESLint for classroom creation and Discord Settings copy changes.
- Run `git diff --check`.
- Exercise a database-backed integration scenario with two classrooms sharing one guild installation.
- Exercise mapping/authorization scenarios for a trainer, a student in both classrooms, and a student in only one classroom.
- Where Discord credentials and a test guild are available, smoke-test provisioning, `/mcc` channel routing, private visibility, and independent classroom repair.

## Risks and Open Questions

- Discord guild and category channel limits can be reached sooner when classrooms share one guild. Technical decisions must define preflight versus worker-time capacity handling and the user-facing recovery path.
- The existing unparented `mcc-staff` naming is ambiguous when several classrooms share a guild. Technical decisions must choose a collision-resistant, readable naming convention and safe reconciliation behavior for existing channels.
- One shared guild installation can be healthy while one classroom binding has a provisioning error. Technical decisions must keep installation health and binding health semantics from masking each other.
- Simultaneous provisioning jobs in one guild can race on Discord capacity and channel creation. Technical decisions must decide whether the current per-binding idempotency is sufficient or whether shared-guild serialization/locking is needed.
- Live Discord testing depends on configured credentials, bot permissions, and suitable trainer/student test identities; unavailable external checks must be documented rather than simulated.

## Documentation and Knowledge Used

- Source: `AGENTS.md`
  Used for: RSD-first gates, dirty-worktree preservation, verification, security review, and knowledge-base update requirements.
  Confidence: High
- Source: `docs/rsd/trainer-classroom-discord-integration-20260802-rsd.md`
  Used for: current Discord product scope, security requirements, worker topology, and source-of-truth rules.
  Confidence: High
- Source: `docs/decisions/trainer-classroom-discord-integration-20260802-technical-decisions.md` and `docs/adr/0012-classroom-discord-bridge.md`
  Used for: the accepted one-dedicated-guild-per-classroom decision that this request proposes to supersede narrowly.
  Confidence: High
- Source: current Discord SQL, controller, provisioning, thread bridge, command handler, worker, classroom wizard, and Discord Settings code
  Used for: locating the unique guild constraint, dedicated-server error/copy, binding-scoped provisioning, and exact-channel command/message routing.
  Confidence: High
- Source: official Discord API documentation through Context7 (`/discord/discord-api-docs`)
  Used for: channel creation fields, category parenting, permission-overwrite requirements, stable channel IDs, and capacity-related failure considerations.
  Confidence: High

## Definition of Done

- [x] Current implementation and durable one-guild topology decision inspected.
- [x] Primary requirement package drafted.
- [x] RSD approved by the user.
- [x] Technical decisions and ADR amendment recorded under the user’s full-auto instruction.
- [x] Full task plan and dependency graph recorded under the user’s full-auto instruction.
- [x] Implementation and migration pass verification.
- [x] Security, privacy, migration, and dirty-worktree review completed.
- [x] Implementation review approved under the user’s full-auto instruction.
- [x] Knowledge base updated with the superseding shared-guild decision and implementation lessons.
