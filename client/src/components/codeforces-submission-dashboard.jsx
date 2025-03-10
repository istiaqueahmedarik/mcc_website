"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchCodeforcesSubmissionData } from "@/lib/codeforces"
import SubmissionChart from "@/components/submission-chart"
import SubmissionStats from "@/components/submission-stats"
import SubmissionList from "@/components/submission-list"
import { Button } from "@/components/ui/button"
import { AlertCircle, CalendarIcon, RefreshCw } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import { Slider } from "@/components/ui/slider"

export default function CodeforcesSubmissionDashboard({ users }) {
    const [selectedUser, setSelectedUser] = useState(users[0]?.cf_id || "")
    const [contestId, setContestId] = useState("all")
    const [days, setDays] = useState(7)
    const [dateRange, setDateRange] = useState(subDays(new Date(), days))
    const [submissionData, setSubmissionData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Set default selected user when users prop changes
        if (users.length > 0 && !selectedUser) {
            setSelectedUser(users[0].cf_id)
        }
    }, [users, selectedUser])

    const loadData = async () => {
        if (!selectedUser) return

        setLoading(true)
        try {
            const data = await fetchCodeforcesSubmissionData(selectedUser, contestId, days)
            setSubmissionData(data)
        } catch (error) {
            console.error("Error loading data:", error)
            setSubmissionData(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (selectedUser) {
            loadData()
        }
    }, [selectedUser, contestId, days])

    const handleDaysChange = (value) => {
        const newDays = value[0]
        setDays(newDays)
        setDateRange(subDays(new Date(), newDays))
    }

    const handleDateChange = (date) => {
        if (date) {
            setDateRange(date)
            const now = new Date()
            const diffTime = Math.abs(now.getTime() - date.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            setDays(diffDays)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Codeforces Submission Analysis</h2>
                    <p className="text-muted-foreground">Track submission patterns and performance</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                            {users.map(user => (
                                <SelectItem key={user.id} value={user.cf_id}>
                                    {user.full_name} ({user.cf_id})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={contestId} onValueChange={setContestId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select contest" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Contests</SelectItem>
                            <SelectItem value="1898">Educational Codeforces Round 163</SelectItem>
                            <SelectItem value="1899">Codeforces Round 911</SelectItem>
                            {/* Add more contests as needed */}
                        </SelectContent>
                    </Select>

                    <Button onClick={loadData} variant="outline" size="icon">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card className="p-4">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium">Time Period: Last {days} days</h3>
                            <p className="text-sm text-muted-foreground">Adjust the slider to change the time period</p>
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange ? format(dateRange, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={dateRange} onSelect={handleDateChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Slider defaultValue={[days]} max={30} min={1} step={1} onValueChange={handleDaysChange} className="w-full" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1 day</span>
                        <span>15 days</span>
                        <span>30 days</span>
                    </div>
                </div>
            </Card>

            {loading ? (
                <Card>
                    <CardContent className="pt-6 flex justify-center items-center h-[400px]">
                        <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                            <p className="text-muted-foreground">Loading submission data...</p>
                        </div>
                    </CardContent>
                </Card>
            ) : submissionData ? (
                <Tabs defaultValue="chart">
                    <TabsList className="mb-4">
                        <TabsTrigger value="chart">Submission Chart</TabsTrigger>
                        <TabsTrigger value="stats">Statistics</TabsTrigger>
                        <TabsTrigger value="list">Submission List</TabsTrigger>
                    </TabsList>
                    <TabsContent value="chart">
                        <Card>
                            <CardHeader>
                                <CardTitle>Submission Activity</CardTitle>
                                <CardDescription>Submissions over the last {days} days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SubmissionChart data={submissionData.dailySubmissions} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="stats">
                        <SubmissionStats stats={submissionData.stats} />
                    </TabsContent>
                    <TabsContent value="list">
                        <SubmissionList
                            personalSubmissions={submissionData.personalSubmissions}
                            contestSubmissions={submissionData.contestSubmissions}
                        />
                    </TabsContent>
                </Tabs>
            ) : (
                <Card>
                    <CardContent className="pt-6 flex justify-center items-center h-[200px]">
                        <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No data available</p>
                            <p className="text-xs text-muted-foreground max-w-md text-center">
                                Make sure the Codeforces handle is correct and the user has public submissions.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
