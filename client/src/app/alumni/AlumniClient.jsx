'use client'
import React from 'react'
import { Award, GraduationCap, Sparkles, Search } from 'lucide-react'
import MccLogo from '@/components/IconChanger/MccLogo'

function highlight(text, q){
  if(!q) return text
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if(idx === -1) return text
  return <>{text.slice(0,idx)}<span className='bg-[hsl(var(--alumni-gold)/0.25)]'>{text.slice(idx, idx+q.length)}</span>{text.slice(idx+q.length)}</>
}

function MemberCard({ m, query }){
  return (
    <div key={m.id || m.name} className={'alumni-batch-card group p-5 border-border/60 ' + (m.highlight ? 'ring-1 ring-[hsl(var(--alumni-gold))]/50':'') }>
      <div className='relative z-10 flex flex-col gap-3'>
        <div className='flex items-start gap-3'>
          {m.image_url && <img src={m.image_url} alt={m.name} className='w-12 h-12 rounded object-cover border border-border/60' />}
          <div className='flex flex-col'>
            <span className='font-semibold text-base md:text-lg leading-snug alumni-name group-hover:drop-shadow-sm transition-all'>{highlight(m.name, query)}</span>
            {m.role && <span className='text-[11px] tracking-wider text-muted-foreground/70 uppercase mt-1'>{highlight(m.role, query)}</span>}
          </div>
        </div>
        {m.now && <div className='text-xs md:text-sm text-muted-foreground leading-relaxed'>{highlight(m.now, query)}</div>}
      </div>
      <div className='absolute -top-12 -right-10 w-40 h-40 opacity-0 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none' style={{background:'radial-gradient(circle at center, hsl(var(--alumni-gold)/0.55), transparent 70%)'}} />
    </div>
  )
}

function BatchBlock({ batch, query }){
  const filteredMembers = batch.members.filter(m => {
    if(!query) return true
    const q = query.toLowerCase()
    return [m.name, m.role, m.now].some(v => v && v.toLowerCase().includes(q))
  })
  if(filteredMembers.length === 0) return null
  return (
    <div className='space-y-6'>
      <div className='flex flex-col md:flex-row md:items-end md:justify-between gap-4'>
        <div>
          <h2 className='text-2xl md:text-3xl font-bold tracking-wide flex items-center gap-3'>
            <GraduationCap className='h-7 w-7 text-[hsl(var(--alumni-gold))]' /> {highlight(batch.batch, query)}
          </h2>
          {batch.motto && <p className='text-xs md:text-sm text-muted-foreground mt-1 uppercase tracking-wider'>{highlight(batch.motto, query)}</p>}
        </div>
        <div className='flex items-center gap-2 text-[10px] tracking-widest font-semibold text-muted-foreground/70'>
          <Award className='h-4 w-4 text-[hsl(var(--alumni-gold))]' /> Celebrating Contributions
        </div>
      </div>
      <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6'>
        {filteredMembers.map(m => <MemberCard key={m.id || m.name} m={m} query={query} />)}
      </div>
    </div>
  )
}

function useDebounce(value, delay){
  const [d, setD] = React.useState(value)
  React.useEffect(()=>{ const id = setTimeout(()=>setD(value), delay); return ()=>clearTimeout(id) }, [value, delay])
  return d
}

export default function AlumniClient({ initialBatches, loadError }){
  const [query, setQuery] = React.useState('')
  const debounced = useDebounce(query, 200)
  const visible = React.useMemo(()=>{
    if(!debounced) return initialBatches
    const q = debounced.toLowerCase()
    return initialBatches.filter(b => {
      const inBatch = [b.batch, b.motto, String(b.year)].some(v => v && v.toLowerCase().includes(q))
      if(inBatch) return true
      return b.members.some(m => [m.name, m.role, m.now].some(v => v && v.toLowerCase().includes(q)))
    })
  }, [initialBatches, debounced])
  return (
    <div className='relative w-full flex flex-col items-center pb-32'>
      <section className='alumni-hero relative w-full overflow-hidden pt-28 pb-16 flex flex-col items-center text-center'>
        <div className='absolute inset-0 pointer-events-none [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]' />
        <div className='relative flex flex-col items-center gap-6 px-4 max-w-4xl'>
          <div className='flex items-center gap-3 text-xs uppercase tracking-[0.3em] font-medium text-muted-foreground'>
            <span className='inline-flex items-center gap-1'><Sparkles className='h-3 w-3 text-[hsl(var(--alumni-gold))]' /> Honor Roll</span>
            <span className='h-px w-8 bg-gradient-to-r from-transparent via-border to-transparent' />
            <span>Legacy</span>
          </div>
          <h1 className='text-4xl md:text-6xl font-bold leading-tight'>
            <span className='alumni-name'>Our Distinguished Alumni</span>
          </h1>
            <p className='text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed'>
              A tribute to the minds who built, guided & elevated this community. Their journeys continue to inspire every new cohort of builders & problem solvers.
            </p>
          <div className='w-full max-w-md mx-auto relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder='Search by name, role, position, batch, motto...' className='w-full pl-9 pr-3 py-2 rounded-md border border-border/60 bg-background/60 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--alumni-gold))]' />
          </div>
          {loadError && <div className='text-xs text-red-500'>Failed to load alumni ({loadError})</div>}
        </div>
        <div className='absolute -bottom-24 left-1/2 -translate-x-1/2 w-[110%] h-48 bg-gradient-to-t from-background to-transparent pointer-events-none' />
      </section>
      <section className='relative w-full max-w-7xl px-4 mt-10'>
        <div className='grid gap-16'>
          {visible.map(b => <BatchBlock key={b.id || b.batch} batch={b} query={debounced} />)}
          {visible.length === 0 && <div className='text-center text-sm text-muted-foreground py-20'>No matches</div>}
        </div>
      </section>
      <section className='relative mt-28 w-full max-w-5xl px-4'>
        <div className='relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-[hsl(var(--alumni-royal-fade)/0.8)] via-background to-background p-10 flex flex-col md:flex-row items-center gap-8'>
          <div className='absolute inset-0 pointer-events-none [mask-image:radial-gradient(circle_at_70%_30%,black,transparent_70%)]'>
            <div className='absolute right-10 top-10 w-56 h-56 rounded-full bg-[hsl(var(--alumni-gold)/0.12)] blur-2xl' />
          </div>
          <div className='relative flex-1 space-y-4'>
            <h3 className='text-2xl md:text-3xl font-bold leading-tight'>Inspiring the Next Generation</h3>
            <p className='text-sm md:text-base text-muted-foreground max-w-lg'>Have a story or update to share? Help us keep the legacy timeline alive & motivate future innovators.</p>
            <button className='px-5 py-2 rounded-md text-sm font-medium bg-[hsl(var(--alumni-gold))] text-black hover:brightness-110 transition'>Contact us</button>
          </div>
          <div className='relative'>
            <MccLogo w={160} h={160} />
          </div>
        </div>
      </section>
    </div>
  )
}
