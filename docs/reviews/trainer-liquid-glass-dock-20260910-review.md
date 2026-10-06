# Trainer glass dock implementation review

## Outcome and review order

The trainer classroom section bar now floats bottom-center as a glass dock, matching the supplied screenshot's destinations and requested icon-over-title layout. The subsequent user correction replaces the initial frosted material with clear glass: 12% surface tint, 0.7px blur, reflective edges, and backdrop refraction. Start with `docs/rsd/trainer-liquid-glass-dock-20260910-rsd.md` for the request and acceptance criteria.

1. `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`: the existing role navigation selects scoped dock styles only for trainers. The existing Radix tab state, URL synchronization, values, More/context actions, tour IDs, and handlers remain connected. More opens upward with viewport collision handling. The trainer Tabs root reserves bottom clearance.
2. `client/src/app/classroom/live/[id]/TrainerGlassFilter.jsx`: static inline SVG map bends the live backdrop at the edges, without a rendering loop or remote texture. A hydration-safe Chromium check enables the SVG backdrop reference; other browsers keep clear CSS glass. SVG backdrop displacement is not yet interoperable across browsers (https://github.com/w3c/svgwg/issues/1142).
3. `client/src/app/classroom/live/[id]/TrainerClassroomDock.module.css`: material layers, bounded fixed positioning, five-column tab group plus More, shared destination radius, color-only active state, explicit focus/press states, safe-area clearance, and accessibility fallbacks. Dropdown menu items have 44px minimum heights. The fixed layer uses z-index 40, below existing z-50 menu/dialog portals.

| Before | After | Why |
| --- | --- | --- |
| Inline underlined trainer navigation | Bottom-centered glass dock | Requested Apple Music-inspired navigation |
| Icons beside labels | Icons above persistent titles with a shared radius and color-only active state | Compact wayfinding with clear, quiet selected-state cues |
| Menu below the top bar | Bounded menu above dock | Keeps secondary tools visible within the viewport |
| No floating-navigation clearance | Bottom padding and focused-control scroll margin | Lets final content clear the dock |

## Validation

- Full client lint after the clear-glass revision: passed, zero errors and nine warnings.
- Production Next.js build: passed (compilation, TypeScript, page generation, and build traces).
- Focused lint for both changed JSX files: passed from the client directory.
- `git diff --check`: passed.
- Isolated local browser fixture renders the actual extracted navigation function, actual Radix wrappers, Lucide icons, and dock CSS with synthetic content. Reviewed 320px dark and 390px light layouts, laptop 1366px and ultra-wide 2560px. Smallest measured dock target was 45.8px wide (320px iframe with a visible scrollbar); desktop dock stays 544px wide and centered.
- Clear-glass revision: browser computed style confirmed `rgba(14, 16, 22, 0.12)` with an SVG filter reference, `blur(0.7px)` and `saturate(1.25)`; all six mobile targets remained about 46px wide. Text has a narrow theme-colored halo to protect labels over transparent content.
- Browser behavior: ArrowLeft from Contests selected People; More opened upward; Schedule selection marked More current; Escape closed the menu and returned focus to More.
- CSS review covers reduced motion/transparency, high contrast/forced colors, opaque unsupported-filter fallback, semantic token colors, and compositor-only press motion. These preference modes and Safari/device behavior were not separately browser-tested.
- Authenticated classroom data, URL Back/Forward integration, live modal stacking, onboarding tour positioning, and production deployment were not exercised. The preview is isolated UI evidence, not authenticated E2E.

## Boundaries and rollback

No new dependencies, remote image loads, animation loops, backend calls, authorization changes, persistence, provider credentials, or database changes. The pre-existing untracked `.codex-tldraw-performance-prototype.js` remains untouched. Roll back the scoped module/import and trainer navigation classes; no data rollback is needed.

## Softer edge refinement

| Before | After | Why |
| --- | --- | --- |
| 38% white border and 65% sharp top highlight | 7% theme-aware border and 14% softened inset highlight | Removes the conspicuous white outline |
| Bright selected-pill rim | Subtle tint and softened highlight | Selection stays visible without looking outlined |
| Displacement scale 22, narrow horizontal ramp | Scale 32, wider horizontal ramp | More of the glass edge comes from bending underlying content |

Changes are confined to dock CSS and filter parameters. Focused JSX lint, isolated preview bundle, and diff checks passed; the updated mobile light/dark preview was visually inspected. The previous production build passed before this parameter-only refinement; it was not rerun. The temporary preview server needed restarting and the stale browser error tab was replaced with a fresh preview tab.

## Compact navigation refinement

| Before | After | Why |
| --- | --- | --- |
| 8px dock padding and 64px items | 4px dock padding and 52px items | Reduces the dock from roughly 74px to 60px tall |
| Active icon circle and position dot | Primary icon/label color with slightly stronger label weight; the same 1.25rem interaction radius applies to every destination | Keeps selection clear without adding a selected background or shapes around the icon |
| 20px icons and 6px icon-label gap | 18px icons and 2px gap | Keeps icon and title legible in the thinner dock |

The actual navigation fixture was inspected at 320px dark and 390px light widths. Keyboard selection still changes the active tab, More still opens above the dock, and focused JSX lint plus `git diff --check` pass. Full client lint passes with zero errors and nine pre-existing warnings. The production Next.js build also passes after this refinement, including compilation, TypeScript, static-page generation, and build traces.
