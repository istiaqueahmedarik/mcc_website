"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { editBatch } from "@/lib/action";
import { Soup } from "lucide-react";
import { useActionState, useState } from "react";

const initialState = {
  message: "",
  success: false,
};

export default function Edit({ batch, ins }) {
  initialState.batch_id = batch.id;
  const [insEmails, setInsEmails] = useState(ins);
  const [state, formAction, pending] = useActionState(editBatch, initialState);
  const [batchName, setBatchName] = useState(batch.name);

  return (
    <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Edit Batch</CardTitle>
          <CardDescription>Edit this batch</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <div className="relative">
                <Soup className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Name of the batch"
                  className="pl-10"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />
              </div>
            </div>

            {insEmails.map((email, index) => (
              <div key={index} className="space-y-2">
                <Label htmlFor={`instructor-${index}`}>
                  Instructor {index + 1} Email
                </Label>
                <Input
                  type="email"
                  id={`instructor-${index}`}
                  name={`instructor-${index}`}
                  value={email}
                  onChange={(e) => {
                    const newEmails = [...insEmails];
                    newEmails[index] = e.target.value;
                    setInsEmails(newEmails);
                  }}
                />
              </div>
            ))}

            <div className="w-full flex items-center justify-center">
              <Button
                onClick={() => setInsEmails([...insEmails, ""])}
                type="button"
              >
                {" "}
                + Add Instructor
              </Button>
            </div>

            {state?.message && (
              <Alert variant={state?.success ? "default" : "destructive"}>
                <AlertDescription>{state?.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Submitting..." : "Confirm Edit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
