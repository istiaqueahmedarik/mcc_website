"use client"
import { useEffect, useState } from 'react'

function compute(iso){
  if(!iso) return { label: 'No deadline', passed: false, ms: null }
  const target = new Date(iso).getTime()
  if(isNaN(target)) return { label: 'Invalid deadline', passed: false, ms: null }
  const now = Date.now()
  const diff = target - now
  if(diff <= 0) return { label: 'Deadline passed', passed: true, ms: diff }
  const totalSec = Math.floor(diff/1000)
  const days = Math.floor(totalSec/86400)
  const hours = Math.floor((totalSec % 86400)/3600)
  const mins = Math.floor((totalSec % 3600)/60)
  if(days > 0) return { label: `${days}d ${hours}h ${mins}m remaining`, passed: false, ms: diff }
  if(hours > 0) return { label: `${hours}h ${mins}m remaining`, passed: false, ms: diff }
  return { label: `${mins}m remaining`, passed: false, ms: diff }
}

export function DeadlineCountdown({ iso, compact=false, mode='generic' }){
  const [state, setState] = useState(()=>compute(iso))
  useEffect(()=>{
    setState(compute(iso))
    if(!iso) return
    const fast = setInterval(()=> setState(compute(iso)), 60000)
    return ()=> clearInterval(fast)
  }, [iso])

  const base = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium tracking-wide border backdrop-blur'
  let style = 'bg-gradient-to-br from-neutral-100/70 to-neutral-200/60 dark:from-zinc-800/50 dark:to-zinc-900/50 border-neutral-200/70 dark:border-zinc-700/50 text-neutral-700 dark:text-zinc-200'
  if(state.passed) style = 'bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-900/10 border-rose-200/70 dark:border-rose-800/40 text-rose-600 dark:text-rose-300'
  else if(state.ms !== null && state.ms < 3600000) style = 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-900/10 border-amber-200/70 dark:border-amber-800/40 text-amber-700 dark:text-amber-300'
  else if(state.ms !== null) style = 'bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/10 border-emerald-200/70 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300'
  let visibleLabel = state.label
  if(state.passed && mode==='participation') visibleLabel = 'Participation window closed'
  if(!iso && mode==='participation') visibleLabel = 'No participation deadline'

  return (
    <span className={`${base} ${style}`} aria-live="polite" title={iso ? new Date(iso).toLocaleString() : undefined}>
      {visibleLabel}
    </span>
  )
}
