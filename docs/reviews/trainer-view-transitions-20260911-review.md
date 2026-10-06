# Trainer view transitions review

Trainer navigation now uses short native content crossfades to connect page and tab changes. The existing classroom glass dock remains outside the tab animation. Start with `docs/rsd/trainer-view-transitions-20260911-rsd.md` for scope.

## Review order

1. `client/src/components/TrainerViewTransition.jsx` defines the shared, pathname-keyed trainer page boundary. Next.js 16.1.1 already bundles a React build exporting ViewTransition and the repository already enables its experimental integration. There is no new dependency or alternate router.
2. `client/src/app/trainer/layout.js` applies this boundary to dashboard, profile and forms routes. Existing page authorization guards and ProgressLink/Next Link remain authoritative.
3. `client/src/app/classroom/live/[id]/ClassroomLiveClient.js` enables the page boundary only for loaded trainer content and wraps classroom panels in a separate update boundary. Only the trainer tab state setter uses startTransition. Unsaved-note confirmation, URL/history updates and attendance fetch behavior remain in the existing handlers. The tab boundary has no changing key, preserving existing Radix mount behavior.
4. `client/src/app/trainer/forms/[id]/TrainerFormDetailClient.js` applies the same update boundary to Visualize, Explore and JSON. Search, response data and form actions retain their existing behavior.
5. `client/src/app/globals.css` defines the named 160ms opacity transitions, stationary root chrome, pointer pass-through and reduced-motion/visible-keyboard-focus overrides. Existing unrelated page transition selectors are preserved.

| Before | After | Why |
| --- | --- | --- |
| Trainer route content swaps immediately | Named page content crossfades | Connects navigation without a full-screen slide |
| Classroom and form tabs swap abruptly | Independent content crossfades | Keeps navigation visually anchored |
| No trainer transition preference handling | Static reduced-motion and visible-focus transitions | Keeps keyboard use and motion preferences comfortable |

## Verification

- Full client lint: passed with zero errors and nine pre-existing warnings.
- Initial production build including page and classroom boundaries: passed.
- Final production build including form tabs: passed (compilation, TypeScript, static generation and build traces).
- Isolated local Next.js fixture used the actual shared page component and transition CSS, the installed Next/React runtime, and Radix tab primitives. Browser transition-ready promises resolved for a pointer tab change, arrow-key selection and Next Link route navigation. Selected panels and the destination page rendered correctly, and the tab query updated. This verifies the integration pattern, not authenticated application data.
- `git diff --check`: passed.
- Browser Back restored the fixture route, but did not produce an additional transition-ready signal; animated Back/Forward is not claimed on this version.
- Static review: existing links, focusable controls, dock target sizes, theme colors, authorization, handlers and responsive classes remain intact. Added content wrappers use min-width zero. CSS changes animate opacity only and add no network work or layout animation.
- Authenticated trainer/classroom flows, full responsive visual QA, reduced-motion OS emulation, rapid navigation and Safari/Firefox have not been exercised. Cold classroom loads retain their existing loading screen; the trainer page boundary mounts only after the role/data resolves, so that asynchronous reveal is not promised an animation. Nested contest report controls are outside this tab scope.

## Safety and rollback

No server, schema, credentials, logging or permission changes. No new dependency. Remove the new boundaries/layout, trainer state wrappers and trainer CSS block to roll back. No database or data rollback is required.

## Classroom card-to-header extension

The user approved a shared-element classroom transition. The following supersedes the earlier cold-classroom loading limitation for navigations initiated from the trainer dashboard.

### Review order

1. `ClassroomCardTransition.jsx` contains classroom-specific surface/title boundaries and a display-only React context. The context carries only ID/name across navigation. `useClassroomPreview` clears it after loading succeeds, fails or reaches an access gate; the provider clears it on unrelated routes. There is no storage, data cache or authorization inference.
2. Root `app/layout.js` places the provider around page children so it survives the dashboard-to-classroom route change. It adds no DOM wrapper.
3. `TrainerDashboardWorkspace.jsx` gives each classroom card and its heading unique matching identities. Room links capture display identity only for an unmodified same-window click. Attention links do not duplicate named surfaces. Existing visit tracking remains intact.
4. Classroom `loading.js` and `ClassroomOpening.jsx` provide the matching header during cold route loading. The same opening component is used during the existing client fetch. It labels the state as opening, displays no fetched content, and falls back to a generic accessible loader for direct visits.
5. `ClassroomLiveClient.js` wraps the loaded trainer header and title in the same identities. Student headers bypass the boundaries. Fetching, gates, errors and permission checks retain their existing logic. Trainer titles now wrap long names.
6. `globals.css` supplies a restrained 280ms shared movement, with static keyboard-focus and reduced-motion overrides. The existing page/tab fade stays intact.

| Before | After | Why |
| --- | --- | --- |
| Classroom card disappears into a spinner | Card surface and title morph into an opening header | Maintains identity even on cold navigation |
| Header has no shared identity | Matching classroom-specific surface/title names | Allows the title to move independently of its surrounding card |
| No display handoff across routes | Temporary ID/name cleared after loading | Enables motion without changing data fetching or permissions |

### Validation

- Full client lint passed: zero errors, nine existing warnings.
- Final production build passed, including compilation, TypeScript, static generation and traces.
- Diff whitespace check passed.
- Isolated Next.js browser fixture used the actual provider, shared boundary, opening component and CSS; it used a synthetic card and delayed destination with route loading and client loading. Browser animation keyframes confirmed the first transition paired both surface and title: surface width changed from 362px to 1232px, and title from 320x22px at (45,196) to 1232x37px at (24,91). The subsequent route-fallback-to-client-loader transition retained the same destination geometry. The loaded state displayed “Preview cleared”. These are fixture geometry measurements, not production layout measurements.
- Authenticated production data, full responsive layout, reduced-motion OS emulation, browser Back/Forward morphs and Safari/Firefox remain unverified. Direct visits have no originating card and use ordinary loading. No claim of a shared morph is made when a source card is absent from the rendered dashboard.

Rollback this extension by removing its provider, named boundaries and opening loader, restoring the prior client loader and deleting the classroom-morph CSS. Preserve the earlier page/tab work unless separately asked to revert it.
