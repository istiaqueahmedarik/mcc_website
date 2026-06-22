"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteContestRoomContest } from "@/actions/contest_details";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function DeleteContestButton({
  contestRoomContestId,
  contestName,
  className,
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDelete = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await deleteContestRoomContest(contestRoomContestId);
      if (res && (res.success || res.status === "success")) {
        setOpen(false);
        router.refresh();
        return;
      }

      setErrorMessage(res?.error || res?.message || "Failed to delete contest");
    } catch (_) {
      setErrorMessage("Failed to delete contest");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Contest</DialogTitle>
          <DialogDescription>
            This will remove {contestName ? `"${contestName}"` : "this contest"} from this room.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Yes, Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
