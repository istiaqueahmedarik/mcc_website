"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export function CollectionCopyButton({ id, defaultName, copyAction }) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName || "");

  const submitCopy = (customName) => {
    const fd = new FormData();
    fd.append("collection_id", id);
    fd.append("title", customName);
    startTransition(async () => {
      const toastId = toast.loading("Copying collection...");
      try {
        await copyAction(fd);
        toast.success("Collection copied", { id: toastId });
        setOpen(false);
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "Failed to copy collection", { id: toastId });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setName(defaultName || "");
          setOpen(true);
        }}
        disabled={isPending}
        className="px-3 py-1.5 rounded-md border border-border/70 bg-background/60 text-xs font-semibold uppercase tracking-wide hover:bg-muted transition-colors disabled:opacity-60"
      >
        Copy
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Copy Collection</h3>
              <button
                type="button"
                className="text-xs px-2 py-1 rounded-md hover:bg-muted"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitCopy(name || defaultName || "");
              }}
              className="space-y-3"
            >
              <label className="text-xs font-medium text-muted-foreground">
                New collection name
              </label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Collection name"
                className="w-full rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2 rounded-md border border-border text-xs font-semibold uppercase tracking-wide hover:bg-muted disabled:opacity-60"
                  disabled={isPending}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  Copy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
