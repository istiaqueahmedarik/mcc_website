# Trainer contest report performance

Status: implementation requested by the user on 2026-09-11.

Alignment refinement: center each performance value, including the empty em dash, beneath the Performance heading in both report modes.

Glass refinement: user requests the hover card match the existing dock's clear liquid glass. Reuse its SVG lens, 12% tint, 0.7px blur, 125% saturation, subtle reflections and layered shadows. Keep readable text halos and opaque reduced-transparency/high-contrast fallbacks; scope the material to this popover.

Add a Performance column to the trainer classroom contest report in both display modes. Show one +x value with its window label: choose 24h when positive, otherwise 48h, otherwise 72h. Show an em dash if none is positive. The hover, keyboard, and tap breakdown uses only this selected window. Source windows remain cumulative at report generation. Keep report ranking and score calculations unchanged.

Compute activity from original source contests before composite scoring, deduplicating accepted problems per contest. Preserve existing contest-time/upsolve opt-in boundaries. Manual solve corrections have no solve timestamp and must not manufacture activity. Missing or invalid timestamps must be disclosed; old reports request regeneration. Count source-reported solves only, with source snapshot freshness disclosed. No new provider requests, database schema, public report UI, or polling.

Design intent: trainers scanning a room for recent practice need a calm, compact signal beside identity. Domain: accepted problems, practice, contest rooms, roster, upsolves, report snapshots. Color world: paper/background, ink/foreground, muted pencil labels, existing green accepted-status accents, subtle border gray. Signature: one +x count and its most recent active window that reveal the source contests. Avoid charts, oversized metric cards, and decorative glass inside the table.

Component brief: values lead through semibold tabular numbers; a small muted label identifies the selected window. Existing semantic surfaces and system typography; 4px spacing grid; 44px touch targets. The popover is one elevated surface with bounded scrolling, wrapping contest names, visible focus, Escape/outside dismissal, and reduced motion. Reuse Radix and existing Button.

Validate window boundaries, duplicates, unknown/future timestamps, upsolves, manual overrides, and identity mapping. Run focused Bun tests, server bundle, targeted client lint, and inspect a rendered component at desktop/mobile sizes when available. Record the distinction between component checks and authenticated report QA.
