"use client"

import { useEffect, useState } from "react"
import ContestCard from "./contest-card"
import FilterBar from "./filter-bar"
import { isSameDay } from "date-fns"
import { SearchInput } from "./search-input"
import { PaginationControls } from "./pagination-controls"

export default function ContestList() {
    const [contests, setContests] = useState([])
    const [filteredContests, setFilteredContests] = useState([])
    const [displayedContests, setDisplayedContests] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState("all")
    const [dateFilter, setDateFilter] = useState(undefined)
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(6)

    useEffect(() => {
        async function fetchContests() {
            try {
                const response = await fetch("https://contests.dhruvmishra.com/api/v1/contests/all")
                const data = await response.json()
                setContests(data)
                setFilteredContests(data)
                setIsLoading(false)
            } catch (error) {
                console.error("Error fetching contests:", error)
                setIsLoading(false)
            }
        }

        fetchContests()
    }, [])

    useEffect(() => {
        let filtered = [...contests]

        if (filter === "upcoming") {
            filtered = filtered.filter((contest) => contest.status === "BEFORE")
        } else if (filter === "ongoing") {
            filtered = filtered.filter((contest) => contest.status === "CODING")
        }

        if (dateFilter) {
            filtered = filtered.filter((contest) => {
                const startDate = new Date(contest.start_time)
                const endDate = new Date(contest.end_time)

                return (
                    isSameDay(startDate, dateFilter) ||
                    isSameDay(endDate, dateFilter) ||
                    (startDate < dateFilter && endDate > dateFilter)
                )
            })
        }

        if (searchQuery) {
            filtered = filtered.filter(
                (contest) =>
                    contest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    contest.site.toLowerCase().includes(searchQuery.toLowerCase()),
            )
        }

        setFilteredContests(filtered)
        setCurrentPage(1) 
    }, [filter, dateFilter, searchQuery, contests])

    useEffect(() => {
        const startIndex = (currentPage - 1) * pageSize
        const endIndex = startIndex + pageSize
        setDisplayedContests(filteredContests.slice(startIndex, endIndex))
    }, [filteredContests, currentPage, pageSize])

    const totalPages = Math.ceil(filteredContests.length / pageSize)

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4">
                <FilterBar activeFilter={filter} setFilter={setFilter} dateFilter={dateFilter} setDateFilter={setDateFilter} />

                <div className="flex justify-end">
                    <SearchInput
                        placeholder="Search contests..."
                        value={searchQuery}
                        onChange={setSearchQuery}
                        className="w-full sm:w-64"
                    />
                </div>
            </div>

            {displayedContests.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayedContests.map((contest) => (
                            <ContestCard key={contest.id} contest={contest} />
                        ))}
                    </div>

                    <PaginationControls
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        totalItems={filteredContests.length}
                        onPageChange={setCurrentPage}
                        onPageSizeChange={setPageSize}
                    />
                </>
            ) : (
                <div className="text-center py-12">
                    <p className="text-zinc-500 dark:text-zinc-400">
                        {searchQuery ? `No contests found matching "${searchQuery}"` : "No contests found with the current filters"}
                    </p>
                </div>
            )}
        </div>
    )
}

