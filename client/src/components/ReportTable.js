"use client"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { X, AlertCircle, Search, Users2, CheckCheck, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import LiveShareModal from "./LiveShareModal"
import { ScrollArea } from "./ui/scroll-area"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Info } from "lucide-react"

function ReportTable({ merged, report_id, partial, liveReportId, name }) {
    const [searchText, setSearchText] = useState("")
    const [removeWorstCount, setRemoveWorstCount] = useState(1)
    const [optOutContests, setOptOutContests] = useState({})
    const [advancedFilters, setAdvancedFilters] = useState({
        minSolved: 0,
        maxSolved: Number.POSITIVE_INFINITY,
        minContests: 0,
        performanceFilter: null,
        sortBy: "effectiveTotalSolved", // Default sort by effective solved
        sortDirection: "desc",
    })
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
    const [liveModal, setLiveModal] = useState(false)

    const toggleOptOut = (contestId) => {
        setOptOutContests((prev) => ({
            ...prev,
            [contestId]: !prev[contestId],
        }))
    }

    const updateFilter = (key, value) => {
        setAdvancedFilters((prev) => ({
            ...prev,
            [key]: value,
        }))
    }

    const users = useMemo(() => {
        let filtered = merged.users.filter(
            (u) =>
                !searchText ||
                u.username.toLowerCase().includes(searchText.toLowerCase()) ||
                (u.realName && u.realName.toLowerCase().includes(searchText.toLowerCase())),
        )

        filtered = filtered.map((u) => {
            const allContestIds = Object.keys(u.contests).filter((cid) => !optOutContests[cid])
            const attendedContests = allContestIds.map((cid) => [cid, u.contests[cid]])
            const totalContestsAttended = attendedContests.filter(
                ([_, v]) => v && (v.solved > 0 || (v.submissions && v.submissions.length > 0)),
            ).length
            const processedUser = {
                ...u,
                totalContestsAttended,
                worstContests: [],
                optedOutContests: [],
                effectiveTotalSolved: u.effectiveSolved,
                effectiveTotalPenalty: u.effectivePenalty,
                effectiveTotalScore: u.effectiveSolved,
            }

            if (removeWorstCount > 0 && attendedContests.length > 0) {
                const sortedContests = [...attendedContests].sort((a, b) => {
                    if ((a[1]?.solved || 0) !== (b[1]?.solved || 0)) return (a[1]?.solved || 0) - (b[1]?.solved || 0)
                    return (b[1]?.penalty || 0) - (a[1]?.penalty || 0)
                })

                const worstToRemove = Math.min(removeWorstCount, attendedContests.length)

                for (let i = 0; i < worstToRemove; i++) {
                    const [worstContestId, perf] = sortedContests[i]
                    processedUser.worstContests.push(worstContestId)
                    processedUser.effectiveTotalSolved -= perf?.solved || 0
                    processedUser.effectiveTotalPenalty -= perf?.penalty || 0
                    processedUser.effectiveTotalScore -= perf?.finalScore || 0
                }
            }

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

        filtered = filtered.filter((u) => {
            if (u.effectiveTotalSolved < advancedFilters.minSolved) return false
            if (advancedFilters.maxSolved !== Number.POSITIVE_INFINITY && u.effectiveTotalSolved > advancedFilters.maxSolved)
                return false

            if (u.totalContestsAttended < advancedFilters.minContests) return false

            if (advancedFilters.performanceFilter) {
                const [contestId, minSolved] = advancedFilters.performanceFilter.split("|")
                const performance = u.contests[contestId]
                if (!performance || performance.solved < Number.parseInt(minSolved)) return false
            }

            return true
        })

        filtered.sort((a, b) => {
            const direction = advancedFilters.sortDirection === "asc" ? 1 : -1

            switch (advancedFilters.sortBy) {
                case "username":
                    return direction * a.username.localeCompare(b.username)
                case "effectiveTotalSolved":
                    if (a.effectiveTotalSolved !== b.effectiveTotalSolved)
                        return direction * (a.effectiveTotalSolved - b.effectiveTotalSolved)
                    if (a.effectiveTotalPenalty !== b.effectiveTotalPenalty)
                        return direction * -1 * (a.effectiveTotalPenalty - b.effectiveTotalPenalty)
                    return b.totalContestsAttended - a.totalContestsAttended
                case "effectiveTotalScore":
                    if (a.effectiveTotalScore !== b.effectiveTotalScore)
                        return direction * (a.effectiveTotalScore - b.effectiveTotalScore)
                    return direction * (a.effectiveTotalSolved - b.effectiveTotalSolved)
                case "effectiveTotalPenalty":
                    return direction * (a.effectiveTotalPenalty - b.effectiveTotalPenalty)
                case "contestsAttended":
                    return direction * (a.totalContestsAttended - b.totalContestsAttended)
                default:
                    if (a.effectiveTotalScore !== b.effectiveTotalScore) return b.effectiveTotalScore - a.effectiveTotalScore
                    if (a.effectiveTotalSolved !== b.effectiveTotalSolved) return b.effectiveTotalSolved - a.effectiveTotalSolved
                    if (a.effectiveTotalPenalty !== b.effectiveTotalPenalty)
                        return a.effectiveTotalPenalty - b.effectiveTotalPenalty
                    return b.totalContestsAttended - a.totalContestsAttended
            }
        })

        return filtered
    }, [merged.users, searchText, removeWorstCount, optOutContests, advancedFilters])

    const maxPossibleSolved = useMemo(() => {
        return Math.max(...merged.users.map((u) => u.totalSolved), 0)
    }, [merged.users])

    // Load valid VJudge IDs from server to decide linking
    const [validVjudgeIds, setValidVjudgeIds] = useState(null)
    useEffect(() => {
        const load = async () => {
            try{
                const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL
                const res = await fetch(`${base}/auth/public/vjudge-ids`, { cache: 'no-store' })
                const json = await res.json()
                const set = new Set(json?.result || [])
                setValidVjudgeIds(set)
            } catch(e){ console.error('Failed to load vjudge ids', e) }
        }
        load()
    }, [])

    // Progress: build per-contest ranking and compute last vs previous attended
    const { contestRanks, progressByUser } = useMemo(() => {
        const contestRanks = {}
        const comparePerf = (aPerf, bPerf) => {
            const aScore = aPerf?.finalScore ?? 0
            const bScore = bPerf?.finalScore ?? 0
            if (aScore !== bScore) return bScore - aScore
            const aSolved = aPerf?.solved ?? 0
            const bSolved = bPerf?.solved ?? 0
            if (aSolved !== bSolved) return bSolved - aSolved
            const aPen = aPerf?.penalty ?? Number.POSITIVE_INFINITY
            const bPen = bPerf?.penalty ?? Number.POSITIVE_INFINITY
            return aPen - bPen
        }
        merged.contestIds.forEach((cid) => {
            const participants = merged.users
                .filter((u) => u.contests && u.contests[cid])
                .sort((u1, u2) => comparePerf(u1.contests[cid], u2.contests[cid]))
            const rankMap = {}
            participants.forEach((u, idx) => {
                rankMap[u.username] = idx + 1
            })
            contestRanks[cid] = rankMap
        })
        const lastId = merged.contestIds[merged.contestIds.length - 1]
        const progressByUser = {}
        merged.users.forEach((u) => {
            const lastRank = contestRanks[lastId]?.[u.username]
            let prevRank
            for (let i = merged.contestIds.length - 2; i >= 0; i--) {
                const cid = merged.contestIds[i]
                if (u.contests && u.contests[cid]) {
                    prevRank = contestRanks[cid]?.[u.username]
                    if (prevRank !== undefined) break
                }
            }
            let status = 'neutral'
            let delta = 0
            if (lastRank !== undefined && prevRank !== undefined) {
                delta = prevRank - lastRank
                if (delta >= 3) status = 'incredible'
                else if (delta <= -1) status = 'down'
                else status = 'neutral'
            }
            progressByUser[u.username] = { status, delta, lastRank, prevRank }
        })
        return { contestRanks, progressByUser }
    }, [merged.users, merged.contestIds])

    const totalUsers = users.length
    const getNameColor = (rank) => {
        if (rank <= 3) {
            const golds = [
                'hsl(47, 95%, 55%)',
                'hsl(47, 85%, 50%)',
                'hsl(47, 75%, 45%)'
            ]
            return golds[rank - 1]
        }
        const hasAfter12 = totalUsers > 12
        if (!hasAfter12) {
            const t = (rank - 4) / Math.max(1, (totalUsers - 4))
            const light = 38 + t * 28
            const sat = 72 - t * 22
            return `hsl(140, ${sat}%, ${light}%)`
        }
        if (rank <= 12) {
            const t = (rank - 4) / 8
            const light = 40 + t * 22
            const sat = 70 - t * 20
            return `hsl(140, ${sat}%, ${light}%)`
        }
        const t = (rank - 13) / Math.max(1, (totalUsers - 13))
        const light = 60 - t * 30
        const sat = 65 + t * 25
        return `hsl(0, ${sat}%, ${light}%)`
    }

    const exportToCSV = () => {
        const headers = [
            "Rank",
            "Username",
            "Real Name",
            "Effective Score",
            "Effective Solved",
            "Effective Penalty",
            "Contests Attended",
            ...merged.contestIds.map((cid) => merged.contestIdToTitle[cid]),
        ]

        const rows = users.map((u, idx) => {
            const base = [
                idx + 1,
                u.username,
                u.realName,
                u.effectiveTotalScore.toFixed(2),
                u.effectiveTotalSolved,
                u.effectiveTotalPenalty.toFixed(2),
                u.totalContestsAttended,
            ]
            const contestData = merged.contestIds.map((cid) => {
                const perf = u.contests[cid]
                const isWorst = u.worstContests.includes(cid)
                const isOptedOut = u.optedOutContests.includes(cid)
                if (!perf || isWorst || isOptedOut) {
                    const status = isWorst ? "Worst (removed)" : isOptedOut ? "Opted out" : ""
                    return `${status ? status + ": " : ""}Solved: 0, Penalty: 0.00, Score: 0.00`
                }
                let status = ""
                if (isWorst) status = "Worst (removed)"
                else if (isOptedOut) status = "Opted out"
                return `${status ? status + ": " : ""}Solved: ${perf.solved}, Penalty: ${perf.penalty.toFixed(2)}, Score: ${perf.finalScore.toFixed(2)}`
            })
            return [...base, ...contestData]
        })

        const csv = [headers, ...rows]
            .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
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

    const exportToPDF = async () => {
        // Dynamic import to reduce bundle size
        const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
        
        const headers = [
            "Rank",
            "Username",
            "Real Name",
            "Effective Score",
            "Effective Solved",
            "Effective Penalty",
            "Contests Attended",
            ...merged.contestIds.map((cid) => merged.contestIdToTitle[cid]),
        ]
        const rows = users.map((u, idx) => {
            const base = [
                idx + 1,
                u.username,
                u.realName,
                u.effectiveTotalScore.toFixed(2),
                u.effectiveTotalSolved,
                u.effectiveTotalPenalty.toFixed(2),
                u.totalContestsAttended,
            ]
            const contestData = merged.contestIds.map((cid) => {
                const perf = u.contests[cid]
                const isWorst = u.worstContests.includes(cid)
                const isOptedOut = u.optedOutContests.includes(cid)
                if (!perf || isWorst || isOptedOut) {
                    const status = isWorst ? "Worst (removed)" : isOptedOut ? "Opted out" : ""
                    return `${status ? status + ": " : ""}Solved: 0, Penalty: 0.00, Score: 0.00`
                }
                let status = ""
                if (isWorst) status = "Worst (removed)"
                else if (isOptedOut) status = "Opted out"
                return `${status ? status + ": " : ""}Solved: ${perf.solved}, Penalty: ${perf.penalty.toFixed(2)}, Score: ${perf.finalScore.toFixed(2)}`
            })
            return [...base, ...contestData]
        })

        const pdfDoc = await PDFDocument.create()
        let page = pdfDoc.addPage()
        const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
        const fontSize = 10
        const margin = 30
        const rowHeight = 18
        const colWidth = 120
        let y = page.getHeight() - margin

        // Draw headers
        headers.forEach((header, i) => {
            page.drawText(header, {
                x: margin + i * colWidth,
                y: y,
                size: fontSize,
                font,
                color: rgb(0, 0, 0.7),
            })
        })
        y -= rowHeight

        // Draw rows
        rows.forEach((row) => {
            row.forEach((cell, i) => {
                page.drawText(String(cell), {
                    x: margin + i * colWidth,
                    y: y,
                    size: fontSize,
                    font,
                    color: rgb(0, 0, 0),
                })
            })
            y -= rowHeight
            if (y < margin) {
                y = page.getHeight() - margin
                page = pdfDoc.addPage()
            }
        })

        const pdfBytes = await pdfDoc.save()
        const blob = new Blob([pdfBytes], { type: "application/pdf" })
        const filename = `report_${new Date().toISOString().slice(0, 10)}.pdf`
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, filename)
        } else {
            const link = document.createElement("a")
            link.href = URL.createObjectURL(blob)
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }

    const liveReportData = useMemo(
        () => ({
            ...merged,
            users,
            name,
        }),
        [merged, users, name],
    )

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 mb-4">
                <div className="bg-card rounded-lg p-4 border shadow-sm">
                    <div className="flex items-start justify-between">
                        <h2 className="text-lg font-semibold mb-4">Report Settings</h2>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 ml-2" title="How ranking & effective score are calculated">
                                    <Info className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Ranking & Effective Score Calculation</DialogTitle>
                                    <DialogDescription asChild>
                                        <div className="space-y-4 text-sm leading-relaxed mt-2">
                                            <div>
                                                <h4 className="font-semibold mb-1">Per-Contest Metrics</h4>
                                                <ul className="list-disc list-inside space-y-1">
                                                    <li><strong>Solved</strong>: Number of accepted problems.</li>
                                                    <li><strong>Penalty</strong>: Base contest penalty (e.g., time + wrong submission penalties) plus any demerit penalties (100 per demerit point if user absent; or integrated into recorded penalty).</li>
                                                    <li><strong>Score</strong>: Weighted score for that contest (base finalScore × contest weight). Negative impact from demerits is already applied to the stored finalScore.</li>
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-1">Aggregated Totals (Raw)</h4>
                                                <ul className="list-disc list-inside space-y-1">
                                                    <li><strong>Total Solved</strong>: Sum of solved across all contests (after weighting if applied inside finalScore logic).</li>
                                                    <li><strong>Total Penalty</strong>: Sum of penalty across contests (includes added penalty for demerits / absences).</li>
                                                    <li><strong>Total Score</strong>: Sum of each contest&apos;s finalScore x weight.</li>
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-1">Standard Deviation Adjustment</h4>
                                                <p>To reward consistency, a standard deviation (SD) penalty is applied:</p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    <li><strong>Score SD</strong>: SD of per-contest scores.</li>
                                                    <li><strong>Penalty SD</strong>: SD of per-contest penalties.</li>
                                                </ul>
                                                <p className="mt-1">Higher variability (larger SD) reduces effective performance.</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-1">Effective Metrics</h4>
                                                <ul className="list-disc list-inside space-y-1">
                                                    <li><strong>Effective Solved / Effective Score</strong>: totalScore - scoreSD.</li>
                                                    <li><strong>Effective Penalty</strong>: totalPenalty + penaltySD.</li>
                                                    <li><strong>Total Demerits</strong>: Sum of demerit points across contests (shown; each demerit may also affect score/penalty already).</li>
                                                </ul>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-1">Ranking Order</h4>
                                                <ol className="list-decimal list-inside space-y-1">
                                                    <li>Higher <strong>Effective Solved / Score</strong></li>
                                                    <li>Lower <strong>Effective Penalty</strong> (tie-breaker)</li>
                                                    <li>Higher <strong>Contests Attended</strong> (final tie-breaker)</li>
                                                </ol>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-1">Removing Worst Contests / Opt-out</h4>
                                                <p>1 worst contest (generally) opt out. </p>
                                            </div>
                                            
                                        </div>
                                    </DialogDescription>
                                </DialogHeader>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Search Participants</label>
                            <div className="relative">
                                <Input
                                    placeholder="Search username or real name"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    className="pl-9"
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Remove Worst Contests</label>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={removeWorstCount.toString()}
                                    onValueChange={(value) => setRemoveWorstCount(Number(value))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select number" defaultValue={1} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: merged.contestIds.length }, (_, i) => (
                                            <SelectItem key={i} value={i.toString()}>
                                                {i}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="secondary"
                                    onClick={() => setRemoveWorstCount(removeWorstCount)}
                                    className="whitespace-nowrap"
                                >
                                    Apply
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Actions</label>
                            <div className="flex flex-wrap gap-2">
                                <LiveShareModal reportData={liveReportData} reportId={liveReportId} />
                                <Button size="sm" variant="outline" onClick={exportToCSV} className="flex items-center gap-1">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="lucide lucide-file-text"
                                    >
                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="16" x2="8" y1="13" y2="13" />
                                        <line x1="16" x2="8" y1="17" y2="17" />
                                        <line x1="10" x2="8" y1="9" y2="9" />
                                    </svg>
                                    CSV
                                </Button>
                                <Button size="sm" variant="outline" onClick={exportToPDF} className="flex items-center gap-1">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="lucide lucide-file-type"
                                    >
                                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <path d="M9 13v-1h6v1" />
                                        <path d="M11 18h2" />
                                        <path d="M12 12v6" />
                                    </svg>
                                    PDF
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-4 bg-card rounded-lg p-4 border shadow-sm">
                <h3 className="text-sm font-medium mb-3">Exclude Specific Contests</h3>
                <div className="flex flex-wrap gap-2">
                    {merged.contestIds.map((cid) => (
                        <Button
                            key={cid}
                            variant={optOutContests[cid] ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => toggleOptOut(cid)}
                            className="flex items-center gap-1 transition-all"
                        >
                            {optOutContests[cid] ? (
                                <X className="h-3 w-3 mr-1" />
                            ) : (
                               <CheckCheck className="h-3 w-3 mr-1" />
                            )}
                            <span className="text-xs">{merged.contestIdToTitle[cid]}</span>
                        </Button>
                    ))}
                </div>
            </div>

            <div>
                <div className="flex items-center gap-2 bg-card p-3 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-2">
                        <Users2 className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Showing</span>
                        <Badge variant="secondary" className="px-2 py-1 text-sm font-semibold">
                            {users.length}
                        </Badge>
                        <span className="font-medium">participants</span>
                    </div>
                </div>
            </div>

            <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Progress</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Contests</TableHead>
                            <TableHead>Effective Score</TableHead>
                            <TableHead>Standard Deviation</TableHead>
                            <TableHead>Total Demerits</TableHead>
                            {merged.contestIds.map((cid) => (
                                <TableHead key={cid} className={optOutContests[cid] ? "bg-destructive/10" : ""}>
                                    <div className="max-w-[120px] truncate">
                                        {merged.contestIdToTitle[cid]}
                                        {optOutContests[cid] && (
                                            <span className="ml-1 text-destructive">
                                                <AlertCircle className="inline h-3 w-3" />
                                            </span>
                                        )}
                                    </div>
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((u, index) => {
                            const isTop = index === 0
                            return (
                            <TableRow key={u.username} className={cn(index % 2 === 0 ? "bg-muted/20" : "", isTop && 'top-rank-wrapper')}> 
                                <TableCell>
                                    <div className={cn('inline-flex items-center justify-center', isTop && 'crown-badge')}>
                                        <Badge
                                            variant="default"
                                            className={`min-w-[32px] transition-all duration-200 ${
                                                index < 12
                                                    ? index < 3
                                                        ? "bg-yellow-500 text-white"
                                                        : index < 6
                                                        ? "bg-gray-500 text-white"
                                                        : index < 9
                                                        ? "bg-orange-500 text-white"
                                                        : "bg-blue-500 text-white"
                                                    : ""
                                            } ${isTop ? 'bg-transparent text-[hsl(var(--alumni-gold))] font-bold shadow-none' : ''}`}
                                        >
                                            {index + 1}
                                        </Badge>
                                    </div>
                                </TableCell>
                                {/* Progress */}
                                <TableCell className="min-w-[90px]">
                                    {(() => {
                                        const p = progressByUser[u.username] || { status: 'neutral', delta: 0 }
                                        const hasComparison = p.lastRank !== undefined && p.prevRank !== undefined
                                        const improvement = p.delta > 0
                                        const decline = p.delta < 0
                                        const Icon = improvement ? TrendingUp : decline ? TrendingDown : Minus
                                        return (
                                            <div className="flex items-center gap-1.5">
                                                <Icon className={`${improvement ? 'text-green-600' : decline ? 'text-red-600' : 'text-muted-foreground'} h-4 w-4`} />
                                                {hasComparison ? (
                                                    improvement ? (
                                                        <sup className="text-[10px] font-semibold text-green-600">+{p.delta}</sup>
                                                    ) : decline ? (
                                                        <sub className="text-[10px] font-semibold text-red-600">{p.delta}</sub>
                                                    ) : (
                                                        <span className="text-[10px] font-medium text-muted-foreground">0</span>
                                                    )
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground">—</span>
                                                )}
                                            </div>
                                        )
                                    })()}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className={cn('relative', isTop && 'ring-2 ring-[hsl(var(--alumni-gold))]/70 rounded-full p-[2px]')}>
                                            <Image
                                                src={u.avatarUrl || "/vercel.svg"}
                                                alt={u.realName || u.username}
                                                width={32}
                                                height={32}
                                                className={cn("rounded-full object-cover", isTop && 'shadow-lg shadow-[hsl(var(--alumni-gold)/0.4)]')}
                                                quality={20}
                                            />
                                        </div>
                                        <span className={cn('font-bold', isTop && 'top-rank-name')} style={!isTop ? { color: getNameColor(index + 1) } : undefined}>{u.realName || "—"}</span>
                                    </div>
                                </TableCell>
                                <TableCell className={cn('font-bold', isTop && 'top-rank-name')}>
                                    {validVjudgeIds?.has(String(u.username)) ? (
                                        <Link href={`/profile/${encodeURIComponent(u.username)}`} className="underline-offset-2 hover:underline transition-all duration-200" style={!isTop ? { color: getNameColor(index + 1) } : undefined}>
                                            {u.username}
                                        </Link>
                                    ) : (
                                        <span className="transition-all duration-200" style={!isTop ? { color: getNameColor(index + 1) } : undefined}>{u.username}</span>
                                    )}
                                </TableCell>
                                <TableCell>{u.totalContestsAttended}</TableCell>
                                <TableCell>
                                    <p>
                                        Solved - {u.effectiveTotalSolved.toFixed(2)}
                                        {u.effectiveTotalSolved !== u.totalSolved && (
                                            <span className="text-xs text-muted-foreground ml-1">({u.totalSolved})</span>
                                        )}
                                    </p>
                                    <p>
                                        Penalty - {u.effectiveTotalPenalty.toFixed(2)}
                                        {u.effectiveTotalPenalty !== u.totalPenalty && (
                                            <span className="text-xs text-muted-foreground ml-1">({u.totalPenalty.toFixed(2)})</span>
                                        )}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <p>Score: {u.stdDeviationScore.toFixed(2)}</p>
                                    <p>Penalty: {u.stdDeviationPen.toFixed(2)}</p>
                                </TableCell>
                                <TableCell>
                                    {u.totalDemeritPoints > 0 ? (
                                        <div
                                            className="relative"
                                            onMouseEnter={(e) => {
                                                // Create tooltip showing all demerit reasons
                                                const allDemerits = Object.values(u.demerits).flat();
                                                if (allDemerits.length > 0) {
                                                    const tooltip = document.createElement('div');
                                                    tooltip.className = 'absolute z-50 p-2 bg-black text-white text-xs rounded shadow-lg max-w-xs';
                                                    tooltip.style.left = '0px';
                                                    tooltip.style.top = '-10px';
                                                    tooltip.style.transform = 'translateY(-100%)';
                                                    tooltip.innerHTML = allDemerits.map(d => 
                                                        `<div class="mb-1"><strong>Contest ${d.contest_id}:</strong> -${d.demerit_point} points - ${d.reason}</div>`
                                                    ).join('');
                                                    e.target.appendChild(tooltip);
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                // Remove tooltip
                                                const tooltip = e.target.querySelector('.absolute.z-50');
                                                if (tooltip) {
                                                    tooltip.remove();
                                                }
                                            }}
                                        >
                                            <Badge variant="destructive" className="cursor-help">
                                                -{u.totalDemeritPoints}
                                            </Badge>
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">—</span>
                                    )}
                                </TableCell>
                                {merged.contestIds.map((cid) => {
                                    const perf = u.contests[cid]
                                    const isWorst = u.worstContests.includes(cid)
                                    const isOptedOut = u.optedOutContests.includes(cid)
                                    if (!perf || isWorst || isOptedOut) {
                                        let cellClassName = ""
                                        let statusText = null
                                        let extraTextClass = ""
                                        if (!perf) {
                                            extraTextClass = "text-primary"
                                        } else if (isWorst) {
                                            cellClassName = "bg-muted"
                                            statusText = "Worst (removed)"
                                        } else if (isOptedOut) {
                                            cellClassName = "bg-destructive/10"
                                            statusText = "Opted out"
                                        }
                                        return (
                                            <TableCell
                                                key={cid}
                                                className={cellClassName + " text-muted-foreground text-sm " + extraTextClass}
                                            >
                                                {statusText && (
                                                    <div className="text-xs font-medium mb-1 text-muted-foreground">{statusText}</div>
                                                )}
                                                <div>Solved: 0</div>
                                                <div>Penalty: 0.00</div>
                                                <div>Score: 0.00</div>
                                            </TableCell>
                                        )
                                    }
                                    let cellClassName = ""
                                    let statusText = null
                                    if (isWorst) {
                                        cellClassName = "bg-muted"
                                        statusText = "Worst (removed)"
                                    } else if (isOptedOut) {
                                        cellClassName = "bg-destructive/10"
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
                            </TableRow>)})}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    )
}

export default ReportTable
