"use client"
import { useEffect, useState } from 'react'
import { getActiveCustomContests } from '@/lib/action'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import CountdownTimer from '@/components/countdown-timer'

export default function CustomContestDisplay(){
  const [contests, setContests] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    (async ()=>{
      const data = await getActiveCustomContests()
      setContests(data)
      setLoading(false)
    })()
  },[])
  if(loading) return <div className='flex justify-center'><div className='animate-spin h-8 w-8 rounded-full border-t-2 border-b-2 border-red-600'/></div>
  if(contests.length === 0) return null
  return <div className='space-y-4'>
    {contests.map(c => <FeaturedContestCard key={c.id} contest={c} />)}
  </div>
}

function FeaturedContestCard({ contest }){
  const start = new Date(contest.start_time).getTime()
  const end = new Date(contest.end_time).getTime()
  const now = Date.now()
  const status = now < start ? 'UPCOMING' : (now <= end ? 'ONGOING' : 'ENDED')
  const normalizeUrl = (url) => {
    if(!url) return '#'
    return /^(https?:)?\/\//i.test(url) ? (url.startsWith('http') ? url : `https:${url}`) : `https://${url}`
  }
  return <Card className='border-2 border-red-500 shadow-md bg-gradient-to-r from-red-50 to-white dark:from-zinc-900 dark:to-zinc-900 relative overflow-hidden'>
    <div className='absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-red-400 via-transparent to-transparent' />
    <CardContent className='p-6 flex flex-col md:flex-row md:items-center gap-6'>
      <div className='flex-1 space-y-2'>
        <div className='flex items-center gap-2'>
          <span className='px-2 py-0.5 text-[10px] font-semibold rounded bg-red-600 text-white tracking-wide'>MCC</span>
          {contest.platform && <span className='text-xs uppercase text-zinc-500 dark:text-zinc-400'>{contest.platform}</span>}
          <span className={`text-xs font-semibold ${status==='UPCOMING'?'text-yellow-600': status==='ONGOING'? 'text-green-600':'text-zinc-500'}`}>{status}</span>
        </div>
        <h2 className='text-2xl font-bold tracking-tight'>{contest.name}</h2>
        {contest.description && <p className='text-sm text-zinc-600 dark:text-zinc-400 line-clamp-3'>{contest.description}</p>}
        <p className='text-xs text-zinc-500 dark:text-zinc-500'>{new Date(contest.start_time).toLocaleString()} - {new Date(contest.end_time).toLocaleString()}</p>
        {status==='UPCOMING' && <div><CountdownTimer targetTime={start} /></div>}
      </div>
      <div className='flex md:flex-col gap-3'>
        {contest.link && <a href={normalizeUrl(contest.link)} target='_blank' rel='noopener noreferrer'><Button className='bg-red-600 hover:bg-red-700 text-white'>Visit</Button></a>}
      </div>
    </CardContent>
  </Card>
}
