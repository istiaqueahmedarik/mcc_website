# Design System: MIST Computer Club (`mcc_website`)

This file is the canonical design specification for `mcc_website` — usable both by coding agents implementing UI in `client/` and by design generation tools such as Google Stitch. Every token, class, and interaction rule below reflects the active codebase (`client/src/app/globals.css`, `client/tailwind.config.js`, `client/src/app/layout.js`, `client/components.json`) and approved project decisions (`docs/knowledge-base/hci-rules.md`, `docs/knowledge-base/decisions.md`).

For any new page, new product surface, reusable component, or major redesign, combine this specification with Vercel's Web Interface Guidelines (`https://vercel.com/design/guidelines`) and the repo design skill stack (`interface-design`, `.agents/skills/apple-design/SKILL.md`, `.agents/skills/emil-design-eng/SKILL.md`).

---

## 1. Visual Theme & Atmosphere

- **Character:** Calm, restrained, Apple-inspired operational surfaces built for MIST Computer Club's competitive programming workflows (forms, rosters, live classrooms, contest standings, and trainer command centers).
- **Density:** Daily App Balanced (5–6/10) for portals, forms, and lists; crisp tabular density (7–8/10) for contest matrices and live classroom tracking.
- **Variance & Restraint:** Structured asymmetry where workspace comparison calls for it (bounded sidebar rail + main detail pane), predictable clarity on forms and registration, zero decorative clutter.
- **Motion:** Quiet, purposeful micro-motion (`160ms` tactile feedback, restrained named view transitions) rather than perpetual hero spectacle.
- **Theme Support:** System-aware Light and Dark themes (`ThemeProvider` in `client/src/app/layout.js` with `attribute="class"`, `defaultTheme="system"`, `enableSystem`), plus a scoped Obsidian dark theme on `.trainer-dashboard-page`.

---

## 2. Color Palette & Semantic Tokens

Use semantic Tailwind / CSS variable tokens (`hsl(var(--...))`) defined in `client/src/app/globals.css` and mapped in `client/tailwind.config.js` rather than hardcoding raw colors in components.

### Light Theme (`:root` Default)

| Descriptive Name | Hex | CSS Variable / HSL | Functional Role |
| --- | --- | --- | --- |
| Cool Paper Canvas | `#F9FAFB` | `--background` (`210 24% 98%`) | Primary page canvas |
| Pure Card Surface | `#FFFFFF` | `--card` / `--popover` (`0 0% 100%`) | Elevated panels, forms, dialogs, tables |
| Deep Ink | `#101623` | `--foreground` (`222 38% 10%`) | Primary copy and headings |
| Slate Muted | `#566071` | `--muted-foreground` (`218 14% 39%`) | Metadata, timestamps, helper copy |
| Soft Cloud | `#EBF0F4` | `--secondary` (`210 28% 94%`) | Secondary controls, subtle tint washes |
| Muted Wash | `#E9EDF1` | `--muted` (`214 24% 93%`) | Subtle surface fills, workspace backdrops (`hsl(var(--muted) / 0.25)`) |
| Hairline Border | `#CFD5DE` | `--border` / `--input` (`214 18% 84%`) | 1px structural dividers and form inputs |
| MCC Cobalt Primary | `#174A8C` | `--primary` (`214 72% 32%`) | Primary CTAs, active navigation, key emphasis |
| Crisp Snow Ink | `#F8FAFC` | `--primary-foreground` (`210 40% 98%`) | Text/icons on `--primary` controls |
| Cobalt Focus Ring | `#1B58A7` | `--ring` (`214 72% 38%`) | Visible keyboard `:focus-visible` ring |
| Quiet Teal Accent | `#DCEFEF` | `--accent` (`178 38% 90%`) | Hover/selection fill (paired with `--accent-foreground` `#154447` / `184 55% 18%`) |
| Alert Red | `#EF4444` | `--destructive` (`0 84.2% 60.2%`) | Destructive button fill and light-mode error indicators |
| Status Success Text | `#1B6A44` | `.trainer-status-success` (`151 60% 26%`) | Positive badge/chip text on `10%` green tint |
| Status Warning Text | `#8B570E` | `.trainer-status-warning` (`35 82% 30%`) | Pending/attention badge text on `10%` amber tint |
| Status Danger Text | `#9C1C1C` | `.trainer-status-danger` (`0 70% 36%`) | Error/alert badge text on `10%` red tint |

### Dark Theme (`.dark`)

