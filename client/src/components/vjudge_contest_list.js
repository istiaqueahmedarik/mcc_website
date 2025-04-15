"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export function ContestList({ activeContest, setActiveContest }) {
    const [contests, setContests] = useState([]);

    useEffect(() => {
        // Load saved contests from localStorage
        const savedContests = localStorage.getItem("monitored_contests");
        if (savedContests) {
            setContests(JSON.parse(savedContests));
        }
    }, []);

    const handleRemoveContest = (id) => {
        const updatedContests = contests.filter((contest) => contest.id !== id);
        setContests(updatedContests);
        localStorage.setItem("monitored_contests", JSON.stringify(updatedContests));

        // If removing active contest, set a new active contest or null
        if (activeContest === id) {
            setActiveContest(updatedContests.length > 0 ? updatedContests[0].id : null);
        }
        
        toast("Event has been created.");
    };

    if (contests.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No Contests</CardTitle>
                    <CardDescription>You haven&apos;t added any contests to monitor yet</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Monitored Contests</CardTitle>
                <CardDescription>Select a contest to view detailed statistics</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {contests.map((contest) => (
                        <div
                            key={contest.id}
                            className={`flex items-center justify-between p-3 rounded-md ${
                                activeContest === contest.id ? "bg-muted" : "hover:bg-muted/50"
                            }`}
                        >
                            <div className="flex-1 cursor-pointer" onClick={() => setActiveContest(contest.id)}>
                                <h3 className="font-medium">{contest.title}</h3>
                                <p className="text-sm text-muted-foreground">ID: {contest.id}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveContest(contest.id)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove</span>
                            </Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
