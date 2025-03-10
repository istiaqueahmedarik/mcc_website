"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export default function SubmissionList({ personalSubmissions, contestSubmissions }) {
    const [page, setPage] = useState(1)
    const pageSize = 10

    const formatDate = (timestamp) => {
        try {
            return format(new Date(timestamp), "MMM dd, yyyy HH:mm:ss")
        } catch (e) {
            return "Invalid date"
        }
    }

    const getStatusBadge = (status) => {
        if (status === "Accepted") {
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Accepted</Badge>
        } else if (status === "Wrong Answer") {
            return <Badge variant="destructive">Wrong Answer</Badge>
        } else {
            return <Badge variant="outline">{status}</Badge>
        }
    }

    const renderSubmissionTable = (submissions) => {
        const startIndex = (page - 1) * pageSize
        const paginatedSubmissions = submissions.slice(startIndex, startIndex + pageSize)

        return (
            <div className="space-y-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Problem</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Language</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedSubmissions.length > 0 ? (
                            paginatedSubmissions.map((submission) => (
                                <TableRow key={submission.id}>
                                    <TableCell>{formatDate(submission.time)}</TableCell>
                                    <TableCell>
                                        <a
                                            href={submission.problemUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            {submission.problemName || "Unknown Problem"}
                                        </a>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                                    <TableCell>{submission.language}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">
                                    No submissions found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {submissions.length > pageSize && (
                    <div className="flex justify-center gap-2 mt-4">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 rounded border disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1">
                            Page {page} of {Math.ceil(submissions.length / pageSize)}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(Math.ceil(submissions.length / pageSize), page + 1))}
                            disabled={page >= Math.ceil(submissions.length / pageSize)}
                            className="px-3 py-1 rounded border disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Submissions</CardTitle>
                <CardDescription>View your recent problem submissions</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="all" onValueChange={() => setPage(1)}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="all">All Submissions</TabsTrigger>
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                        <TabsTrigger value="contest">Contest</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all">
                        {renderSubmissionTable([...personalSubmissions, ...contestSubmissions].sort((a, b) => b.time - a.time))}
                    </TabsContent>

                    <TabsContent value="personal">
                        {renderSubmissionTable([...personalSubmissions].sort((a, b) => b.time - a.time))}
                    </TabsContent>

                    <TabsContent value="contest">
                        {renderSubmissionTable([...contestSubmissions].sort((a, b) => b.time - a.time))}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}

