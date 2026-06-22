"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteContestRoom } from "@/actions/contest_details";
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

export default function DeleteRoomButton({ roomId, roomName }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDelete = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await deleteContestRoom(roomId);
      if (res && (res.success || res.status === "success")) {
        setOpen(false);
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/contests_report/details");
        }
        router.refresh();
        return;
      }

      setErrorMessage(res?.error || res?.message || "Failed to delete room");
    } catch (_) {
      setErrorMessage("Failed to delete room");
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
          className="rounded-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Room
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Room</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {roomName ? `"${roomName}"` : "this room"}? This action cannot be undone.
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
