# Trainer Existing Classroom Discord Binding RSD

Status: Implemented under direct user implementation request
Task ID: trainer-existing-classroom-discord-binding-20260809
Owner: Codex / Arik
Last updated: 2026-08-09
Delivery mode: Sequential full-auto follow-up

## Task Interpretation

The user wants trainers to connect an already-created classroom to Discord after the classroom exists. This must not become a new public route or public onboarding surface. It should live in the authenticated trainer classroom flow and perform the same necessary binding/provisioning work as creating a new Discord-enabled classroom.

## Goal

Let an authorized trainer or admin bind an existing unbound classroom to an eligible Discord server, including a server already used by another classroom, then queue classroom-scoped Discord provisioning.

## Functional Requirements

- Show a trainer-only option when the classroom Discord Settings card is unbound.
- Reuse the existing Discord OAuth status and eligible guild list flow.
- Require the trainer to choose a Discord server they currently manage.
- Create the same private binding, default notification rules, and provisioning job used by Discord-enabled classroom creation.
- Refresh the existing classroom Discord Settings card after binding.
- Keep students/non-managers on a read-only unbound message.
- Do not add a new public page, navigation item, or unauthenticated API surface.

## Security and Privacy Requirements

- The server must independently authorize the MCC classroom manager before mutation.
- The server must independently revalidate current Discord Manage Server permission for the exact posted guild snowflake.
- The posted guild name is not trusted; provider-returned metadata is stored.
- The binding must remain one per classroom.
- Discord provisioning remains asynchronous through the delivery queue after commit.
- No Discord OAuth tokens, message bodies, or private channel data should be logged or exposed to the browser beyond the classroom's own status.

## Acceptance Criteria

- [x] A trainer viewing an unbound classroom Settings tab can connect it to Discord.
- [x] A student viewing the same unbound state cannot connect the classroom.
- [x] The bind action fails with a reconnect hint when the trainer lacks the required OAuth state.
- [x] The bind action fails when the trainer does not currently have Discord Manage Server permission for the selected guild.
- [x] The bind action fails gracefully if the classroom is already bound.
- [x] On success, the classroom has a `classroom_discord_bindings` row, default notification rules, and a `provision_classroom` delivery job.
- [x] The UI reloads to the normal Discord status/settings surface after binding.

## Non-Goals

- Do not bind one classroom to multiple Discord servers.
- Do not create a public share/connect route.
- Do not change Discord OAuth scopes, token storage, worker topology, or private-channel permissions.
- Do not add a schema migration.
- Do not redesign the classroom Settings tab beyond the focused unbound action.
- Do not clean up unrelated dirty worktree changes.

## Documentation and Knowledge Used

- `AGENTS.md` for RSD-first delivery, protected trainer/classroom entry points, verification, and reviewer-flow expectations.
- `docs/knowledge-base/*` for shared-guild, external-resource authorization, Discord privacy, trainer UI, and Supabase safety rules.
- Context7 Next.js 16.1.1 Route Handler docs for authenticated JSON proxy shape.
- Context7 Hono docs for JSON request/response handler shape.
- Supabase changelog and Postgres best-practice references for current DB/security context and short transaction guidance.
- Existing Discord integration source under `server/src/controllers/discordController.ts`, `server/src/routes/classroomRoute.ts`, and `client/src/components/ClassroomDiscordSettingsCard.jsx`.

## Definition of Done

- [x] RSD, technical decision, task plan, implementation review, and knowledge-base updates are recorded.
- [x] Server and client bind path is implemented.
- [x] Focused server bundle, client lint, client build, and diff checks pass or blockers are documented.
