"use client"

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Trophy, Medal, Award, Star, AlertCircle, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from "./ui/scroll-area"

function ReportTable({ merged, lastUpdated }) {
    const users = useMemo(() => {
        const filtered = merged.users
        return filtered
    }, [merged.users])

    // Build per-contest ranking maps and per-user progress vs previous attended contest
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

        // For each contest, compute rank per username (1 is best)
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
            // find the most recent previous contest the user attended
            let prevRank = undefined
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
                delta = prevRank - lastRank // positive means improved
                if (delta >= 3) status = 'incredible'
                else if (delta <= -1) status = 'down'
                else status = 'neutral'
            }
            progressByUser[u.username] = { status, delta, lastRank, prevRank }
        })

        return { contestRanks, progressByUser }
    }, [merged.users, merged.contestIds])
   

    return (
        <Card className="overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg">
            <CardHeader className="relative bg-gradient-to-r from-[hsl(var(--primary)/0.1)] to-[hsl(var(--primary)/0.05)] pb-2">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <CardTitle className="text-center text-3xl font-bold tracking-tight text-[hsl(var(--primary))] uppercase">
                            {merged.name}
                        </CardTitle>
                        <CardDescription className="text-center text-sm font-medium text-[hsl(var(--muted-foreground))]">
                            Last updated: {lastUpdated}
                        </CardDescription>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8 mt-1" title="How ranking & effective score are calculated">
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
                                            <p>1 worst contest (generally) opt out.</p>
                                        </div>
                                    </div>
                                </DialogDescription>
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="w-full whitespace-nowrap rounded-md border">

                    <Table>
                        <TableHeader className="bg-[hsl(var(--muted)/0.5)]">
                            <TableRow className="hover:bg-[hsl(var(--muted)/0.6)] transition-colors">
                                <TableHead className="w-[60px] text-[hsl(var(--foreground))]">Rank</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Progress</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Name</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Username</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Contests</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Effective Score</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Standard Deviation</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Total Demerits</TableHead>
                                {merged.contestIds.map((cid) => (
                                    <TableHead key={cid} className="min-w-[140px] text-[hsl(var(--foreground))]">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger className="block max-w-[120px] truncate text-left font-medium">
                                                    {merged.contestIdToTitle[cid]}
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{merged.contestIdToTitle[cid]}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u, index) => (
                                <TableRow
                                    key={u.username}
                                    className={cn(
                                        "group transition-all duration-200 hover:bg-[hsl(var(--accent)/0.3)]",
                                        index % 2 === 0 ? "bg-[hsl(var(--background))]" : "bg-[hsl(var(--muted)/0.2)]",
                                        index < 3 && "bg-[hsl(var(--primary)/0.05)]"
                                    )}
                                >
                                    {/* Rank */}
                                    <TableCell className="text-center font-medium">
                                        <Badge
                                            variant="default"
                                            className={cn(
                                                "min-w-[32px] transition-all duration-200 group-hover:shadow-sm",
                                                index < 12 &&
                                                    (index < 3
                                                        ? "bg-yellow-500 text-white"
                                                        : index < 6
                                                        ? "bg-gray-400 text-white"
                                                        : index < 9
                                                        ? "bg-orange-500 text-white"
                                                        : "bg-blue-500 text-white")
                                            )}
                                        >
                                            {index + 1}
                                        </Badge>
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
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center gap-1.5 cursor-default">
                                                                <Icon className={cn('h-4 w-4', improvement && 'text-green-600', decline && 'text-red-600', !improvement && !decline && 'text-muted-foreground')} />
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
                                                        </TooltipTrigger>
                                                        <TooltipContent className="text-xs">
                                                            {hasComparison ? (
                                                                <p>Prev: {p.prevRank} → Now: {p.lastRank}</p>
                                                            ) : (
                                                                <p>No prior contest to compare</p>
                                                            )}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            )
                                        })()}
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
                                    <TableCell className="text-center">
                                        <Badge
                                            variant="outline"
                                            className="min-w-[32px] border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--background))] font-semibold text-[hsl(var(--primary))] transition-all duration-200 group-hover:border-[hsl(var(--primary))] group-hover:shadow-sm"
                                        >
                                            {u.totalContestsAttended}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1.5 rounded-md bg-[hsl(var(--background))] p-1.5 transition-all duration-200 group-hover:bg-[hsl(var(--card))] group-hover:shadow-sm">
                                            <p className="flex items-center gap-1 text-sm">
                                                <span className="font-medium text-[hsl(var(--foreground))]">Solved:</span>
                                                <span className="font-semibold text-[hsl(var(--primary))]">{u.effectiveTotalSolved.toFixed(2)}</span>
                                                {u.effectiveTotalSolved !== u.totalSolved && (
                                                    <span className="text-xs text-[hsl(var(--muted-foreground))]">({u.totalSolved})</span>
                                                )}
                                            </p>
                                            <p className="flex items-center gap-1 text-sm">
                                                <span className="font-medium text-[hsl(var(--foreground))]">Penalty:</span>
                                                <span className="font-semibold">{u.effectiveTotalPenalty.toFixed(2)}</span>
                                                {u.effectiveTotalPenalty !== u.totalPenalty && (
                                                    <span className="text-xs text-[hsl(var(--muted-foreground))]">({u.totalPenalty.toFixed(2)})</span>
                                                )}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1.5 rounded-md bg-[hsl(var(--background))] p-1.5 transition-all duration-200 group-hover:bg-[hsl(var(--card))] group-hover:shadow-sm">
                                            <p className="text-sm">
                                                <span className="font-medium text-[hsl(var(--foreground))]">Score:</span>
                                                <span className="font-semibold">{u.stdDeviationScore.toFixed(2)}</span>
                                            </p>
                                            <p className="text-sm">
                                                <span className="font-medium text-[hsl(var(--foreground))]">Penalty:</span>
                                                <span className="font-semibold">{u.stdDeviationPen.toFixed(2)}</span>
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1.5 rounded-md bg-[hsl(var(--background))] p-1.5 transition-all duration-200 group-hover:bg-[hsl(var(--card))] group-hover:shadow-sm">
                                            {u.totalDemeritPoints > 0 ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Badge variant="destructive" className="cursor-help">
                                                                -{u.totalDemeritPoints}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs">
                                                            <div className="space-y-1">
                                                                {Object.values(u.demerits || {}).flat().map((demerit, idx) => (
                                                                    <div key={idx} className="text-sm">
                                                                        <strong>Contest {demerit.contest_id}:</strong> -{demerit.demerit_point} points - {demerit.reason}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <span className="text-[hsl(var(--muted-foreground))]">—</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    
                                    {merged.contestIds.map((cid) => {
                                        const perf = u.contests[cid]
                                        const isWorst = u.worstContests?.includes(cid)
                                        const isOptedOut = u.optedOutContests?.includes(cid)

                                        if (!perf || isWorst || isOptedOut) {
                                            return (
                                                <TableCell
                                                    key={cid}
                                                    className={cn(
                                                        "text-sm",
                                                        !perf && "text-[hsl(var(--muted-foreground))]",
                                                        isWorst && "bg-[hsl(var(--muted)/0.5)]",
                                                        isOptedOut && "bg-[hsl(var(--destructive)/0.1)]",
                                                    )}
                                                >
                                                    {(isWorst || isOptedOut) && (
                                                        <Badge
                                                            variant={isWorst ? "secondary" : "destructive"}
                                                            className="mb-1 flex items-center gap-1 text-xs font-normal"
                                                        >
                                                            {isWorst ? "Worst (removed)" : "Opted out"}
                                                            <AlertCircle className="h-3 w-3" />
                                                        </Badge>
                                                    )}
                                                    <div className="space-y-0.5 rounded-md bg-[hsl(var(--background)/0.7)] p-1 opacity-70">
                                                        <p className="text-xs">Solved: 0</p>
                                                        <p className="text-xs">Penalty: 0.00</p>
                                                        <p className="text-xs">Score: 0.00</p>
                                                    </div>
                                                </TableCell>
                                            )
                                        }

                                        return (
                                            <TableCell
                                                key={cid}
                                                className={cn(
                                                    "text-sm",
                                                    isWorst && "bg-[hsl(var(--muted)/0.5)]",
                                                    isOptedOut && "bg-[hsl(var(--destructive)/0.1)]",
                                                )}
                                            >
                                                {(isWorst || isOptedOut) && (
                                                    <Badge
                                                        variant={isWorst ? "secondary" : "destructive"}
                                                        className="mb-1 flex items-center gap-1 text-xs font-normal"
                                                    >
                                                        {isWorst ? "Worst (removed)" : "Opted out"}
                                                        <AlertCircle className="h-3 w-3" />
                                                    </Badge>
                                                )}
                                                <div className="space-y-0.5 rounded-md bg-[hsl(var(--background)/0.7)] p-1.5 transition-all duration-200 group-hover:bg-[hsl(var(--card))] group-hover:shadow-sm">
                                                    <p className="text-xs">
                                                        <span className="font-medium text-[hsl(var(--foreground))]">Solved:</span>{" "}
                                                        <span className="font-semibold">{perf.solved}</span>
                                                    </p>
                                                    <p className="text-xs">
                                                        <span className="font-medium text-[hsl(var(--foreground))]">Penalty:</span>{" "}
                                                        <span className="font-semibold">{perf.penalty.toFixed(2)}</span>
                                                    </p>
                                                    <p className="text-xs">
                                                        <span className="font-medium text-[hsl(var(--foreground))]">Score:</span>{" "}
                                                        <span className="font-semibold">{perf.finalScore.toFixed(2)}</span>
                                                    </p>
                                                </div>
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

export default ReportTable
