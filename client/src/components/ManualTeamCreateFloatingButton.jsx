"use client";

import ManualTeamCreatePanel from "@/components/ManualTeamCreatePanel";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";

export default function ManualTeamCreateFloatingButton({ collectionId }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="fixed bottom-6 right-6 z-40 rounded-lg h-12 px-4 shadow-lg gap-2"
        >
          <Plus className="h-4 w-4" /> Create Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Team Manually</DialogTitle>
          <DialogDescription>
            Team name is required. Search and select up to 3 members.
          </DialogDescription>
        </DialogHeader>
        <ManualTeamCreatePanel collectionId={collectionId} />
      </DialogContent>
    </Dialog>
  );
}
