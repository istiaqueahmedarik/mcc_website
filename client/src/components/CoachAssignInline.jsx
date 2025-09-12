'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { UserPlus, Search } from 'lucide-react'

export default function CoachAssignInline({ teamTitle, initialCoach, collectionId }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [coach, setCoach] = useState(initialCoach || '')
  const [pending, setPending] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const { searchUsersClient } = await import('@/actions/team_collection')
      const res = await searchUsersClient(q.trim())
      setResults(res?.result || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { search(query) }, 400)
    return () => clearTimeout(t)
  }, [query, search])

  async function saveCoach(userIdentifier) {
    setPending(true)
    const tid = toast.loading('Assigning coach...')
    try {
      const { adminAssignCoach } = await import('@/actions/team_collection')
      await adminAssignCoach(collectionId, teamTitle, userIdentifier)
      setCoach(userIdentifier)
      setOpen(false)
      // Refresh server component page so coach label in list updates
      router.refresh()
      toast.success(userIdentifier ? 'Coach assigned' : 'Coach removed', { id: tid })
    } catch (e){
      console.error(e)
      toast.error('Failed to assign coach', { id: tid })
    } finally { setPending(false) }
  }

  const visibleResults = results || []

  function handleKeyDown(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => {
        const next = Math.min((h < 0 ? -1 : h) + 1, visibleResults.length - 1)
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => {
        const next = Math.max(h - 1, 0)
        return next
      })
    } else if (e.key === 'Enter') {
      if (highlighted >= 0 && highlighted < visibleResults.length) {
        e.preventDefault()
        const r = visibleResults[highlighted]
        saveCoach(r.vjudge_id || r.email)
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  useEffect(()=>{
    if (!open) { setHighlighted(-1) }
  }, [open])

  return (
  <div className="relative w-64">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setOpen(o=>!o)} disabled={pending}>
          <UserPlus className="h-4 w-4" /> {coach ? 'Coach: '+coach : 'Assign Coach'}
        </Button>
        {coach && (
          <Button type="button" variant="ghost" size="sm" onClick={() => saveCoach('')} disabled={pending}>Remove</Button>
        )}
      </div>
      {open && (
        <div
          className="absolute z-[200] mt-2 w-80 rounded-3xl border bg-background/70 backdrop-blur-xl border-border/40 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.18)] p-4 space-y-4 ring-1 ring-border/30 transition-all duration-200 animate-in fade-in-0 zoom-in-95"
          role="dialog"
          aria-label="Assign Coach"
        >
          <div className="relative group">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
              <Search className="h-4 w-4" />
            </span>
            <input
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search name / email / vjudge"
              className="w-full rounded-full bg-gradient-to-br from-background/60 to-background/40 border border-border/40 px-9 pr-5 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/60 focus:border-transparent transition-shadow placeholder:text-muted-foreground/50 shadow-inner"
              aria-autocomplete="list"
              aria-expanded={open}
              aria-controls="coach-result-list"
            />
          </div>
          <div
            id="coach-result-list"
            className="max-h-60 overflow-auto thin-scrollbar pr-1 -mr-1"
            role="listbox"
            aria-label="Search results"
          >
            {loading && (
              <div className="text-xs text-muted-foreground px-2 py-2 animate-pulse">Searching…</div>
            )}
            {!loading && visibleResults.map((r, idx) => {
              const active = idx === highlighted
              return (
                <button
                  key={r.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseEnter={()=>setHighlighted(idx)}
                  onMouseLeave={()=>setHighlighted(-1)}
                  onClick={()=>saveCoach(r.vjudge_id || r.email)}
                  className={
                    'w-full text-left px-3 py-2 rounded-2xl text-sm flex flex-col gap-0.5 transition-colors border border-transparent ' +
                    (active ? 'bg-accent/70 text-accent-foreground shadow-sm' : 'hover:bg-accent/40')
                  }
                >
                  <span className="font-medium leading-none tracking-tight">{r.full_name || r.email}</span>
                  <span className="text-[10px] uppercase text-muted-foreground/70 tracking-wide">{r.email}{r.vjudge_id ? ' • '+r.vjudge_id: ''}</span>
                </button>
              )
            })}
            {!loading && query && visibleResults.length===0 && (
              <div className="text-xs text-muted-foreground/70 px-2 py-2">No matches</div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={()=>setOpen(false)}
              disabled={pending}
              className="rounded-full px-5"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
