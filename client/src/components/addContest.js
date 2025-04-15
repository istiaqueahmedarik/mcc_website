"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { addContestAction } from "@/lib/addContestAction";
import { toast } from "sonner";

export function AddContestForm() {
        const [contestId, setContestId] = useState("");
        const [isPending, startTransition] = useTransition();

        const handleSubmit = (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                startTransition(async () => {
                    try {
                        const formData = new FormData(form);
                        formData.append("sessionId", localStorage.getItem("vjudge_session"));
                        const contestData = await addContestAction(formData);
                                
                                // Save contest to localStorage
                                const savedContests = localStorage.getItem("monitored_contests");
                                const contests = savedContests ? JSON.parse(savedContests) : [];
                                
                                if (contests.some((c) => c.id === contestId)) {
                                        toast("Event has been created.");
                                        return;
                                }
                                
                                contests.push({
                                        id: contestId,
                                        title: contestData.title,
                                        addedAt: new Date().toISOString(),
                                });
                                localStorage.setItem("monitored_contests", JSON.stringify(contests));
                                
                                toast("Event has been created.");
                                
                                setContestId("");
                                form.reset();
                        } catch (error) {
                                toast("Event has been created.");
                        }
                });
        };

        return (
                <Card>
                        <CardHeader>
                                <CardTitle>Add Contest</CardTitle>
                                <CardDescription>Enter a VJudge contest ID to start monitoring</CardDescription>
                        </CardHeader>
                        <CardContent>
                                <form onSubmit={handleSubmit} className="flex items-end gap-4">
                                        <div className="flex-1 space-y-2">
                                                <Label htmlFor="contest-id">Contest ID</Label>
                                                <Input
                                                        id="contest-id"
                                                        name="contestId"
                                                        placeholder="e.g. 707325"
                                                        value={contestId}
                                                        onChange={(e) => setContestId(e.target.value)}
                                                        required
                                                />
                                        </div>
                                        <Button type="submit" disabled={isPending}>
                                                {isPending ? "Adding..." : "Add Contest"}
                                        </Button>
                                </form>
                        </CardContent>
                </Card>
        );
}
