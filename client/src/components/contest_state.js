"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { serverFetchContestData } from "@/lib/serverFetchContestData"

export function ContestStats({ contestId }) {
    const [contestData, setContestData] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const sessionId = localStorage.getItem("vjudge_session")
                const data = await serverFetchContestData(contestId,sessionId)
                setContestData(data)
            } catch (error) {
                console.error("Error fetching contest data:", error)
                setError(error instanceof Error ? error.message : "Unknown error occurred")
                toast("Error fetching data: " + (error instanceof Error ? error.message : "Unknown error occurred"))
            } finally {
                setIsLoading(false)
            }
        }

        if (contestId) {
            fetchData()
        }
    }, [contestId])

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Loading Contest Data</CardTitle>
                    <CardDescription>Fetching the latest information...</CardDescription>
                </CardHeader>
                <CardContent>
                    <Progress value={75} className="w-full" />
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

    if (!contestData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Data Available</CardTitle>
                    <CardDescription>Could not load contest data</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    // Process submissions data
    const totalSubmissions = contestData.submissions.length
    const acceptedSubmissions = contestData.submissions.filter((sub) => sub[2] === 0).length
    const rejectedSubmissions = totalSubmissions - acceptedSubmissions
    const acceptanceRate = totalSubmissions > 0 ? (acceptedSubmissions / totalSubmissions) * 100 : 0

    // Get participant stats
    const participantCount = Object.keys(contestData.participants).length

    // Get problem stats (assuming problem IDs are in the second position of submission array)
    const problemSubmissions = new Map()

    contestData.submissions.forEach((sub) => {
        const problemId = sub[1]
        const isAccepted = sub[2] === 0

        if (!problemSubmissions.has(problemId)) {
            problemSubmissions.set(problemId, { total: 0, accepted: 0 })
        }

        const stats = problemSubmissions.get(problemId)
        stats.total++
        if (isAccepted) stats.accepted++
    })

    // Convert to array for easier rendering
    const problemStats = Array.from(problemSubmissions.entries()).map(([id, stats]) => ({
        id,
        total: stats.total,
        accepted: stats.accepted,
        acceptanceRate: (stats.accepted / stats.total) * 100,
    }))

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>{contestData.title}</CardTitle>
                    <CardDescription>
                        Contest ID: {contestData.id} • {participantCount} Participants
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Total Submissions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{totalSubmissions}</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center">
                                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                                    Accepted
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-500">{acceptedSubmissions}</div>
                                <Progress value={acceptanceRate} className="h-2 mt-2" />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center">
                                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                    Rejected
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-500">{rejectedSubmissions}</div>
                                <Progress value={100 - acceptanceRate} className="h-2 mt-2 bg-muted" />
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="problems">
                <TabsList>
                    <TabsTrigger value="problems">Problems</TabsTrigger>
                    <TabsTrigger value="participants">Participants</TabsTrigger>
                </TabsList>

                <TabsContent value="problems">
                    <Card>
                        <CardHeader>
                            <CardTitle>Problem Statistics</CardTitle>
                            <CardDescription>Submission statistics by problem</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {problemStats.map((problem) => (
                                    <div key={problem.id} className="space-y-2">
                                        <div className="flex justify-between">
                                            <div className="font-medium">
                                                Problem {String.fromCharCode(65 + problem.id)}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {problem.accepted}/{problem.total} ({problem.acceptanceRate.toFixed(1)}%)
                                            </div>
                                        </div>
                                        <Progress value={problem.acceptanceRate} className="h-2" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="participants">
                    <Card>
                        <CardHeader>
                            <CardTitle>Participant List</CardTitle>
                            <CardDescription>All participants in this contest</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {Object.entries(contestData.participants).map(([id, [username, displayName, avatar]]) => (
                                    <div key={id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                                            <img
                                                src={avatar || "/placeholder.svg"}
                                                alt={displayName}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <div className="font-medium">{displayName}</div>
                                            <div className="text-sm text-muted-foreground">{username}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
            </Tabs>
        </div>
    )
}
