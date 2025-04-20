"use client"

import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Trophy, Medal, Award, Star, AlertCircle } from 'lucide-react'

function ReportTable({ merged, lastUpdated }) {
    const users = useMemo(() => {
        const filtered = merged.users
        return filtered
    }, [merged.users])

   

    return (
        <Card className="overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg">
            <CardHeader className="bg-gradient-to-r from-[hsl(var(--primary)/0.1)] to-[hsl(var(--primary)/0.05)] pb-2">
                <CardTitle className="text-center text-3xl font-bold tracking-tight text-[hsl(var(--primary))]">
                    {merged.name}
                </CardTitle>
                <CardDescription className="text-center text-sm font-medium text-[hsl(var(--muted-foreground))]">
                    Last updated: {lastUpdated}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-[hsl(var(--muted)/0.5)]">
                            <TableRow className="hover:bg-[hsl(var(--muted)/0.6)] transition-colors">
                                <TableHead className="w-[60px] text-[hsl(var(--foreground))]">Avatar</TableHead>
                                <TableHead className="w-[60px] text-[hsl(var(--foreground))]">Rank</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Username</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Real Name</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Contests</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Effective Score</TableHead>
                                <TableHead className="text-[hsl(var(--foreground))]">Std Dev</TableHead>
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
                                    <TableCell className="p-2">
                                        <div className={cn(
                                            "relative h-10 w-10 overflow-hidden rounded-full border-2 transition-all duration-200",
                                            index < 3
                                                ? `border-[hsl(var(--${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}))]`
                                                : "border-[hsl(var(--border))]",
                                            "group-hover:border-[hsl(var(--primary))] group-hover:shadow-md"
                                        )}>
                                            <Image
                                                src={u.avatarUrl || "/placeholder.svg?height=40&width=40"}
                                                alt={`${u.username}'s avatar`}
                                                width={40}
                                                height={40}
                                                className="object-cover"
                                            />
                                           
                                        </div>
                                    </TableCell>
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
                                    <TableCell className="font-medium text-[hsl(var(--primary))]">
                                        <span className="transition-all duration-200 group-hover:font-bold">{u.username}</span>
                                    </TableCell>
                                    <TableCell className="text-[hsl(var(--muted-foreground))]">{u.realName || "—"}</TableCell>
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
                </div>
            </CardContent>
        </Card>
    )
}

export default ReportTable
