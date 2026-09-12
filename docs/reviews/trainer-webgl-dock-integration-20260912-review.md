# Trainer WebGL Dock Integration Review

## Outcome

The approved moving lens now runs in the production trainer classroom dock. The six trainer destinations use the requested Heroicons Animated studies: Inbox for Updates, Academic Cap for Live, Rectangle Stack for Topics, Users for People, Trophy for Contests, and Squares Plus for More. Student navigation, trainer tab values, URL restoration, permissions, and secondary menu actions are unchanged.

## Review flow

1. `client/src/components/ui/heroicons-animated/TrainerDockIcons.jsx` contains the six upstream SVG paths and motion studies adapted to the already-installed `framer-motion` package. The adjacent `LICENSE` preserves the MIT notice. The components expose the upstream start/stop handle so the dock triggers motion for pointer hover only.
2. `ClassroomLiveClient.js` maps only trainer primary destinations to those icons. While a pointer is present, hover takes precedence over the focus retained by the last clicked tab. Moving between dock items keeps hover active so the spring travels directly from the previous hovered icon to the next instead of briefly returning to the selected tab. After pointer exit, keyboard focus, open More state, and the selected tab determine the fitted resting destination. Existing Radix Tabs, DropdownMenu, ContextMenu, action handlers, accessible labels, tour IDs, and student icon mappings remain intact.
3. `TrainerDockLens.jsx` measures each real control by its bounding rectangle and moves a rounded material with an interruptible damped spring. Its padded canvas renders the main dock shell and moving lens together. Pointer hover expands the lens 20px beyond control width and 12px beyond dock height with a fuller pill radius; pointer exit contracts it to the selected control and dock interior. Separate spring values keep position, width, and height continuous. Pointer position also drives a clearly visible local white shader light with an 82px core, 170px falloff, directional surface response, and restrained dispersion; it fades to zero on dock exit and the renderer sleeps after settling.
4. `TrainerClassroomDock.module.css` layers a dedicated 2.4px-blurred, scale-17 refractive shell below the dock shader and a stronger separate refraction below the moving lens. Bright white highlights and inset rims were removed in favor of cool low-contrast shader edges and a soft dark shadow. The CSS lens outline and active dock border are suppressed while WebGL is active, and the shader masks the dock edge beneath the expanded lens, leaving one continuous lens boundary. The label inside the lens fades while its icon centers and scales slightly. Reduced transparency or increased contrast removes all optical layers and restores labels; reduced motion removes transitions; existing focus rings and 44px targets remain.

## Verification

- Targeted ESLint passed with zero warnings or errors.
- `npm run build` passed and emitted the dynamic `/classroom/live/[id]` route.
- `git diff --check` passed.
- The previously approved isolated Chromium prototype remains available and WebGL-active.
- A temporary production-material fixture measured the expanded Contests lens center within 1px of its control center. The lens measured about 106×74px against a 86×52px control and 62px dock, confirming overflow above and below; the fixture was removed after inspection.
- A second temporary Chromium fixture compared the resting dock with pointer interaction after increasing light blending. Mouse entry/movement visibly brightened the hovered lens, and the console reported no WebGL errors; the fixture was removed after inspection.

The available browser session was unauthenticated, so this run does not establish authenticated classroom visual QA, real-device GPU behavior, Safari/Firefox rendering, or deployment. No backend, database, authorization, package, or API contract changed.
