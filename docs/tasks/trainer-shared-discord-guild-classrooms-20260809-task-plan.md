# Trainer Shared Discord Guild Classrooms Task Plan

Status: Auto-approved by user full-auto instruction
Task ID: trainer-shared-discord-guild-classrooms-20260809
Last updated: 2026-08-09

## Dependency Graph

1. Approve RSD and shared-guild topology.
2. Update base SQL and add follow-up migration artifact.
3. Remove the server creation restriction.
4. Make provisioning names and staff permission reconciliation classroom-specific.
5. Surface exhausted provisioning jobs as binding-scoped action-required state.
6. Update existing wizard/settings copy.
7. Apply and verify follow-up SQL against the configured database.
8. Bundle/lint, review security and migration safety, then update durable memory.

Steps 3-6 depend on the topology decision. Database application depends on reviewed SQL. Final review depends on all implementation and verification steps.

## Tasks

- [x] Inspect current schema, creation handler, provisioning, command/message routing, worker, and UI copy.
- [x] Approve the RSD through the user's explicit approval and full-auto instruction.
- [x] Record technical decisions and ADR-0013.
- [x] Remove guild uniqueness from clean-install SQL and add a normal guild lookup index.
- [x] Add idempotent follow-up SQL for existing databases with a bounded lock wait.
- [x] Remove dedicated-guild validation/error handling from classroom creation.
- [x] Revalidate current Discord Manage Server permission for the posted guild before classroom creation.
- [x] Reconcile classroom-distinct staff/category names and staff privacy overwrites.
- [x] Mark bindings action-required when provisioning/reconcile delivery jobs dead-letter.
- [x] Update dedicated-server wording in the existing classroom wizard and Discord Settings card.
- [x] Apply and verify the follow-up SQL using the configured database connection.
- [x] Bundle the server and worker; run targeted client lint and diff checks.
- [x] Add implementation review and update knowledge-base memory.

## Write Scope

- `docs/sql/trainer-classroom-discord-integration-20260802.sql`
- `docs/sql/trainer-shared-discord-guild-classrooms-20260809.sql`
- `server/src/controllers/classroomController.ts`
- `server/src/controllers/discordController.ts`
- `server/src/utils/discordDeliveryQueue.ts`
- `server/src/utils/discordProvisioning.ts`
- `client/src/components/CreateClassroomWizard.jsx`
- `client/src/components/ClassroomDiscordSettingsCard.jsx`
- Task RSD/decision/ADR/plan/review and `docs/knowledge-base/*.md`

No unrelated trainer/classroom files, dependency manifests, auth routes, OAuth scopes, or public database policies are in scope.

## Verification

- SQL pre/post queries for constraint, index, duplicate binding support, RLS, and browser-role grants.
- `bun build src/index.ts --target=bun`.
- `bun build src/workers/discordWorker.ts --target=bun`.
- Targeted ESLint for the two changed client components.
- `git diff --check`.
- Source audit that inbound messages and `/mcc` commands still require exact channel mappings.

## Rollback

Revert application/UI changes normally. Database rollback is conditional: query for guild IDs with more than one binding, resolve them through an explicit product decision, then recreate the unique constraint. Do not delete or detach bindings automatically.
