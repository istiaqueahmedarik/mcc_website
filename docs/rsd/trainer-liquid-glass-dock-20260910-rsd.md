# Trainer classroom liquid glass dock

## Request and scope

Implement the user's requested bottom glass dock for the screenshot's trainer classroom navigation: Updates, Live, Topics, People, Contests, and More. This is a narrow presentation change authorized by the direct implementation request. Preserve student navigation, tab values, URL synchronization, menus, handlers, and permissions.

## Design brief

The trainer moves between updates, teaching sessions, topics, students, contest rooms, and standings while working. The report or teaching content remains the focal surface; navigation is a compact floating instrument at the bottom. Keep Inter and the existing palette: charcoal, paper white, primary blue, success green, warning amber. The signature is the five classroom destinations arranged as icon-over-label controls with a color-only selected state and a separate More destination.

Use a rounded clear-glass dock, layered reflections, minimal blur/saturation, and restrained shadows. The user clarified that the first frosted preview was too opaque: the final material uses 12% surface tint, 0.7px blur, and an SVG edge-displacement lens in Chromium, with clear CSS glass elsewhere. Avoid a full-width footer, icon-only navigation, and duplicate top tabs. The supplied image shader is visual reference: it samples an image, not live HTML. Use backdrop compositing for actual underlying content, with a static inline SVG displacement map for compatible browsers and opaque accessibility/unsupported-filter fallbacks. No remote texture, WebGL canvas, rendering loop, or new dependency.

## Acceptance criteria

- Trainer navigation floats bottom-center; each icon has its title underneath. Every destination uses the same corner radius. Selection uses a primary-colored icon and label without a surrounding shape; secondary selection marks More and is named in its menu.
- All six controls fit at 320px with at least 44px hit widths; desktop dock has a bounded width. Respect bottom safe-area insets and reserve content clearance.
- Radix tab keyboard behavior, URL state, More/context commands, Escape/focus return, and modal stacking remain intact. More opens above the dock and is bounded by available viewport height.
- Light/dark themes, visible focus, reduced motion/transparency, increased contrast, and unsupported backdrop-filter fallbacks are covered.
- No API, authentication, report computation, provider session, student surface, or database changes.

## Verification and rollback

Run client lint and diff whitespace checks. Inspect the dock at mobile/laptop/ultra-wide widths and its keyboard/More behavior where a local browser is available; distinguish isolated rendering from authenticated QA. Review CSS stacking and content clearance. Rollback consists of removing the scoped CSS import/module and restoring trainer-only navigation classes; no migration required.

## Reference refinement

The user requested a less noticeable white border, closer to the Apple Music reference. Reduce the uniform rim to a 7% semantic foreground border, replace the bright inset strokes with soft directional reflections, soften the selected-pill edge, and increase edge displacement from 22 to 32 with a wider horizontal lens ramp. Keep clear material and existing controls.

## Compact active-state refinement

The user requested less vertical dock depth and a quieter selected state. Reduce the dock from roughly 74px to 60px by changing outer padding from 8px to 4px and item height from 64px to 52px. Preserve 44px minimum control width. Give every destination the same 1.25rem interaction radius. Use primary icon/label color and a slightly stronger label weight for selection, without an active background, icon circle, or position dot.
