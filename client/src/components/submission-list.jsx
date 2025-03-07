"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"


export default function SubmissionList({ personalSubmissions, contestSubmissions }) {
    const [searchTerm, setSearchTerm] = useState("")

    const filterSubmissions = (submissions) => {
        if (!searchTerm) return submissions

        return submissions.filter(
            (submission) =>
                submission.probNum?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                submission.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                submission.oj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                submission.language?.toLowerCase().includes(searchTerm.toLowerCase()),
        )
    }

    const filteredPersonal = filterSubmissions(personalSubmissions)
    const filteredContest = filterSubmissions(contestSubmissions)

    const getStatusColor = (status) => {
        if (status === "Accepted") return "bg-green-500"
        if (status.includes("Wrong")) return "bg-red-500"
        if (status.includes("Time Limit")) return "bg-yellow-500"
        if (status.includes("Memory Limit")) return "bg-orange-500"
        if (status.includes("Compilation")) return "bg-purple-500"
        return "bg-gray-500"
    }

    const renderSubmissionTable = (submissions) => {
        if (!submissions || submissions.length === 0) {
            return <div className="py-8 text-center text-muted-foreground">No submissions found</div>
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Problem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Language</TableHead>
                        <TableHead>Runtime</TableHead>
                        <TableHead>Memory</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {submissions.map((submission) => {
                        // Ensure submission.time is valid
                        const submissionTime = submission.time ? new Date(submission.time) : null
                        const isValidTime = submissionTime && !isNaN(submissionTime.getTime())

                        return (
                            <TableRow key={submission.runId}>
                                <TableCell>{isValidTime ? format(submissionTime, "MMM dd, yyyy HH:mm") : "Invalid date"}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{submission.problemId}</div>
                                    <div className="text-xs text-muted-foreground">{submission.oj}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={getStatusColor(submission.status)}>{submission.status}</Badge>
                                </TableCell>
                                <TableCell>{submission.language || "Unknown"}</TableCell>
                                <TableCell>{submission.runtime ? `${submission.runtime} ms` : "N/A"}</TableCell>
                                <TableCell>{submission.memory ? `${submission.memory} KB` : "N/A"}</TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Submission List</CardTitle>
                <CardDescription>View all submissions for the selected time period</CardDescription>
                <div className="relative mt-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by problem, status, or language..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="all">
                    <TabsList className="mb-4">
                        <TabsTrigger value="all">All ({personalSubmissions.length + contestSubmissions.length})</TabsTrigger>
                        <TabsTrigger value="personal">Personal ({personalSubmissions.length})</TabsTrigger>
                        <TabsTrigger value="contest">Contest ({contestSubmissions.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">
                        {renderSubmissionTable([...filteredPersonal, ...filteredContest].sort((a, b) => b.time - a.time))}
                    </TabsContent>
                    <TabsContent value="personal">
                        {renderSubmissionTable(filteredPersonal.sort((a, b) => b.time - a.time))}
                    </TabsContent>
                    <TabsContent value="contest">
                        {renderSubmissionTable(filteredContest.sort((a, b) => b.time - a.time))}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}

