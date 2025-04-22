"use client"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState, useMemo } from "react"
import Image from "next/image"
import { X, AlertCircle, Search, Users2, CheckCheck } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import LiveShareModal from "./LiveShareModal"
import { ScrollArea } from "./ui/scroll-area"

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
                    <h2 className="text-lg font-semibold mb-4">Report Settings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                            <TableHead>Name</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Contests</TableHead>
                            <TableHead>Effective Score</TableHead>
                            <TableHead>Standard Deviation</TableHead>
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
                        {users.map((u, index) => (
                            <TableRow key={u.username} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                                <TableCell>
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
                                        }`}
                                    >
                                        {index + 1}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Image
                                            src={u.avatarUrl || "/vercel.svg"}
                                            alt={u.realName || u.username}
                                            width={32}
                                            height={32}
                                            className="rounded-full object-cover"
                                            quality={20}
                                        />
                                        <span className="font-medium">{u.realName || "—"}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium text-[hsl(var(--primary))]">
                                    <span className="transition-all duration-200 group-hover:font-bold">{u.username}</span>
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
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
    )
}

export default ReportTable
