# Hyperframes Composition Brief: MCC Trainer

## Objective
Create a 20-second launch-style brag video for the MCC Trainer feature, presenting it as a calm operational control room for competitive-programming instruction.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `/home/arik/mcc_website`
- Primary files read: `client/src/app/trainer/dashboard/TrainerDashboardClient.js`, `TrainerDashboardWorkspace.jsx`, `client/src/app/classroom/live/[id]/ClassroomLiveClient.js`, `TrainerClassroomDock.module.css`, `TrainerDockLens.jsx`, `client/src/components/ContestPerformance.jsx`, `client/src/app/globals.css`, `client/src/app/layout.js`
- Product name: MCC Trainer
- Tagline / strongest claim: “Your classrooms and work needing attention.”
- Key UI or visual moment to recreate: a trainer dashboard classroom card becoming the classroom header, followed by the floating labeled dock selecting Contests and revealing one first-positive recent-performance value.
- Copy that must appear verbatim:
  - Trainer dashboard
  - Your classrooms
  - Needs attention
  - Open classroom
  - Updates
  - Live
  - Topics
  - People
  - Contests
  - More
  - No live session
  - Manage

## Creative Direction
- Tone preset: polished
- Creative direction: quiet premium control-room film
- Interpretation: use confident hierarchy, readable holds, precise spatial continuity, restrained glass, and only a few blue accent moments.
- Angle: The interface absorbs the operational complexity of teaching so the trainer always sees the next useful action.
- Hook: “Teaching has enough moving parts.”
- Outro / punchline: “One calm place to teach.”
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals or generic particles
  - Neon cyberpunk styling, heavy gradients, or a fake browser chrome frame
  - Unrelated product redesign
  - Dense dashboard grids that cannot be read in motion

## Visual Identity
- Background: `#131315` / `#0e0e10`
- Text: `#e4e2e4`
- Accent: `#0a84ff`
- Display font: SF Pro Display using the project-provided local OTF assets where practical
- Body font: SF Pro Display; Geist Mono only for timing/data labels
- Visual references from the project: 16px dark trainer panels, summary chips, blue primary actions, card-to-header continuity, one clear moving dock lens, icon-over-text dock labels, and the `+count · 24h/48h/72h` report signal.

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Enough moving parts — 4.4s — hook plus three operational tokens organizing into one route.
2. Dashboard to classroom — 5.6s — real trainer dashboard recreation; click Open classroom; shared-element handoff.
3. The dock follows intent — 5.0s — real classroom header and labeled liquid-glass dock; select Contests.
4. Signal, not noise — 5.0s — report row resolves to `+3 · 24h`; MCC Trainer brand close.

## Audio
- Audio role: sparse professional support
- Audio arc: quiet establishment, slight lift through the classroom handoff, tactile dock selection, then a clean final confirmation and fade
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: approximately 0.22 volume, subtle lift in the middle, fade during 19-20s
- Music cue guidance: bundled preset copied from `.agents/skills/brag/assets/music/cues/`; favor 8.74s, 13.11s, and 17.47s strong cues, but protect reading time
- Audio-reactive treatment: planned subtle bass/RMS modulation of the blue route glow and dock-lens presence. The available extraction helper could not run because NumPy is missing and `uv` is unavailable, so the composition uses restrained cue-locked glow pulses as the documented non-blocking fallback; no visualizer motifs.
- Audio-coupled moments:
  - Dashboard Open classroom — visible cursor click and spatial handoff
  - Dock selection — lens settles on Contests
  - Performance payoff — `+3 · 24h`
- SFX selection guidance: use low-HF-risk `interface/click_003.ogg` for the click, `impact/impactSoft_medium_001.ogg` for a major handoff/payoff, and `interface/bong_001.ogg` or a restrained bell for the final mark
- SFX analysis guidance: `/home/arik/mcc_website/.agents/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: Hyperframes should choose filenames, timestamps, density, and volume based on the implemented animation.
- Audio files: copy chosen music and SFX into `brag-output/composition/assets/`

## Hyperframes Instructions
Use the current installed Hyperframes authoring and CLI guidance. The specifically named split skills `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`, and `hyperframes-keyframes` are not installed separately in this environment; their current composition, motion, audio-reactive, transition, and seek-safe rules are covered by the available `hyperframes` and `gsap` skills plus `hyperframes-cli`. Do not enter the generic Hyperframes intent interview.

Requirements:
- Show the real product UI and copy listed above.
- Keep all text readable in the final render.
- Keep the composition exactly 20 seconds.
- Include the planned music and restrained SFX.
- Use cue metadata as optional timing guidance; story and readability win.
- Mark the 8.74s, 13.11s, and 17.47s intended locks in code comments.
- Use local assets.
- Run `npx hyperframes check` as the brag gate before render; if this CLI version exposes the checks separately, run its lint/validate/inspect equivalents and record the compatibility result.
