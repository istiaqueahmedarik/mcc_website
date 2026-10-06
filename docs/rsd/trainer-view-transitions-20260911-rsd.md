# Trainer page and tab view transitions

The user requests view transitions between trainer pages and tabs, referencing the Next.js guide. This authorizes a narrow presentation enhancement.

## Design and implementation

Trainers repeatedly move between classrooms, live sessions, topics, people, contests and reports. Preserve the existing Inter typography, charcoal/paper surfaces, primary blue, success green and warning amber. The stationary glass dock anchors this workflow. Use a restrained 160ms content crossfade; avoid full-screen slides, card stagger and decorative morphing.

Use the React ViewTransition exported by Next.js 16.1.1's bundled App Router React. The existing experimental flag is already enabled. Keep existing Next Link/ProgressLink navigation. Add a shared trainer page boundary to the trainer layout and authorized trainer classroom content, plus independent classroom and form-response tab-content boundaries. Only trainer classroom and Visualize/Explore/JSON tab state updates use startTransition; keep confirmation, history and fetch behavior intact. Do not key/remount tab content for animation.

## Acceptance and verification

- Trainer routes and loaded trainer classroom content crossfade; the dock stays outside the tab boundary.
- Student tab behavior, URLs, unsaved-note confirmation, authorization and data handlers remain intact.
- Reduced-motion and visible keyboard-focus interactions disable animation. Unsupported browsers use normal navigation.
- No dependencies, framework upgrades, API or schema changes.
- Run client lint/build and diff checks. Record browser verification boundaries accurately.
- Rollback removes the boundaries, scoped CSS and trainer state transition wrapper; no data rollback.

Reference: https://nextjs.org/docs/app/guides/view-transitions. The newer guide's navigation transitionTypes are intentionally unused on the installed Next.js version.

## Approved extension: classroom card to header

The user accepted the proposed classroom-card-to-header shared-element transition. Pair the dashboard card surface and title with the classroom header using classroom-specific names, default none and a 280ms shared morph. Other content retains the short fade. Both card and list layouts use the same identity, with no duplicate named boundaries in attention links.

The destination fetches data on the client, so matching names alone cannot pair on a cold load. Carry only the selected classroom ID/name in a root-scoped React context, without storage, URLs, logging or additional requests. Use the identity in an explicitly labeled opening skeleton during both route loading and client loading. Discard it after loading settles (including errors/access gates), or when navigating elsewhere. It is display-only and never supplies permissions or classroom data. Modified/new-window clicks do not seed it. Direct visits retain a generic loader. Existing authorization and fetch handlers remain authoritative.

Verify the shared pair in the browser, including the cold route fallback, not just a successful transition-ready promise. Reduced motion and visible keyboard focus must suppress shared movement. Run lint/build; preserve earlier changes in this task.
