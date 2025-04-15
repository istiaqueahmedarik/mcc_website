import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButton } from "./export-button";

"use client";


export function MergedResultsTable({ results, isLoading = false }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredResults = results.filter(
        (result) =>
            result.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            result.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Prepare data for export
    const exportData = filteredResults.map((result) => ({
        Rank: result.rank,
        Username: result.username,
        Name: result.name,
        Solved: result.solved,
        Penalty: result.penalty,
    }));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Search by name or username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-[300px]"
                    />
                    <Button variant="outline" onClick={() => setSearchTerm("")} disabled={!searchTerm}>
                        Clear
                    </Button>
                </div>
                <ExportButton
                    data={exportData}
                    filename="vjudge_contest_results"
                    disabled={isLoading || results.length === 0}
                />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Rank</TableHead>
                            <TableHead>Participant</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead className="text-right">Solved</TableHead>
                            <TableHead className="text-right">Penalty</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredResults.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {isLoading ? "Loading results..." : "No results found."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredResults.map((result) => (
                                <TableRow key={result.username}>
                                    <TableCell className="font-medium">{result.rank}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {result.avatar && (
                                                <img
                                                    src={result.avatar || "/placeholder.svg"}
                                                    alt={result.name}
                                                    className="h-6 w-6 rounded-full"
                                                />
                                            )}
                                            {result.name || "Unknown"}
                                        </div>
                                    </TableCell>
                                    <TableCell>{result.username}</TableCell>
                                    <TableCell className="text-right">{result.solved}</TableCell>
                                    <TableCell className="text-right">{result.penalty}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}