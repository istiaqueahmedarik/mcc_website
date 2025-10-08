"use client"
import { useState, useTransition, useEffect } from 'react'
import { setParticipation } from '@/actions/team_collection'

// Format an absolute date in a concise, human, locale-aware style
function formatAbsolute(dt) {
  try {
    return new Date(dt).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    })
  } catch { return '' }
}

function computeRemaining(deadline) {
  if (!deadline) return { label: 'No deadline set', ms: null, passed: false }
  const now = Date.now()
  const target = new Date(deadline).getTime()
  if (isNaN(target)) return { label: 'Invalid deadline', ms: null, passed: false }
  const diff = target - now
  if (diff <= 0) return { label: 'Deadline passed', ms: diff, passed: true }
  const mins = Math.floor(diff / 60000)
  if (mins < 60) {
    return { label: `${mins}m remaining`, ms: diff, passed: false }
  }
  const hrs = Math.floor(mins / 60)
  const remM = mins % 60
  if (hrs < 24) {
    return { label: `${hrs}h ${remM}m remaining`, ms: diff, passed: false }
  }
  const days = Math.floor(hrs / 24)
  const remH = hrs % 24
  return { label: `${days}d ${remH}h remaining`, ms: diff, passed: false }
}

export function ParticipationToggle({ col }) {
  const [on, setOn] = useState(!!col.will_participate)
  const [pending, start] = useTransition()
  const [remaining, setRemaining] = useState(() => computeRemaining(col.phase1_deadline))

  useEffect(() => {
    setRemaining(computeRemaining(col.phase1_deadline))
    if (!col.phase1_deadline) return
    const id = setInterval(() => {
      setRemaining(computeRemaining(col.phase1_deadline))
    }, 60000) // update each minute
    return () => clearInterval(id)
  }, [col.phase1_deadline])

  function toggle() {
    start(async () => {
      setOn(o => !o)
      await setParticipation(col.id, !on)
    })
  }

  // Visual style inspired by Apple's subtle, soft surfaces & semantic color accents
  const pillBase = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide backdrop-blur border'
  let pillClass = 'bg-gradient-to-br from-neutral-100/70 to-neutral-200/60 dark:from-zinc-800/50 dark:to-zinc-900/40 border-neutral-200/70 dark:border-zinc-700/50 text-neutral-600 dark:text-zinc-300'
  if (remaining.passed) {
    pillClass = 'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-900/10 border-rose-200/70 dark:border-rose-800/40 text-rose-600 dark:text-rose-300'
  } else if (remaining.ms !== null && remaining.ms < 3600000) { // <1h
    pillClass = 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/10 border-amber-200/70 dark:border-amber-800/40 text-amber-600 dark:text-amber-300'
  } else if (remaining.ms !== null) {
    pillClass = 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/10 border-emerald-200/70 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-300'
  }

  return (
    <div className="flex flex-col gap-2 border border-border/60 rounded-2xl px-5 py-4 bg-white/65 dark:bg-zinc-900/40 backdrop-blur shadow-sm hover:shadow transition-all">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="font-semibold text-sm md:text-base tracking-tight truncate">{col.title || col.room_name || 'Collection'}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`${pillBase} ${pillClass}`}>{remaining.label}</span>
            {col.phase1_deadline && !remaining.passed && (
              <span className="text-[10px] text-muted-foreground font-medium">Ends • {formatAbsolute(col.phase1_deadline)}</span>
            )}
            {remaining.passed && (
              <span className="text-[10px] text-muted-foreground font-medium">Awaiting Phase 2 start</span>
            )}
          </div>
        </div>
        <button
          aria-label={on ? 'Disable participation' : 'Enable participation'}
          disabled={pending || remaining.passed}
          onClick={toggle}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 ${on
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 shadow-lg shadow-emerald-500/30 dark:shadow-emerald-600/20'
              : 'bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-700 dark:to-zinc-800 shadow-inner'
            } ${(pending || remaining.passed) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
        >
          <span className={`inline-block h-6 w-6 transform rounded-full bg-white dark:bg-zinc-100 shadow-md ring-1 ring-black/10 dark:ring-white/20 transition-all duration-300 ${on ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <div className="text-[11px] text-muted-foreground leading-snug">
        Toggle to confirm you intend to compete. Only opted-in users will appear in Phase 2 pairing.
      </div>
    </div>
  )
}
