"use client"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, Loader2 } from "lucide-react"
import { fetchBatchStatistics } from "@/lib/vjudge"
import { fetchCodeforcesStatistics } from "@/lib/codeforces"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"



export default function BatchStatistics({ users, contestId, days, sessionId }) {
    const [batchStats, setBatchStats] = useState([])
    const [loading, setLoading] = useState(true)
    const [sortColumn, setSortColumn] = useState("combinedSubmissionFrequency")
    const [sortDirection, setSortDirection] = useState("desc")
    const [filter, setFilter] = useState("all")
    const [frequencyThreshold, setFrequencyThreshold] = useState(0.5)
    const fetchedRef = useRef(false)

    useEffect(() => {
        const loadBatchStatistics = async () => {
            if (fetchedRef.current) return
            fetchedRef.current = true
            setLoading(true)
            try {
                const vjudgeStats = await fetchBatchStatistics(users, contestId, days, sessionId)
                const codeforcesStats = await fetchCodeforcesStatistics(users, days)

                const mergedStats = users.map((user) => {
                    const vjudge = vjudgeStats.find((stat) => stat.vjudge_id === user.vjudge_id) || {
                        totalSubmissions: 0,
                        acceptedSubmissions: 0,
                        acceptanceRate: 0,
                        submissionFrequency: 0,
                        lastSubmissionDate: "N/A",
                    }
                    const codeforces = codeforcesStats.find((stat) => stat.cf_id === user.cf_id) || {
                        totalSubmissions: 0,
                        acceptedSubmissions: 0,
                        acceptanceRate: 0,
                        submissionFrequency: 0,
                        lastSubmissionDate: "N/A",
                    }
                    return {
                        ...user,
                        vjudge,
                        codeforces,
                        combinedSubmissionFrequency: vjudge.submissionFrequency + codeforces.submissionFrequency,
                    }
                })

                setBatchStats(mergedStats)
            } catch (error) {
                console.error("Error fetching batch statistics:", error)
            } finally {
                setLoading(false)
            }
        }

        loadBatchStatistics()
    }, [users, contestId, days, sessionId])

    const sortData = (column) => {
        const newDirection = column === sortColumn && sortDirection === "desc" ? "asc" : "desc"
        setSortColumn(column)
        setSortDirection(newDirection)

        const sortedStats = [...batchStats].sort((a, b) => {
            let aValue, bValue
            if (column === "combinedSubmissionFrequency") {
                aValue = a[column]
                bValue = b[column]
            } else if (column in a.vjudge) {
                aValue = a.vjudge[column]
                bValue = b.vjudge[column]
            } else {
                aValue = a[column]
                bValue = b[column]
            }
            if (aValue < bValue) return newDirection === "asc" ? -1 : 1
            if (aValue > bValue) return newDirection === "asc" ? 1 : -1
            return 0
        })

        setBatchStats(sortedStats)
    }

    const SortButton = ({ column }) => (
        <Button variant="ghost" onClick={() => sortData(column)} className="h-8 px-2 lg:px-3">
            {column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, " $1")}
            <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
    )

    const filteredStats = batchStats.filter((user) => {
        if (filter === "all") return true
        if (filter === "regular") return user.combinedSubmissionFrequency >= frequencyThreshold
        if (filter === "irregular") return user.combinedSubmissionFrequency < frequencyThreshold
        return true
    })

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6 flex justify-center items-center h-[400px]">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground">Loading batch statistics...</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Batch Statistics</CardTitle>
                <CardDescription>Performance overview for all users across VJudge and Codeforces</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                    <div className="flex-1">
                        <Label htmlFor="filter">Filter</Label>
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger id="filter">
                                <SelectValue placeholder="Select filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                <SelectItem value="regular">Regular Users</SelectItem>
                                <SelectItem value="irregular">Irregular Users</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1">
                        <Label htmlFor="threshold">Frequency Threshold (submissions/day)</Label>
                        <Input
                            id="threshold"
                            type="number"
                            value={frequencyThreshold}
                            onChange={(e) => setFrequencyThreshold(Number.parseFloat(e.target.value))}
                            min={0}
                            step={0.1}
                        />
                    </div>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>
                                <SortButton column="combinedSubmissionFrequency" />
                            </TableHead>
                            <TableHead>VJudge Submissions</TableHead>
                            <TableHead>Codeforces Submissions</TableHead>
                            <TableHead>VJudge Acceptance</TableHead>
                            <TableHead>Codeforces Acceptance</TableHead>
                            <TableHead>Last Active</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStats.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                    {user.full_name}
                                    <div className="flex gap-1 mt-1">
                                        {user.vjudge_id && <Badge variant="secondary">VJ</Badge>}
                                        {user.cf_id && <Badge variant="secondary">CF</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell>{user.combinedSubmissionFrequency.toFixed(2)}/day</TableCell>
                                <TableCell>{user.vjudge.totalSubmissions}</TableCell>
                                <TableCell>{user.codeforces.totalSubmissions}</TableCell>
                                <TableCell>{user.vjudge.acceptanceRate.toFixed(2)}%</TableCell>
                                <TableCell>{user.codeforces.acceptanceRate.toFixed(2)}%</TableCell>
                                <TableCell>
                                    {new Date(user.vjudge.lastSubmissionDate) > new Date(user.codeforces.lastSubmissionDate)
                                        ? `${user.vjudge.lastSubmissionDate} (VJ)`
                                        : `${user.codeforces.lastSubmissionDate} (CF)`}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}