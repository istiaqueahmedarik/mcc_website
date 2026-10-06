# Trainer Existing Classroom Discord Binding Task Plan

Status: Completed under direct user implementation request
Task ID: trainer-existing-classroom-discord-binding-20260809
Last updated: 2026-08-09

## Dependency Graph

1. Record requirement/decision/task docs.
2. Add protected server bind endpoint.
3. Add authenticated Next.js proxy POST.
4. Add trainer-only unbound Settings card flow.
5. Verify bundles/lint/build/diff and update review/memory.

The UI depends on the API shape. Verification depends on implementation.

## Tasks

- [x] Read AGENTS, knowledge base, required UI/Supabase/context docs, and existing Discord source.
- [x] Record compact RSD and technical decisions.
- [x] Add `POST /classroom/:id/discord` for existing classroom binding.
- [x] Add matching authenticated Next route proxy.
- [x] Replace the unbound Discord Settings copy with a trainer-only connect flow.
- [x] Run focused verification.
- [x] Add implementation review and update knowledge-base memory.

## Write Scope

- `server/src/controllers/discordController.ts`
- `server/src/routes/classroomRoute.ts`
- `client/src/app/api/classroom/[id]/discord/route.js`
- `client/src/components/ClassroomDiscordSettingsCard.jsx`
- Task docs, review docs, and knowledge-base docs

No SQL migration, OAuth scope change, public page, dependency change, or unrelated cleanup is in scope.