| Descriptive Name | Hex | CSS Variable / HSL | Functional Role |
| --- | --- | --- | --- |
| Deep Slate Canvas | `#0E1016` | `--background` (`222 23% 7%`) | Primary dark canvas (never pure `#000000`) |
| Elevated Dark Surface | `#14171F` | `--card` / `--popover` (`222 20% 10%`) | Cards, dialogs, and popovers |
| Crisp Mist Ink | `#F2F5F7` | `--foreground` (`210 24% 96%`) | Primary dark-mode text |
| Cool Ash Muted | `#A3ABB8` | `--muted-foreground` (`216 13% 68%`) | Secondary labels and metadata |
| Graphite Fill | `#242932` / `#22272F` | `--secondary` (`220 16% 17%`) / `--muted` (`220 16% 16%`) | Secondary controls and muted containers |
| Subtle Dark Border | `#323843` | `--border` / `--input` (`220 14% 23%`) | 1px dark structural hairlines and inputs |
| Luminous Sky Primary | `#31B4ED` | `--primary` / `--ring` (`198 84% 56%`) | Primary CTAs, active accents, focus ring (with `--primary-foreground` `#0B111E` / `222 47% 8%`) |
| Deep Teal Accent | `#1A4239` | `--accent` (`166 44% 18%`) | Hover/selection fill (with `--accent-foreground` `#CDF4EB` / `166 65% 88%`) |
| Destructive Fill | `#7F1D1D` | `--destructive` (`0 62.8% 30.6%`) | Destructive button/badge background fill only |
| Readable Dark Error Text | `#F47B7B` | `--destructive` override (`0 85% 72%`) | High-contrast inline validation/error copy on dark surfaces |
| Status Success Text | `#80E5B4` | `.trainer-status-success` (`151 66% 70%`) | Positive badge text in dark mode |
| Status Warning Text | `#F6C76F` | `.trainer-status-warning` (`39 88% 70%`) | Warning badge text in dark mode |
| Status Danger Text | `#F27D7D` | `.trainer-status-danger` (`0 82% 72%`) | Error/danger badge text in dark mode |

### Trainer Dashboard Scoped Dark Theme (`.trainer-dashboard-page`)

- **Obsidian Canvas:** `#131315` (`--background: 240 5% 8%`) fading to `#0E0E10`
- **Primary Text:** `#E4E2E4` (`--foreground: 300 3% 89%`)
- **Translucent Panel Surface:** `#1D1D20` base (`--card: 240 4% 12%`, `--trainer-surface: rgba(28, 28, 30, 0.82)`) with `backdrop-filter: blur(20px) saturate(150%)`
- **Apple System Blue:** `#0A85FF` (`--primary` / `--ring: 210 100% 52%`)
- **Hairline Dividers:** `rgba(255, 255, 255, 0.10)` and `rgba(255, 255, 255, 0.07)`

> **Critical Dark-Mode Contrast Pitfall:** Global `.dark` sets `--destructive` to dark red `#7F1D1D` (designed for button backgrounds, not foreground text). Using `text-destructive` on `#0E1016` or `#14171F` fails legibility. Always scope a readable dark error override (`:global(.dark) .page { --destructive: 0 85% 72%; }`, as in `client/src/app/register/[slug]/registration.module.css`) or use `.trainer-status-danger` (`#F27D7D`).

> **Legacy Scoped Palettes (Do Not Reuse on New Work):** `--profile-*` violet/indigo tokens (`263°–289°`), `.alumni-*` gold/royal gradients (`45°` / `226°`), and `.liquid-bg` / `.liquid-glass` page wrappers belong strictly to existing legacy routes. New operational, admin, classroom, and form UI must use the neutral semantic palette above.

---

## 3. Typography Architecture

- **Primary Sans (`font-sans`):** Local `SF Pro Display` (`--font-sf-pro-display`, `display: "swap"`, `preload: false` in `client/src/app/layout.js`), falling back to `ui-sans-serif, system-ui, sans-serif`.
- **Monospace (`font-mono`):** Local `Geist Mono` (`--font-geist-mono` from `GeistMonoVF.woff`). Use `font-mono` with `tabular-nums` for contest scores, solve/penalty cells, rank columns, timestamps, handles, contest IDs, slugs, and code blocks.
- **Hierarchy:** Communicate hierarchy through font weight (`500`/`600`/`700`), spacing, and `--foreground` vs `--muted-foreground` contrast rather than oversized shouting headers.
- **Readability & Ergonomics:**
  - Keep prose blocks comfortable (`max-w-[65ch]`) and avoid cramped multi-line wraps.
  - Under `max-width: 640px`, keep `<input>`, `<textarea>`, and `<select>` at `font-size: 16px` (`1rem`) to prevent iOS Safari auto-zoom on focus (matching `forms.module.css`, `registration.module.css`, and `.trainer-select`).

