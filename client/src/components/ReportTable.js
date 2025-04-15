"use client"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useMemo } from "react"
import Image from "next/image"
import { X, AlertCircle, Search, Filter, SlidersHorizontal } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
// import { saveAs } from "file-saver"

function ReportTable({ merged }) {
    const [searchText, setSearchText] = useState("")
    const [removeWorstCount, setRemoveWorstCount] = useState(0)
    const [optOutContests, setOptOutContests] = useState({})
    const [advancedFilters, setAdvancedFilters] = useState({
        minSolved: 0,
        maxSolved: Number.POSITIVE_INFINITY,
        minContests: 0,
        performanceFilter: null,
        sortBy: "totalSolved", // Default sort
        sortDirection: "desc",
    })
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)

    // Toggle opt-out for a specific contest
    const toggleOptOut = (contestId) => {
        setOptOutContests((prev) => ({
            ...prev,
            [contestId]: !prev[contestId],
        }))
    }

    // Update advanced filters
    const updateFilter = (key, value) => {
        setAdvancedFilters((prev) => ({
            ...prev,
            [key]: value,
        }))
    }

    const users = useMemo(() => {
        // Filter users based on search text
        let filtered = merged.users.filter(
            (u) =>
                !searchText ||
                u.username.toLowerCase().includes(searchText.toLowerCase()) ||
                (u.realName && u.realName.toLowerCase().includes(searchText.toLowerCase())),
        )

        // Process each user
        filtered = filtered.map((u) => {
            // Get contests this user attended
            const attendedContests = Object.entries(u.contests).filter(([_, v]) => v)

            // Calculate total contests attended
            const totalContestsAttended = attendedContests.length

            // Deep copy of user to avoid mutations
            const processedUser = {
                ...u,
                totalContestsAttended,
                worstContests: [],
                optedOutContests: [],
                effectiveTotalSolved: u.totalSolved,
                effectiveTotalPenalty: u.totalPenalty,
                effectiveTotalScore: u.totalScore,
            }

            // Find worst contests if remove worst is enabled
            if (removeWorstCount > 0 && attendedContests.length > 0) {
                // Sort by solved (ascending) then by penalty (descending)
                const sortedContests = [...attendedContests].sort((a, b) => {
                    if (a[1].solved !== b[1].solved) return a[1].solved - b[1].solved
                    return b[1].penalty - a[1].penalty
                })

                // Take only up to removeWorstCount or all attended contests, whichever is smaller
                const worstToRemove = Math.min(removeWorstCount, attendedContests.length)

                for (let i = 0; i < worstToRemove; i++) {
                    const [worstContestId] = sortedContests[i]
                    processedUser.worstContests.push(worstContestId)
                    processedUser.effectiveTotalSolved -= u.contests[worstContestId].solved
                    processedUser.effectiveTotalPenalty -= u.contests[worstContestId].penalty
                    processedUser.effectiveTotalScore -= u.contests[worstContestId].finalScore
                }
            }

            // Handle opted out contests
            Object.keys(optOutContests).forEach((contestId) => {
                if (optOutContests[contestId] && u.contests[contestId]) {
                    if (!processedUser.worstContests.includes(contestId)) {
                        processedUser.optedOutContests.push(contestId)
                        processedUser.effectiveTotalSolved -= u.contests[contestId].solved
                        processedUser.effectiveTotalPenalty -= u.contests[contestId].penalty
                        processedUser.effectiveTotalScore -= u.contests[contestId].finalScore
                    }
                }
            })

            return processedUser
        })

        // Apply advanced filters
        filtered = filtered.filter((u) => {
            // Min/Max solved problems
            if (u.effectiveTotalSolved < advancedFilters.minSolved) return false
            if (advancedFilters.maxSolved !== Number.POSITIVE_INFINITY && u.effectiveTotalSolved > advancedFilters.maxSolved)
                return false

            // Minimum contests attended
            if (u.totalContestsAttended < advancedFilters.minContests) return false

            // Performance in specific contest
            if (advancedFilters.performanceFilter) {
                const [contestId, minSolved] = advancedFilters.performanceFilter.split("|")
                const performance = u.contests[contestId]
                if (!performance || performance.solved < Number.parseInt(minSolved)) return false
            }

            return true
        })

        // Sort users
        filtered.sort((a, b) => {
            const direction = advancedFilters.sortDirection === "asc" ? 1 : -1

            switch (advancedFilters.sortBy) {
                case "username":
                    return direction * a.username.localeCompare(b.username)
                case "totalSolved":
                    if (a.effectiveTotalSolved !== b.effectiveTotalSolved)
                        return direction * (a.effectiveTotalSolved - b.effectiveTotalSolved)
                    // If tied on solved, sort by score, then penalty
                    if (a.effectiveTotalScore !== b.effectiveTotalScore)
                        return direction * (a.effectiveTotalScore - b.effectiveTotalScore)
                    return direction * -1 * (a.effectiveTotalPenalty - b.effectiveTotalPenalty)
                case "totalScore":
                    if (a.effectiveTotalScore !== b.effectiveTotalScore)
                        return direction * (a.effectiveTotalScore - b.effectiveTotalScore)
                    if (a.effectiveTotalSolved !== b.effectiveTotalSolved)
                        return direction * (a.effectiveTotalSolved - b.effectiveTotalSolved)
                    return direction * -1 * (a.effectiveTotalPenalty - b.effectiveTotalPenalty)
                case "totalPenalty":
                    return direction * (a.effectiveTotalPenalty - b.effectiveTotalPenalty)
                case "contestsAttended":
                    return direction * (a.totalContestsAttended - b.totalContestsAttended)
                default:
                    // Default sorting: by score, then solved, then penalty, then contests attended
                    if (a.effectiveTotalScore !== b.effectiveTotalScore) return b.effectiveTotalScore - a.effectiveTotalScore
                    if (a.effectiveTotalSolved !== b.effectiveTotalSolved) return b.effectiveTotalSolved - a.effectiveTotalSolved
                    if (a.effectiveTotalPenalty !== b.effectiveTotalPenalty)
                        return a.effectiveTotalPenalty - b.effectiveTotalPenalty
                    return b.totalContestsAttended - a.totalContestsAttended
            }
        })

        return filtered
    }, [merged.users, searchText, removeWorstCount, optOutContests, advancedFilters])

    // Get max solved problems for slider
    const maxPossibleSolved = useMemo(() => {
        return Math.max(...merged.users.map((u) => u.totalSolved), 0)
    }, [merged.users])

    // CSV export helper
    const exportToCSV = () => {
        // Table headers
        const headers = [
            "Rank",
            "Username",
            "Real Name",
            "Total Score",
            "Total Solved",
            "Total Penalty",
            "Contests Attended",
            ...merged.contestIds.map(cid => merged.contestIdToTitle[cid])
        ]

        // Table rows
        const rows = users.map((u, idx) => {
            const base = [
                idx + 1, // Rank
                u.username,
                u.realName,
                u.effectiveTotalScore.toFixed(2),
                u.effectiveTotalSolved,
                u.effectiveTotalPenalty.toFixed(2),
                u.totalContestsAttended
            ]
            const contestData = merged.contestIds.map(cid => {
                const perf = u.contests[cid]
                if (!perf) return "Not attended"
                let status = ""
                if (u.worstContests.includes(cid)) status = "Worst (removed)"
                else if (u.optedOutContests.includes(cid)) status = "Opted out"
                return `${status ? status + ": " : ""}Solved: ${perf.solved}, Penalty: ${perf.penalty.toFixed(2)}, Score: ${perf.finalScore.toFixed(2) }`
            })
            return [...base, ...contestData]
        })

        // CSV string
        const csv = [headers, ...rows]
            .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
            .join("\n")

        // Download
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        const filename = `report_${new Date().toISOString().slice(0, 10)}.csv`
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveBlob(blob, filename)
        } else {
            const link = document.createElement("a")
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob)
                link.setAttribute("href", url)
                link.setAttribute("download", filename)
                link.style.visibility = "hidden"
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            }
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1 max-w-xs">
                        <Input
                            placeholder="Search username or real name"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="pl-9"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            min={0}
                            max={merged.contestIds.length - 1}
                            value={removeWorstCount}
                            onChange={(e) => setRemoveWorstCount(Number(e.target.value))}
                            className="w-16"
                        />
                        <label className="text-sm">Remove worst contests</label>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                        className="sm:ml-auto"
                    >
                        <SlidersHorizontal className="h-4 w-4 mr-2" />
                        {showAdvancedSearch ? "Hide" : "Show"} Advanced Search
                    </Button>
                    <div className="flex items-center justify-end mr-2">
                        <Button size="sm" variant="secondary" onClick={exportToCSV}>
                            Export to CSV 
                        </Button>
                    </div>
                </div>

                {showAdvancedSearch && (
                    <div className="border rounded-md p-4 bg-muted/20">
                        <Accordion type="single" collapsible defaultValue="filters">
                            <AccordionItem value="filters">
                                <AccordionTrigger>
                                    <div className="flex items-center">
                                        <Filter className="h-4 w-4 mr-2" />
                                        Advanced Filters
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Solved Problems Range</label>
                                            <div className="flex items-center gap-4">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={maxPossibleSolved}
                                                    value={advancedFilters.minSolved}
                                                    onChange={(e) => updateFilter("minSolved", Number(e.target.value))}
                                                    className="w-20"
                                                />
                                                <span className="text-sm">to</span>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={maxPossibleSolved}
                                                    value={
                                                        advancedFilters.maxSolved === Number.POSITIVE_INFINITY
                                                            ? maxPossibleSolved
                                                            : advancedFilters.maxSolved
                                                    }
                                                    onChange={(e) =>
                                                        updateFilter("maxSolved", Number(e.target.value) || Number.POSITIVE_INFINITY)
                                                    }
                                                    className="w-20"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Minimum Contests Attended</label>
                                            <Input
                                                type="number"
                                                min={0}
                                                max={merged.contestIds.length}
                                                value={advancedFilters.minContests}
                                                onChange={(e) => updateFilter("minContests", Number(e.target.value))}
                                                className="w-20"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Performance in Specific Contest</label>
                                            <Select
                                                value={advancedFilters.performanceFilter}
                                                onValueChange={(value) => updateFilter("performanceFilter", value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a contest" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={null}>Any performance</SelectItem>
                                                    {merged.contestIds.map((cid) => (
                                                        <>
                                                            <SelectItem key={`${cid}|1`} value={`${cid}|1`}>
                                                                {merged.contestIdToTitle[cid]} (≥ 1 solved)
                                                            </SelectItem>
                                                            <SelectItem key={`${cid}|2`} value={`${cid}|2`}>
                                                                {merged.contestIdToTitle[cid]} (≥ 2 solved)
                                                            </SelectItem>
                                                            <SelectItem key={`${cid}|3`} value={`${cid}|3`}>
                                                                {merged.contestIdToTitle[cid]} (≥ 3 solved)
                                                            </SelectItem>
                                                        </>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Sort By</label>
                                            <div className="flex gap-2">
                                                <Select value={advancedFilters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="totalSolved">Total Solved</SelectItem>
                                                        <SelectItem value="totalPenalty">Total Penalty</SelectItem>
                                                        <SelectItem value="contestsAttended">Contests Attended</SelectItem>
                                                        <SelectItem value="username">Username</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <Select
                                                    value={advancedFilters.sortDirection}
                                                    onValueChange={(value) => updateFilter("sortDirection", value)}
                                                >
                                                    <SelectTrigger className="w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="desc">Descending</SelectItem>
                                                        <SelectItem value="asc">Ascending</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                )}
                
            </div>

            <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Remove specific contests:</h3>
                <div className="flex flex-wrap gap-2">
                    {merged.contestIds.map((cid) => (
                        <Button
                            key={cid}
                            variant={optOutContests[cid] ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => toggleOptOut(cid)}
                            className="flex items-center gap-1"
                        >
                            {optOutContests[cid] && <X className="h-3 w-3" />}
                            <span className="text-xs">{merged.contestIdToTitle[cid]}</span>
                        </Button>
                    ))}
                </div>
            </div>

            <div>
                Showing <Badge variant="outline">{users.length}</Badge> participants

           </div>

            

            <div className="overflow-x-auto border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">Avatar</TableHead>
                            <TableHead>Rank</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Real Name</TableHead>
                            <TableHead>Total Score</TableHead>
                            <TableHead>Total Solved</TableHead>
                            <TableHead>Total Penalty</TableHead>
                            <TableHead>Contests</TableHead>
                            {merged.contestIds.map((cid) => (
                                <TableHead key={cid} className={optOutContests[cid] ? "bg-red-100" : ""}>
                                    <div className="max-w-[120px] truncate">
                                        {merged.contestIdToTitle[cid]}
                                        {optOutContests[cid] && (
                                            <span className="ml-1 text-red-500">
                                                <AlertCircle className="inline h-3 w-3" />
                                            </span>
                                        )}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u, index) => (
                            <TableRow key={u.username} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                                <TableCell>
                                    <Image
                                        src={u.avatarUrl || "/placeholder.svg"}
                                        alt="avatar"
                                        width={32}
                                        height={32}
                                        className="rounded-full"
                                    />
                                </TableCell>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium">{u.username}</TableCell>
                                <TableCell>{u.realName}</TableCell>
                                <TableCell>{u.effectiveTotalScore.toFixed(2)}</TableCell>
                                <TableCell>
                                    {u.effectiveTotalSolved}
                                    {u.effectiveTotalSolved !== u.totalSolved && (
                                        <span className="text-xs text-muted-foreground ml-1">({u.totalSolved})</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {u.effectiveTotalPenalty.toFixed(2)}
                                    {u.effectiveTotalPenalty !== u.totalPenalty && (
                                        <span className="text-xs text-muted-foreground ml-1">({u.totalPenalty.toFixed(2)})</span>
                                    )}
                                </TableCell>
                                <TableCell>{u.totalContestsAttended}</TableCell>
                                {merged.contestIds.map((cid) => {
                                    const perf = u.contests[cid]

                                    if (!perf) {
                                        return (
                                            <TableCell key={cid} className="text-muted-foreground text-sm">
                                                Not attended
                                            </TableCell>
                                        )
                                    }

                                    // Determine cell styling based on contest status
                                    let cellClassName = ""
                                    let statusText = null

                                    if (u.worstContests.includes(cid)) {
                                        cellClassName = "bg-foreground" // More visible amber/yellow
                                        statusText = "Worst (removed)"
                                    } else if (u.optedOutContests.includes(cid)) {
                                        cellClassName = "bg-red-100"
                                        statusText = "Opted out"
                                    }

                                    return (
                                        <TableCell key={cid} className={cellClassName}>
                                            <div className="text-sm">
                                                {statusText && (
                                                    <div className="text-xs font-medium mb-1 text-muted-foreground">{statusText}</div>
                                                )}
                                                <div>Solved: {perf.solved}</div>
                                                <div>Penalty: {perf.penalty.toFixed(2)}</div>
                                                <div>Score: {perf.finalScore.toFixed(2)}</div>
                                            </div>
                                        </TableCell>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

        
        </div>
    )
}

export default ReportTable
