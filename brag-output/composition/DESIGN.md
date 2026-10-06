# MCC Trainer Brag — Design Direction

## Style Prompt
A quiet premium control-room film built from the trainer product's real visual system. The canvas is charcoal rather than pure black; SF Pro Display carries the operational voice; electric blue identifies the next useful action. Interface recreations should feel like enlarged, art-directed fragments of the working product—not browser screenshots and not generic SaaS cards. Motion is spatial and purposeful: information organizes, a classroom card becomes its destination, and a clear optical lens follows intent across the dock.

## Colors
- Canvas high: `#131315`
- Canvas low: `#0e0e10`
- Raised surface: `#1c1c1e`
- Primary text: `#e4e2e4`
- Secondary text: `#aeb8cc`
- Hairline: `rgba(255,255,255,0.10)`
- Accent / action: `#0a84ff`
- Positive performance: `#63d49a`
- Attention: `#f2b84b`

## Typography
- Display and interface: SF Pro Display, weights 400 / 500 / 700
- Data labels only: Geist Mono
- Display tracking is tight (`-0.035em`); data is tabular; body uses generous dark-canvas leading.

## Motion
- Entrances use confident deceleration and overlap by hierarchy.
- Primary transitions use a restrained focus pull or directional cover, never a jump cut.
- The classroom-card handoff and dock lens are the two signature motions.
- Holds are intentionally longer than entrances so every label remains readable.
- Bass-reactive depth was planned, but the bundled extraction helper could not run because this environment lacks NumPy and `uv`; cue-locked glow pulses provide the non-blocking fallback.

## What NOT to Do
- No neon cyberpunk, purple gradients, generic particles, or waveform graphics.
- No fake browser frame, device mockup, or six-panel dashboard wall.
- No gradient text.
- No unlabeled icon-only product navigation.
- No excessive glass layers, permanent white glows, or shadow-heavy cards.
- No generic claims such as “streamline your workflow.”