---

## 4. Surfaces, Materials & Elevation

- **Neutral Surface Baseline:** Default panels use solid `--card` fill, a 1px hairline border (`hsl(var(--border))`), and minimal shadow (`0 1px 3px rgb(0 0 0 / 0.04)` or `--trainer-shadow`). Do not stack noisy shadows or multi-stop gradients on content cards.
- **Border Radius Scale:** Root `--radius: 0.375rem` (`6px`). Tailwind maps `rounded-sm` (`2px`), `rounded-md` (`4px`), `rounded-lg` (`6px`); workspace `.trainer-panel` uses `0.5rem` (`8px`), `.trainer-dashboard-page .trainer-panel` uses `1rem` (`16px`), and the floating trainer `.dock` uses `1.75rem` (`28px`).
- **Translucency Policy:** Limit `backdrop-filter` glass strictly to floating navigation chrome and utility bars (`.glassBar`, `.trainer-command-bar`, `.trainer-floating-help`, and trainer classroom `.dock` in `TrainerClassroomDock.module.css`). Never apply decorative glass or background gradients to standard forms, registration pages, or data tables.
- **Required Accessibility Fallbacks:** Every translucent surface must include:
  - `@supports not (backdrop-filter: blur(1px))` opaque fallback
  - `@media (prefers-reduced-transparency: reduce)` solid `--card` / `--background` fallback
  - `@media (prefers-contrast: more)` crisp border + `box-shadow: none`
  - `@media (forced-colors: active)` `1px solid CanvasText; box-shadow: none`

---

## 5. Component Primitives & Interaction Patterns

Build with existing `client/src/components/ui/` primitives (shadcn `new-york` style, `neutral` base, `lucide-react` icons, `sonner` toasts) instead of inventing parallel UI wrappers.

- **Buttons & Hit Targets:**
  - One primary action (`variant="default"`) per section/dialog; pair with `outline`, `secondary`, or `ghost`.
  - Tactile active feedback: `transform: scale(0.98)` to `scale(0.985)` (`160ms cubic-bezier(0.23, 1, 0.32, 1)`), disabled when `:focus-visible` conflicts or `prefers-reduced-motion: reduce`.
  - Interactive workspace controls require `touch-action: manipulation` and a minimum `44px` hit target (`min-height: 44px`, excluding compact `role="checkbox"` indicators).
- **Forms, Inputs & Dialogs:**
  - Place labels above fields, optional helper text beside/under label, and inline error copy directly below the field (`scroll-margin-block` set high enough that sticky bars or bottom docks never obscure focused inputs).
  - Controlled text inputs must preserve unfinished whitespace while typing; normalize only on save/submit.
  - Registration/submission flows use a single ordinary submit button guarded against duplicate in-flight clicks and preserving entered drafts/agreements on failed requests.
  - Dialogs must declare explicit responsive widths (never rely solely on implicit max-width) and confirm destructive actions behind an overflow menu or secondary confirmation dialog rather than exposed red buttons in every table row.
- **Tables & Contest Matrices:**
  - Wrap wide tables in bounded scroll containers (`overflow: auto; overscroll-behavior: contain`) with sticky headers/participant columns for multi-member matrices.
  - Trainer report views preserve the Compact/Extended mode toggle (`client/src/components/ReportTable.js`), numeric `tabular-nums`, and aligned provider handle links.
- **Loading, Empty & Error States:**
  - Use layout-matching `Skeleton` (`client/src/components/ui/skeleton.jsx`) placeholders rather than jarring spinners where layout geometry is known.
  - Empty states use dashed `.trainer-empty` framing or clean composed guidance explaining how to populate or clear filters.
  - Error states must distinguish authorization/access issues from transport/offline issues, preserve last-known valid data on transient refresh failures, and never expose raw provider secrets, cookies, or stack traces.

---

## 6. Layout & Operational HCI Rules

Derived from `docs/knowledge-base/hci-rules.md` and approved UX reviews:

- **Container & Breakpoint Rules:**
  - Trainer dashboard content shell: `max-w-[1440px]`; trainer classroom interior shell: `max-w-[1800px]` (student classroom preserves existing width).
  - Multi-column layouts collapse cleanly to single column below `768px`; zero page-level horizontal overflow on mobile (`320px–390px`) through desktop/ultra-wide.
