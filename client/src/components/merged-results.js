"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { exportToExcel, exportToCSV } from "@/lib/excel-export"
import { toast } from "sonner"
import { getContestResults } from "@/lib/action"

export function MergedResults({ contestId }) {
    const [results, setResults] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        const fetchContestResults = async () => {
            setIsLoading(true)
            setError(null)

            try {
                // Try to get cached data first
                const cachedData = localStorage.getItem(`merged_results_${contestId}`)
                const cachedTimestamp = localStorage.getItem(`merged_results_${contestId}_timestamp`)

                if (cachedData && cachedTimestamp) {
                    const timestamp = Number.parseInt(cachedTimestamp)
                    const now = Date.now()
                    if (now - timestamp < 5 * 60 * 1000) {
                        setResults(JSON.parse(cachedData))
                        setIsLoading(false)
                        return
                    }
                }
                const sessionId = localStorage.getItem("vjudge_session")
                const html = await getContestResults(contestId, sessionId)
                console.log("Fetched HTML:", html)
                const parser = new DOMParser()
                const doc = parser.parseFromString(html, "text/html")
                const rankTable = doc.querySelector("#contest-rank-table")
                console.log(rankTable)
                if (!rankTable) {
                    throw new Error("Could not find ranking table in the contest page")
                }

                // Extract data from the table
                const rows = rankTable.querySelectorAll("tbody tr")
                const parsedResults = []

                rows.forEach((row) => {
                    const rankCell = row.querySelector(".rank.meta")
                    const teamCell = row.querySelector(".team.meta")
                    const solvedCell = row.querySelector(".solved.meta span")
                    const penaltyCell = row.querySelector(".penalty.meta .minute, .penalty.meta .hms")

                    if (rankCell && teamCell && solvedCell && penaltyCell) {
                        const rank = Number.parseInt(rankCell.textContent?.trim() || "0")

                        // Extract username and name
                        const userLink = teamCell.querySelector("a")
                        const username = userLink?.textContent?.trim().split(" ")[0] || ""

                        // Extract name from the span with grey color
                        const nameSpan = teamCell.querySelector("span[style*='color:grey']")
                        let name = ""
                        if (nameSpan) {
                            name = nameSpan.textContent?.replace(/[()]/g, "") || ""
                        }

                        const solved = Number.parseInt(solvedCell.textContent?.trim() || "0")
                        const penalty = penaltyCell.textContent?.trim() || ""

                        // Extract penalty minutes for sorting
                        const penaltyMinutes = Number.parseInt(
                            row.querySelector(".penalty.meta .minute")?.textContent?.trim() || "0"
                        )

                        parsedResults.push({
                            rank,
                            username,
                            name,
                            solved,
                            penalty,
                            penaltyMinutes,
                        })
                    }
                })

                // Cache the parsed results
                localStorage.setItem(`merged_results_${contestId}`, JSON.stringify(parsedResults))
                localStorage.setItem(`merged_results_${contestId}_timestamp`, Date.now().toString())

                setResults(parsedResults)
            } catch (error) {
                console.error("Error fetching contest results:", error)
                setError(error instanceof Error ? error.message : "Unknown error occurred")
                toast("Error fetching results: " + (error instanceof Error ? error.message : "Unknown error occurred"))
            } finally {
                setIsLoading(false)
            }
        }

        if (contestId) {
            fetchContestResults()
        }
    }, [contestId])

    const filteredResults = results.filter(
        (result) =>
            result.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            result.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleExport = async (format) => {
        if (results.length === 0) {
            toast("No data to export. There are no results available to export")
            return
        }

        setIsExporting(true)

        try {
            // Prepare data for export
            const exportData = results.map((result) => ({
                Rank: result.rank,
                Username: result.username,
                Name: result.name,
                "Total Solved": result.solved,
                "Total Penalty": result.penalty,
            }))

            let success = false

            if (format === "xlsx") {
                success = exportToExcel(exportData, `vjudge_contest_${contestId}_results`)
            } else {
                success = exportToCSV(exportData, `vjudge_contest_${contestId}_results`)
            }

            if (success) {
                toast("Export successful: Results have been exported to " + format.toUpperCase() + " format")
            } else {
                throw new Error("Export failed")
            }
        } catch (error) {
            console.error("Error during export:", error)
            toast("Export failed: An error occurred while exporting the results")
        } finally {
            setIsExporting(false)
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Loading Merged Results</CardTitle>
                    <CardDescription>Fetching and processing contest data...</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}. Please check your connection and try again.</AlertDescription>
            </Alert>
        )
    }

    if (results.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Results Available</CardTitle>
                    <CardDescription>Could not find any results for this contest</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Merged Contest Results</CardTitle>
                        <CardDescription>
                            Combined results showing rank, name, username, solved problems, and penalties
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => handleExport("csv")} disabled={isExporting}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export CSV
                        </Button>
                        <Button onClick={() => handleExport("xlsx")} disabled={isExporting}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export Excel
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center">
                        <Input
                            placeholder="Search by name or username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        {searchTerm && (
                            <Button variant="ghost" onClick={() => setSearchTerm("")} className="ml-2">
                                Clear
                            </Button>
                        )}
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Rank</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Total Solved</TableHead>
                                    <TableHead className="text-right">Total Penalty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredResults.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No results found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredResults.map((result) => (
                                        <TableRow key={`${result.rank}-${result.username}`}>
                                            <TableCell className="font-medium">{result.rank}</TableCell>
                                            <TableCell>{result.username}</TableCell>
                                            <TableCell>{result.name}</TableCell>
                                            <TableCell className="text-right">{result.solved}</TableCell>
                                            <TableCell className="text-right">{result.penalty}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
