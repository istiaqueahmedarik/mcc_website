"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import SubmissionDashboard from "./submission-dashboard"
import CodeforcesSubmissionDashboard from "./codeforces-submission-dashboard"
import BatchStatistics from "./batch-statistics"

export default function PerformanceDashboard({ users }) {
    const [platform, setPlatform] = useState("batch")
    const [days, setDays] = useState(7)
    const [contestId, setContestId] = useState("")
    const [sessionId, setSessionId] = useState("")

    // Filter users with valid platform IDs
    const vjudgeUsers = users.filter((user) => user.vjudge_id)
    const codeforcesUsers = users.filter((user) => user.cf_id)

    return (
        <div className="space-y-6">
            <Tabs defaultValue="batch" onValueChange={setPlatform}>
                <TabsList>
                    <TabsTrigger value="batch">Batch Statistics</TabsTrigger>
                    <TabsTrigger value="vjudge">VJudge</TabsTrigger>
                    <TabsTrigger value="codeforces">Codeforces</TabsTrigger>
                </TabsList>

                <TabsContent value="batch">
                    <BatchStatistics users={users} contestId={contestId} days={days} sessionId={sessionId} />
                </TabsContent>

                <TabsContent value="vjudge">
                    {vjudgeUsers.length > 0 ? (
                        <SubmissionDashboard
                            users={vjudgeUsers}
                            onDaysChange={setDays}
                            onContestIdChange={setContestId}
                            onSessionIdChange={setSessionId}
                        />
                    ) : (
                        <div className="p-8 text-center border rounded-lg">
                            <p className="text-muted-foreground">No users with VJudge IDs found in this batch</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="codeforces">
                    {codeforcesUsers.length > 0 ? (
                        <CodeforcesSubmissionDashboard users={codeforcesUsers} onDaysChange={setDays} />
                    ) : (
                        <div className="p-8 text-center border rounded-lg">
                            <p className="text-muted-foreground">No users with Codeforces IDs found in this batch</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}

