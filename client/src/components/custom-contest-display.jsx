"use client"
import CountdownTimer from '@/components/countdown-timer'
import { PaginationControls } from '@/components/pagination-controls'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getActiveCustomContests } from '@/lib/action'
import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function CustomContestDisplay(){
  const [contests, setContests] = useState([])
  const [filteredContests, setFilteredContests] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(6)

  useEffect(()=>{
    (async ()=>{
      const data = await getActiveCustomContests()
      console.log('Fetched contests:', data)
      setContests(data)
      setFilteredContests(data)
      setLoading(false)
    })()
  },[])

  useEffect(() => {
    let filtered = [...contests]
    
    if (searchQuery) {
      filtered = filtered.filter(contest =>
        contest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contest.platform && contest.platform.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    
    setFilteredContests(filtered)
    setCurrentPage(1)
  }, [searchQuery, contests])

  const totalPages = Math.ceil(filteredContests.length / pageSize)

  // Filter by status first, then apply pagination to each category
  const upcomingContests = filteredContests.filter(contest => {
    const now = Date.now()
    const start = new Date(contest.start_time).getTime()
    const isUpcoming = now < start
    if (isUpcoming) {
      console.log('Upcoming contest:', contest.name, 'Start:', new Date(contest.start_time), 'Now:', new Date(now))
    }
    return isUpcoming
  })

  const ongoingContests = filteredContests.filter(contest => {
    const now = Date.now()
    const start = new Date(contest.start_time).getTime()
    const end = new Date(contest.end_time).getTime()
    const isOngoing = now >= start && now <= end
    if (isOngoing) {
      console.log('Ongoing contest:', contest.name)
    }
    return isOngoing
  })

  const endedContests = filteredContests.filter(contest => {
    const now = Date.now()
    const end = new Date(contest.end_time).getTime()
    const isEnded = now > end
    if (isEnded) {
      console.log('Ended contest:', contest.name)
    }
    return isEnded
  })

  console.log('Contest counts - Upcoming:', upcomingContests.length, 'Ongoing:', ongoingContests.length, 'Ended:', endedContests.length)

  // Apply pagination to ended contests only (since upcoming and ongoing are typically fewer)
  const totalEndedPages = Math.ceil(endedContests.length / pageSize)
  const paginatedEndedContests = endedContests.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  if(loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <SearchInput
          placeholder="Search MCC contests..."
          value={searchQuery}
          onChange={setSearchQuery}
          className="w-full sm:w-64"
        />
      </div>

      {upcomingContests.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 border-l-4 border-red-600 pl-3">
            Upcoming MCC Contests
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingContests.map(contest => <MCCContestCard key={contest.id} contest={contest} />)}
          </div>
        </div>
      )}

      {ongoingContests.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 border-l-4 border-green-600 pl-3">
            Ongoing MCC Contests
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ongoingContests.map(contest => <MCCContestCard key={contest.id} contest={contest} />)}
          </div>
        </div>
      )}

      {endedContests.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 border-l-4 border-zinc-400 pl-3">
            Past MCC Contests
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedEndedContests.map(contest => <MCCContestCard key={contest.id} contest={contest} />)}
          </div>
        </div>
      )}

      {endedContests.length > pageSize && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalEndedPages}
          pageSize={pageSize}
          totalItems={endedContests.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {searchQuery && filteredContests.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400">No MCC contests found matching {searchQuery}</p>
        </div>
      )}

      {!searchQuery && contests.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400">No MCC contests available at the moment</p>
        </div>
      )}
    </div>
  )
}

function MCCContestCard({ contest }) {
  const start = new Date(contest.start_time).getTime()
  const end = new Date(contest.end_time).getTime()
  const now = Date.now()
  const status = now < start ? 'UPCOMING' : (now <= end ? 'ONGOING' : 'ENDED')
  
  const normalizeUrl = (url) => {
    if(!url) return '#'
    return /^(https?:)?\/\//i.test(url) ? (url.startsWith('http') ? url : `https:${url}`) : `https://${url}`
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDay = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long"
    })
  }

  const getDuration = () => {
    const durationMs = end - start
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    return hours
  }

  return (
    <Card className="overflow-hidden border-dashed border border-zinc-200 dark:border-zinc-700 hover:border-red-500 dark:hover:border-red-500 transition-all duration-300">
      <CardContent className="p-0">
        {/* Header Section with Platform and Contest Info */}
        <div className="p-4 relative">
          {/* Platform name in right corner */}
          {contest.platform && (
            <div className="absolute top-3 right-3">
              <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded uppercase">
                {contest.platform}
              </span>
            </div>
          )}
          
          {/* Status indicator */}
          <div className="flex items-center space-x-2 mb-3">
            <span
              className={`w-2 h-2 rounded-full ${
                status === 'UPCOMING' ? 'bg-yellow-500' : 
                status === 'ONGOING' ? 'bg-green-500' : 'bg-red-500'
              }`}
            ></span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-600 text-white tracking-wide">
              MCC
            </span>
          </div>

          {/* Contest name and description on same line */}
          <div className="pr-16">
            <div className="flex items-start space-x-3">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50 flex-shrink-0">
                {contest.name}
              </h3>
              {contest.description && (
                <span className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-1">
                  — {contest.description}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Time Details Section with different background */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 space-y-3">
          {/* Start/End time and Duration */}
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                {status === 'ENDED' ? 'Ended' : 'Starts'}
              </div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {formatDate(status === 'ENDED' ? contest.end_time : contest.start_time)}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatDay(contest.start_time)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                Duration
              </div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {getDuration()} {getDuration() === 1 ? 'hour' : 'hours'}
              </div>
            </div>
          </div>

          {/* Countdown Timer for upcoming contests */}
          {status === 'UPCOMING' && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <CountdownTimer targetTime={start} />
            </div>
          )}

          {/* Contest Link */}
          {contest.link && (
            <div className="pt-2">
              <a href={normalizeUrl(contest.link)} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 flex items-center justify-center gap-2"
                >
                  {status === 'UPCOMING' ? 'Register' : status === 'ONGOING' ? 'Join Now' : 'View Results'}
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