- **Navigation Priority:** Keep the top 4–5 frequent classroom destinations visible and place secondary destinations behind a clearly labeled `More` menu. Context menus (right-click/long-press) are accelerators only — never the sole discovery path.
- **Progressive Disclosure:** People/roster lists show one primary category at a time (Students or Groups; Groups or Classmates) with Add/CSV/Edit workflows in focused dialogs. Contest views keep a bounded `280px` left room rail on desktop (`Name A–Z` client-only default sort), stacking cleanly above the report workspace on mobile.
- **Calm Operational Language & Focus:**
  - Avoid pulsing badges for normal pending queues and omit counts unless the count is needed for a decision.
  - Keep `Updates` (attention/read state), `Threads` (conversation), and `Settings` (preferences/integrations) conceptually separate.
  - Use plain user language (`Form response filter`, `Registered students`) instead of internal terminology (`cohort`, `revision`).
  - Surface truthful live states (`Live`, `Auto-refresh`, `Offline`, `Access changed` or explicit IDE monitoring notice) without faking live status from an unverified HTTP connection.

---

## 7. Motion, Transitions & GPU Restraint

- **Standard Timing & Properties:** `160ms cubic-bezier(0.23, 1, 0.32, 1)` on compositor properties (`transform`, `opacity`) and colors. Never animate layout properties (`top`, `left`, `width`, `height`).
- **Named View Transitions (`experimental.viewTransition: true`):**
  - `.trainer-fade` (`160ms ease-out`) and `.classroom-morph` (`280ms cubic-bezier(0.22, 1, 0.36, 1)`) in `client/src/app/globals.css`.
  - Keep `:focus-visible` keyboard navigation immediate (`animation: none`) and ensure shared transition names exist in the loading boundary as well as the loaded header.
- **GPU / WebGL Effects (`TrainerDockLens.jsx`, `LiveReportsGallery.jsx`):**
  - Prototype complex shader work on an unlinked route before production integration.
  - Keep semantic HTML/Radix controls outside the `<canvas>`, mark canvas/backdrop layers `pointer-events: none`, cap pixel ratio (DPR), render on demand and sleep at rest, dispose GPU buffers/textures on unmount, and provide full CSS fallbacks for WebGL failure, `prefers-reduced-transparency`, `prefers-contrast`, and `forced-colors`.
  - MIT Heroicons Animated (`client/src/components/ui/heroicons-animated/`) may animate on pointer hover only when reduced motion is off.
- **Reduced Motion:** Honor `@media (prefers-reduced-motion: reduce)` everywhere — disable view transitions, spring/hover icon motion, and active scale transforms (`transform: none`).

---

## 8. Accessibility & Pre-Handoff Verification Checklist

Before concluding any UI change, verify against Vercel's Web Interface Guidelines:

1. Keyboard navigation reaches every control with clear `:focus-visible` outline and dialog focus management/restoration.
2. Interactive controls meet `>= 44px` hit targets where appropriate and use semantic `<button>` vs `<Link>` (`ProgressLink`).
3. Search, filter, tab, and sort state stays URL-backed (`?q=`, `?tab=`, `?filter=`, `?sort=`, `?room=`) when deep-linking or reload recovery matters.
4. Loading, empty, error, offline, and permission-denied states are all handled without CLS.
5. Verified across Light mode, Dark mode (especially inline error copy), mobile (`~375px` width with zero horizontal page scroll), desktop (`1440px+`), `prefers-reduced-motion`, `prefers-reduced-transparency`, and `forced-colors`.

---

## 9. Anti-Patterns (Banned on New Surfaces)

- No decorative gradients, neon glow shadows, or purple/indigo hero washes on operational, admin, classroom, or form pages.
- No `Inter`, no generic serif fonts (`Times New Roman`, `Georgia`, `Garamond`), and no pure black (`#000000`) backgrounds.
- No un-overridden dark-mode `text-destructive` (`#7F1D1D`) on dark backgrounds.
- No emojis in operational UI chrome; no pulsing status dots for routine queues; no hidden right-click-only commands.
- No `h-screen` on mobile full-height views where browser chrome shifts (`min-h-screen` or `min-h-[100dvh]` instead).
- No internal implementation jargon (`cohort`, `revision`) or fake placeholder metrics (`99.99%`) in user-facing copy.
- No retroactive redesign of unrelated legacy pages unless authorized by a separate approved RSD.
