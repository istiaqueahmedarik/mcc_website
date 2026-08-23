# Trainer Existing Classroom Discord Binding Technical Decisions

Status: Auto-approved by direct user implementation request
Task ID: trainer-existing-classroom-discord-binding-20260809
Last updated: 2026-08-09

## TD-001: Bind From Classroom Settings Only

Expose the old-classroom bind option only inside the authenticated classroom Discord Settings card for trainers/managers. Do not add a new public page, public route, or top-level navigation entry.

Why: the action changes a private classroom integration and belongs beside Discord status, Repair, rules, and roster health.

## TD-002: Reuse Creation Binding Logic

Use the existing binding helper that creates or reuses the guild installation, inserts the classroom binding, seeds default notification rules, and queues `provision_classroom`.

Why: existing and newly created classrooms should have the same binding shape, defaults, idempotency key, and worker behavior.

## TD-003: Reauthorize The Exact Guild On Mutation

The POST handler must call `getManageableDiscordGuildForUser` before the database transaction. The browser's selected guild ID is discovery input only; authorization comes from Discord's current guild list and Manage Server permission.

Why: this follows the shared-guild security rule and prevents crafted requests from binding classrooms to unmanaged Discord servers.

## TD-004: Keep The Transaction Short

Perform Discord OAuth refresh/guild listing outside the transaction. Inside the transaction, check for an existing classroom binding, insert the binding/rules/job, and return.

Why: database locks must not wait on external HTTP calls.

## TD-005: UI Uses Existing Operational Controls

Use the card's existing density, shadcn/Radix `Select`, semantic Button/Input controls, inline error state, and ordinary loading feedback. Avoid new motion or a separate dialog.

Why: this is a repeat trainer operation in Settings, not a new onboarding experience.

## Rollback

Revert the endpoint/proxy/UI changes. Any classroom bound through the new flow should be kept unless an explicit product/data decision says to detach it; no automatic destructive rollback is approved.
