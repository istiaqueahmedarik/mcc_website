"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart2, Clock, ExternalLink, Trophy, Users } from "lucide-react"
import CountdownTimer from "./countdown-timer"
import { SearchInput } from "./search-input"
import { PaginationControls } from "./pagination-controls"
import { getContests } from "@/lib/action"



function convertBapsojContests(bapsojContests){
    return bapsojContests.map((contest) => {
        const now = new Date()
        const endsAt = new Date(contest.ends_at)
        const isEnded = endsAt < now

        return {
            id: contest.id,
            name: contest.title,
            status: isEnded ? "Ended" : "Upcoming",
            slug: contest.slug,
            description: contest.description,
            contest_type: contest.contest_type,
            starts_at: contest.starts_at,
            ends_at: contest.ends_at,
            duration: contest.duration,
            endedAt: isEnded ? (endsAt.getTime() / 1000).toString() : null,
            source: "bapsoj",
        }
    })
}

export default function IUPCSection() {
    const [isLoading, setIsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(4)
    const [allIUPCContests, setAllIUPCContests] = useState([])

    useEffect(() => {
        async function fetchBapsojContests() {
            setIsLoading(true)
            try {
                const response = await fetch("https://api.bapsoj.org/api/judge/contests/?offset=0&limit=25");
                const data = await response.json();

                const res = await getContests()
                const tophContests = res


                const bapsojContests = convertBapsojContests(data.results)

                setAllIUPCContests([...tophContests, ...bapsojContests])
                setIsLoading(false)
            } catch (error) {
                console.error("Error fetching BAPSOJ contests:", error)
                setAllIUPCContests(tophContests)
                setIsLoading(false)
            }
        }

        fetchBapsojContests()
    }, [])

    const filteredContests = allIUPCContests.filter((contest) =>
        contest.name.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const upcomingContests = filteredContests.filter((contest) => contest.status === "Upcoming")
    const endedContests = filteredContests.filter((contest) => contest.status === "Ended")

    const totalEndedPages = Math.ceil(endedContests.length / pageSize)
    const paginatedEndedContests = endedContests.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery])

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <div className="flex justify-end mb-6">
                    <SearchInput
                        placeholder="Search IUPC contests..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                        className="w-full sm:w-64"
                    />
                </div>

                {upcomingContests.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 border-l-4 border-red-600 pl-3">
                            Upcoming IUPC
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {upcomingContests.map((contest, index) => (
                                <IUPCCard key={index} contest={contest} />
                            ))}
                        </div>
                    </div>
                )}

                {endedContests.length > 0 && (
                    <div className="space-y-6 mt-8">
                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 border-l-4 border-zinc-400 pl-3">
                            Past IUPC
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {paginatedEndedContests.map((contest, index) => (
                                <IUPCCard key={index} contest={contest} />
                            ))}
                        </div>

                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalEndedPages}
                            pageSize={pageSize}
                            totalItems={endedContests.length}
                            onPageChange={setCurrentPage}
                            onPageSizeChange={setPageSize}
                        />
                    </div>
                )}

                {searchQuery && upcomingContests.length === 0 && endedContests.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-zinc-500 dark:text-zinc-400">No IUPC contests found matching &quot;{searchQuery}&quot;</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function IUPCCard({ contest }) {
    const getCountdownTime = () => {
        if (contest.status === "Upcoming") {
            if (contest.source === "bapsoj" && contest.starts_at) {
                return new Date(contest.starts_at).getTime()
            } else {
                // For demo purposes, set a future timestamp for upcoming contests
                return Date.now() + 1000 * 60 * 60 * 24 * (Math.floor(Math.random() * 7) + 1)
            }
        }
        return 0
    }

    const formatDate = (timestamp) => {
        let date
        if (timestamp.includes("T")) {
            date = new Date(timestamp)
        } else {
            date = new Date(Number.parseInt(timestamp) * 1000)
        }

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    const getContestUrl = () => {
        if (contest.source === "bapsoj" && contest.slug) {
            return `https://bapsoj.org/contests/${contest.slug}`
        } else if (contest.links?.practice) {
            return `https://toph.co${contest.links.practice}`
        }
        return "#"
    }

    const getStandingsUrl = () => {
        if (contest.source === "bapsoj" && contest.slug) {
            return `https://bapsoj.org/contests/${contest.slug}/standings`
        } else if (contest.links?.standings) {
            return `https://toph.co${contest.links.standings}`
        }
        return "#"
    }

    const getStatisticsUrl = () => {
        if (contest.source === "bapsoj" && contest.slug) {
            return `https://bapsoj.org/contests/${contest.slug}/statistics`
        } else if (contest.links?.statistics) {
            return `https://toph.co${contest.links.statistics}`
        }
        return "#"
    }

    return (
        <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
            <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                            <span
                                className={`w-2 h-2 rounded-full ${contest.status === "Upcoming" ? "bg-yellow-500" : "bg-red-500"}`}
                            ></span>
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                                {contest.source === "bapsoj" ? "BAPSOJ" : "IUPC"}
                            </span>
                        </div>
                        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 line-clamp-2">{contest.name}</h3>
                    </div>
                </div>

                <div className="space-y-2">
                    {contest.contest_type && (
                        <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                            <Users className="mr-2 h-4 w-4" />
                            <span>Type: {contest.contest_type}</span>
                        </div>
                    )}

                    {contest.problems && (
                        <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>Problems: {contest.problems}</span>
                        </div>
                    )}

                    {contest.duration && (
                        <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                            <Clock className="mr-2 h-4 w-4" />
                            <span>
                                Duration: {contest.duration} {contest.duration === 1 ? "hour" : "hours"}
                            </span>
                        </div>
                    )}

                    {contest.status === "Ended" && contest.endedAt && (
                        <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                            <span>Ended on: {formatDate(contest.endedAt)}</span>
                        </div>
                    )}

                    {contest.status === "Upcoming" && (
                        <div className="mt-4">
                            <CountdownTimer targetTime={getCountdownTime()} />
                        </div>
                    )}

                    {contest.source === "bapsoj" && contest.starts_at && contest.status === "Upcoming" && (
                        <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                            <span>Starts on: {formatDate(contest.starts_at)}</span>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-0 grid grid-cols-3">
                {contest.status === "Upcoming" ? (
                    <>
                        <a href={getContestUrl()} target="_blank" rel="noopener noreferrer" className="col-span-2">
                            <Button
                                variant="ghost"
                                className="w-full rounded-none h-12 text-red-600 hover:text-red-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-2"
                            >
                                Register
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </a>
                        <a href={getStatisticsUrl()} target="_blank" rel="noopener noreferrer" className="w-full">
                            <Button
                                variant="ghost"
                                className="w-full rounded-none h-12 text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-2"
                            >
                                Details
                                <BarChart2 className="h-4 w-4" />
                            </Button>
                        </a>
                    </>
                ) : (
                    <>
                        <a href={getContestUrl()} target="_blank" rel="noopener noreferrer" className="w-full">
                            <Button
                                variant="ghost"
                                className="w-full rounded-none h-12 text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-2"
                            >
                                Practice
                            </Button>
                        </a>
                        <a href={getStandingsUrl()} target="_blank" rel="noopener noreferrer" className="w-full">
                            <Button
                                variant="ghost"
                                className="w-full rounded-none h-12 text-red-600 hover:text-red-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-2"
                            >
                                Standings
                                <Trophy className="h-4 w-4" />
                            </Button>
                        </a>
                        <a href={getStatisticsUrl()} target="_blank" rel="noopener noreferrer" className="w-full">
                            <Button
                                variant="ghost"
                                className="w-full rounded-none h-12 text-zinc-600 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center gap-2"
                            >
                                Stats
                                <BarChart2 className="h-4 w-4" />
                            </Button>
                        </a>
                    </>
                )}
            </CardFooter>
        </Card>
    )
}

