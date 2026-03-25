"use client";
import { TeamActionForm } from "@/components/TeamActionForm";
import { useState } from "react";

export function CollectionNameEditor({ id, name, renameAction }) {
  const [open, setOpen] = useState(false);

  return (
    <details
      open={open}
      className="shrink-0 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary
        className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-md border border-border/70 bg-background/60 hover:bg-muted transition-colors"
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        {open ? "Close" : "Edit"}
      </summary>
      {open && (
        <div className="mt-3">
          <TeamActionForm
            action={renameAction}
            pending="Renaming..."
            success="Collection renamed"
            error="Failed to rename"
            onSuccess={() => setOpen(false)}
          >
            <input type="hidden" name="id" value={id} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                name="title"
                defaultValue={name ?? ""}
                placeholder="Collection name"
                className="flex-1 rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wide hover:bg-primary/90 transition-all"
              >
                Save
              </button>
            </div>
          </TeamActionForm>
        </div>
      )}
    </details>
  );
}
