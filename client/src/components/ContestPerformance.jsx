"use client"

import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import TrainerGlassFilter from "@/app/classroom/live/[id]/TrainerGlassFilter"
import styles from "./ContestPerformance.module.css"

function formatTime(value) {
  const time = new Date(value)
  return Number.isFinite(time.getTime()) ? time.toLocaleString() : "Unavailable"
}

export default function ContestPerformance({ performance, name }) {
  const [open, setOpen] = useState(false)
  const glassId = useId()
  const [refractiveGlass, setRefractiveGlass] = useState(false)
  useEffect(() => {
    // Match the dock: SVG backdrop refraction in Chromium, CSS glass elsewhere.
    setRefractiveGlass(/(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent))
  }, [])
  const timer = useRef(null)
  const pinned = useRef(false)
  const hover = useRef(false)
  useEffect(() => () => clearTimeout(timer.current), [])
  const window = [24, 48, 72]
    .map((hours) => performance?.windows?.find((entry) => entry.hours === hours))
    .find((entry) => entry?.count > 0)
  const hours = window?.hours || 72
  const incomplete = performance?.incomplete
  const cancel = () => clearTimeout(timer.current)
  const leave = () => {
    cancel()
    if (!pinned.current) timer.current = setTimeout(() => setOpen(false), 180)
  }

  return (
    <Popover open={open} onOpenChange={(next) => { cancel(); setOpen(next); if (!next) pinned.current = false }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 min-w-[96px] gap-2 rounded-lg px-3 font-semibold tabular-nums focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[0.97] motion-reduce:transition-none"
          aria-label={`${name}: ${window ? `+${window.count} solves in the last ${hours} hours` : performance ? 'No recorded recent solves' : 'Performance unavailable'}${incomplete ? ', incomplete timing data' : ''}. Show contest breakdown`}
          onPointerEnter={(event) => {
            if (event.pointerType !== "mouse") return
            cancel()
            hover.current = true
            timer.current = setTimeout(() => setOpen(true), 200)
          }}
          onPointerLeave={leave}
          onClick={(event) => {
            event.preventDefault()
            cancel()
            hover.current = false
            pinned.current = !pinned.current
            setOpen(pinned.current)
          }}
        >
          <span className={cn("text-muted-foreground", window && "text-emerald-700 dark:text-emerald-400")}>
            {window ? `+${window.count}` : "—"}
            {incomplete && window && <span aria-hidden="true" className="text-muted-foreground">*</span>}
          </span>
          {window && <span className="text-[10px] font-normal text-muted-foreground">{hours}h</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        aria-label={`Recent solves for ${name}`}
        style={refractiveGlass ? { "--performance-refraction": `url("#${glassId}")` } : undefined}
        className={cn(styles.glass, "max-h-[var(--radix-popover-content-available-height)] w-[320px] max-w-[calc(100vw-24px)] origin-[var(--radix-popover-content-transform-origin)] overflow-y-auto overscroll-contain p-1.5 data-[state=open]:animate-none data-[state=closed]:animate-none")}
        onPointerEnter={cancel}
        onPointerLeave={leave}
        onFocusCapture={() => { pinned.current = true; cancel() }}
        onOpenAutoFocus={(event) => { if (hover.current) event.preventDefault() }}
        onCloseAutoFocus={(event) => { if (hover.current) event.preventDefault() }}
      >
        {refractiveGlass && <TrainerGlassFilter id={glassId} />}
        <div className={styles.content}>
        <p className="truncate text-sm font-semibold" title={name}>{name}</p>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">Most recent active window</p>
        {!performance ? (
          <p className="text-sm text-muted-foreground">Regenerate this report to see recent solves.</p>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>Last {hours} hours</span>
              <span className="text-lg font-semibold tabular-nums">{incomplete && !window?.count ? "—" : `+${window?.count || 0}`}</span>
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto overscroll-contain" tabIndex={0} role="region" aria-label="Solves by contest">
              {window?.contests?.length ? window.contests.map((contest) => (
                <div key={contest.contestId} className="flex items-start justify-between gap-4 py-2 text-sm">
                  <span className="min-w-0 break-words">{contest.title}</span>
                  <span className="shrink-0 font-medium tabular-nums text-emerald-700 dark:text-emerald-400">+{contest.count}</span>
                </div>
              )) : <p className="py-2 text-xs text-muted-foreground">{incomplete ? "No timestamped solves in this window." : "No new solves in the fetched data for this window."}</p>}
            </div>
            {incomplete && <p className="mt-3 text-xs text-muted-foreground">* Partial data: some solve times or contest sources are unavailable. Manual corrections are not timed activity.</p>}
            <p className="mt-3 text-xs text-muted-foreground">As of {formatTime(performance.asOf)}. Counts use fetched contest data. Fetch sources and regenerate to update.</p>
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer rounded py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Source freshness</summary>
              <div className="max-h-32 overflow-y-auto overscroll-contain">
                {performance.sources?.map((source) => <p key={source.contestId} className="break-words py-1">{source.title} · {source.fetchedAt ? formatTime(source.fetchedAt) : "Fetch time unavailable"}</p>)}
              </div>
            </details>
          </>
        )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
