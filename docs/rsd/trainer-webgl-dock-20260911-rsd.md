# Trainer dock WebGL lens

## Status
Approved by the user, prototyped in isolation, and integrated into production trainer classroom navigation on 2026-09-12.

## Authorization and scope
The user approved implementing the proposed hybrid WebGL lens after reviewing feasibility and the Dribbble reference, then explicitly approved production integration with six icons from Heroicons Animated. This supersedes the earlier dock RSD's no-WebGL constraint and permits a moving selection lens. Existing classroom behavior, permissions, URL state, and student navigation remain outside the visual change.

## Intended behavior
Keep the compact trainer classroom dock and all six labeled destinations. A rounded optical lens follows mouse hover and returns to the selected destination on exit; selecting a tab moves it to that destination. More remains a Radix menu. Preserve HTML controls, keyboard focus, URL selection and permissions. Keyboard interaction uses immediate positioning. Touch uses selection, without hover dependence.

The lens-position refinement hides a destination label as the lens reaches it, then moves that icon into the optically calm vertical center with a small scale increase. During pointer hover the lens grows beyond the dock boundary; when the pointer leaves it springs back to the exact selected-control center and fits inside the dock. The label and original icon position return as the lens leaves. This keeps text and icon strokes away from the shader's high-dispersion rim while preserving labeled navigation outside the lens and complete accessible names.

## Rendering decision
Use one padded WebGL canvas for both the main dock shell and moving lens, with restrained tint, edge depth, and dispersion. Pair it with separate low-strength dock and higher-strength lens backdrop displacement filters. Keep icons and labels as crisp DOM content above the material. Avoid white rims and bright inset highlights; glass depth comes from low-contrast cool edge tint, backdrop distortion, and a soft dark shadow. Use the requested MIT-licensed Heroicons Animated components through the existing Framer Motion dependency: Inbox, Academic Cap, Rectangle Stack, Users, Trophy, and Squares Plus. Hover starts icon motion; keyboard focus positions the lens immediately without triggering decorative icon motion. Stop the renderer at rest, cap pixel ratio at 2, and dispose GPU resources on unmount. Context loss retains the moving CSS material. Reduced motion, reduced transparency, increased contrast, and forced colors retain readable controls without the optical layer.

## Acceptance and verification
Check shader compilation and live rendering in the isolated browser fixture, then exercise the production trainer classroom when an authenticated session is available. Cover hover/selection, More-menu state, resizing, theme changes, keyboard focus, context-loss fallback and idle scheduling where available. Run targeted ESLint and client build; distinguish isolated browser checks from authenticated classroom QA. No backend or dependency change. Rollback removes the lens component/import, animated icon mapping, and scoped CSS additions.
