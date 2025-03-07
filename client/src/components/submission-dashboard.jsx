"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchSubmissionData } from "@/lib/vjudge"
import SubmissionChart from "@/components/submission-chart"
import SubmissionStats from "@/components/submission-stats"
import SubmissionList from "@/components/submission-list"
import { Button } from "@/components/ui/button"
import { AlertCircle, CalendarIcon, Key, RefreshCw, Settings } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, subDays } from "date-fns"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

export default function SubmissionDashboard() {
    const [username, setUsername] = useState("arif_sadik24")
    const [contestId, setContestId] = useState("696631")
    const [days, setDays] = useState(7)
    const [dateRange, setDateRange] = useState(subDays(new Date(), days))
    const [submissionData, setSubmissionData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [sessionId, setSessionId] = useState("")
    const [sessionActive, setSessionActive] = useState(false)

    useEffect(() => {
        const savedSessionId = localStorage.getItem("vjudge_session_id")
        if (savedSessionId) {
            setSessionId(savedSessionId)
            setSessionActive(true)
        }
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const data = await fetchSubmissionData(username, contestId, days, sessionId)
            setSubmissionData(data)
        } catch (error) {
            console.error("Error loading data:", error)
            setSubmissionData(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [username, contestId, days, sessionId])

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

    const handleSessionIdSave = (newSessionId) => {
        setSessionId(newSessionId)
        localStorage.setItem("vjudge_session_id", newSessionId)
        setSessionActive(!!newSessionId)
    }

    const clearSessionId = () => {
        setSessionId("")
        localStorage.removeItem("vjudge_session_id")
        setSessionActive(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold">Submission Analysis</h2>
                    <p className="text-muted-foreground">Track submission patterns and performance</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Select value={username} onValueChange={setUsername}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                            {/* ekhane change kora lagbe */}
                            <SelectItem value="arif_sadik24">arif_sadik24</SelectItem>
                            <SelectItem value="Mantaka_Mahir">Mantaka_Mahir</SelectItem>

                        </SelectContent>
                    </Select>

                    <Select value={contestId} onValueChange={setContestId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select contest" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="696631">Contest #696631</SelectItem>
                        </SelectContent>
                    </Select>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" title="Session Settings">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>VJudge Session Settings</DialogTitle>
                                <DialogDescription>
                                    Enter your VJudge session ID to access private contests and submissions.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="sessionId">JSESSIONID</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="sessionId"
                                            placeholder="JSESSIONID=abc123..."
                                            defaultValue={sessionId}
                                            className="flex-1"
                                        />
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                const input = document.getElementById("sessionId")
                                                handleSessionIdSave(input.value)
                                            }}
                                        >
                                            Save
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Find this in your browser cookies after logging into VJudge.
                                    </p>
                                </div>
                                {sessionActive && (
                                    <Alert>
                                        <Key className="h-4 w-4" />
                                        <AlertDescription className="flex items-center justify-between">
                                            <span>Session ID is active</span>
                                            <Button variant="outline" size="sm" onClick={clearSessionId}>
                                                Clear
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                            <DialogFooter>
                                <Button onClick={loadData}>Apply & Reload Data</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Button onClick={loadData} variant="outline" size="icon">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                    Settings
                    {sessionActive && (
                        <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                            <Key className="h-3 w-3 mr-1" /> Session Active
                        </Badge>
                    )}
                </h3>
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
                                If you're trying to access private contests or submissions, try adding your VJudge session ID in the
                                settings.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

