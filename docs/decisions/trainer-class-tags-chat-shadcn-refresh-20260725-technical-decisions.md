# Trainer Class Tags Chat Shadcn Refresh Technical Decisions

Status: Approved by Auto mode
Task ID: trainer-class-tags-chat-shadcn-refresh-20260725
Last updated: 2026-07-25
Delivery mode: Auto

## Documentation and Knowledge Used

- Source: `docs/rsd/trainer-class-tags-chat-shadcn-refresh-20260725-rsd.md`
  Used for: decision scope
  Evidence: approved defaults include global tag dictionary, class-specific persistent chat, reactions, Inter, and scoped UI refresh.
  Confidence: High
- Source: `server/src/utils/dbInit.ts`
  Used for: schema decisions
  Evidence: existing classroom schema is initialized in code with migration-safe patterns.
  Confidence: High
- Source: `server/src/controllers/classroomController.ts`
  Used for: endpoint/auth decisions
  Evidence: problem assignment and chat live in one controller behind JWT route middleware.
  Confidence: High
- Source: `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`
  Used for: UI integration
  Evidence: current tag, problem, polling, and chat state are local to this client component.
  Confidence: High
- Source: shadcn Bubble and Message docs
  Used for: chat component shape
  Evidence: Bubble owns message surface/reactions; Message owns row/avatar/header/footer/actions.
  Confidence: High

## Context

The existing trainer classroom page uses comma-separated tag text and a common classroom chat. The requested behavior changes both data and UI. Existing class problem tag arrays should keep working, but a dictionary is needed for discoverability and consistency. Existing common chat rows cannot be reliably assigned to a class session.

## Decisions

### TD-001: Global Problem Tag Dictionary

Decision: Add `problem_tag_dictionary` as a global normalized tag table and keep `class_problems.tags text[]` as the assignment storage shape.

Options considered:
- Keep comma string only: low effort, fails discoverability and reuse.
- Join table per problem/tag: normalized relational model, larger migration and query rewrite.
- Dictionary plus existing `text[]`: satisfies UI/dictionary needs with lower compatibility risk.

Rationale:
The UI needs reusable suggestions and create-new behavior, while current problem rows already display and filter with arrays. A dictionary table hides the volatile suggestion source without refactoring every problem query.

Tradeoffs:
Tags remain duplicated in `class_problems.tags`; server normalization prevents divergent spelling.

Security and privacy impact:
Dictionary names are global classroom metadata. Only trainer/admin/classroom-manager assignment paths create tags.

Testing impact:
Verify dictionary endpoint, tag creation during assignment, and existing problem display.

HCI impact:
The combobox makes possible actions visible and reduces memory burden from comma syntax.

Code-quality impact:
Normalization lives on the server; the UI remains presentational plus selection state.

Rollback or migration:
Drop the dictionary endpoint/UI and keep existing `text[]` tags. Dictionary table can remain unused.

ADR required: No

### TD-002: Class-Specific Chat With Read-Only History

Decision: Add nullable `class_id` to `classroom_messages`; require new send/history queries to include a valid class id; leave old common rows stored but hidden from class threads.

Options considered:
- Keep common classroom chat: fails user request.
- Backfill old rows into every class: leaks context and duplicates messages.
- Require class id going forward: precise and safe.

Rationale:
Class sessions are the unit users care about for live practice. Ambiguous old common chat cannot be safely mapped.

Tradeoffs:
Old common messages become invisible from the new class chat UI unless a future migration/archive view is approved.

Security and privacy impact:
Classroom membership and recipient membership are validated before send/history.

Testing impact:
Verify history filters by class id and direct messages remain private to sender/recipient.

HCI impact:
Visible class scope prevents mode errors and wrong-context messages.

Code-quality impact:
Access checks are local helper functions, avoiding a broad auth refactor.

Rollback or migration:
UI can stop sending `classId` and old `classroom_id` behavior can be restored, with `class_id` left nullable.

ADR required: No

### TD-003: Persistent Per-User Reactions

Decision: Add `classroom_message_reactions` with `(message_id, user_id, reaction)` uniqueness and a toggle endpoint.

Options considered:
- UI-only reactions: no persistence.
- Store JSON on messages: harder to enforce uniqueness and query current-user state.
- Dedicated table: clear constraints and aggregation.

Rationale:
Persistent reactions need per-user idempotence and aggregate display.

Tradeoffs:
Adds one table and aggregate query to chat history.

Security and privacy impact:
Reaction toggles verify access to the message's class thread.

Testing impact:
Verify toggle add/remove and aggregate payload.

HCI impact:
Small labeled buttons provide quick feedback without adding chat noise.

Code-quality impact:
Dedicated table avoids mutable JSON coupling.

Rollback or migration:
Hide reaction UI and leave reaction rows unused.

ADR required: No

### TD-004: Local shadcn-Compatible Primitives

Decision: Add local `bubble.jsx` and `message.jsx` primitives based on shadcn documented composition, customized with project tone classes.

Options considered:
- Run shadcn CLI directly: could introduce registry churn and default styling.
- Inline chat markup: misses requested component direction and makes reuse harder.
- Local primitives: small, inspectable, custom.

Rationale:
The user asked for Bubble/Message and non-stock shadcn. Local primitives keep the API familiar while allowing custom visual language.

Tradeoffs:
We maintain these files locally.

Security and privacy impact:
None beyond normal UI rendering.

Testing impact:
Targeted ESLint and visual/manual review.

HCI impact:
Message composition improves sender metadata, alignment, feedback, and reaction affordances.

Code-quality impact:
Deep enough UI modules hide class variance without broad design-system work.

Rollback or migration:
Chat can return to inline markup; primitives are isolated.

ADR required: No

### TD-005: Inter Font and Professional Tokens

Decision: Replace current body font with `next/font/google` Inter and adjust global shadcn color tokens/radius toward a restrained professional palette.

Options considered:
- Keep Ubuntu/Geist: fails request.
- Local Inter asset: not available in repo.
- `next/font/google`: standard Next path with build-time font optimization.

Rationale:
Inter is requested and fits operational trainer/classroom UI.

Tradeoffs:
Build requires Next font fetch/cache behavior.

Security and privacy impact:
`next/font` self-hosts generated assets; no runtime Google Fonts request.

Testing impact:
Run client lint/build where possible.

HCI impact:
Improved readability and professional tone.

Code-quality impact:
Global token changes are compact but must avoid one-note palettes.

Rollback or migration:
Restore local font declarations and previous CSS variables.

ADR required: No
