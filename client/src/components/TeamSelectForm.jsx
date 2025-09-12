"use client";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import DragOrder from "@/components/drag-order";
import { useRouter } from "next/navigation";

export function TeamSelectForm({ submitAction, myChoice, isParticipant, eligible, performance, UI_MIN, UI_MAX, SUBMIT_MIN, SUBMIT_MAX, token }) {
  const [isPending, startTransition] = useTransition();
  const [selectedCount, setSelectedCount] = useState(Array.isArray(myChoice?.ordered_choices) ? myChoice.ordered_choices.length : 0)
  const router = useRouter();

  return (
    <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
      <h3 className="text-2xl font-semibold text-card-foreground mb-6">
        {myChoice ? "Update Your Selection" : "Make Your Selection"}
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          // Append constants for server-side validation if needed
          fd.append("_min", String(SUBMIT_MIN));
          fd.append("_max", String(SUBMIT_MAX));
          const id = toast.loading(myChoice ? "Updating selection..." : "Submitting selection...");
          startTransition(async () => {
            try {
              await submitAction(fd);
              toast.success("Selection saved", { id });
              router.refresh();
            } catch (err) {
              console.error(err);
              toast.error("Failed to submit selection", { id });
            }
          });
        }}
        className="space-y-8"
      >
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-card-foreground">Team Title</label>
          <input
            name="team_title"
            required
            defaultValue={myChoice?.team_title || ""}
            placeholder="Enter a unique team title"
            className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
          />
          <p className="text-xs text-muted-foreground bg-muted/30 px-4 py-2 rounded-xl">
            ℹ️ If you’re the first member, your team title becomes official. You can request changes before finalization.
          </p>
        </div>

        {isParticipant ? (
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-card-foreground">
              Select and Order Your Preferred Teammates (choose {UI_MIN}-{UI_MAX})
            </label>
            <div className="bg-muted/30 rounded-2xl p-6">
              <DragOrder
                candidates={eligible}
                name="choices"
                min={UI_MIN}
                max={UI_MAX}
                initial={Array.isArray(myChoice?.ordered_choices) ? myChoice.ordered_choices.filter((x) => eligible.includes(x)) : []}
                performance={performance}
                onChange={(list)=> setSelectedCount(list.length)}
              />
            </div>
            <p className="text-xs text-muted-foreground bg-muted/30 px-4 py-2 rounded-xl">
              📋 Pick {UI_MIN}–{UI_MAX} teammates within an effective score window of ±5. Higher-ranked selections override
              yours; you’ll receive the next available names from your ordered list.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-card-foreground">Propose Teammates</label>
            <input
              name="choices"
              defaultValue={Array.isArray(myChoice?.ordered_choices) ? myChoice.ordered_choices.join(",") : ""}
              placeholder="e.g. alice,bob,charlie"
              className="w-full bg-input border border-border rounded-2xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            />
            <p className="text-xs text-muted-foreground bg-muted/30 px-4 py-2 rounded-xl">
              👤 You’re not on the participant list. Propose teammates by vjudge ID for admin review.
            </p>
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={isPending || (isParticipant && selectedCount < SUBMIT_MIN)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-6 rounded-2xl transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {isPending ? (myChoice ? "Updating..." : "Submitting...") : myChoice ? "Update Selection" : "Submit Choices"}
          </button>
        </div>
        {isParticipant && selectedCount < SUBMIT_MIN && (
          <p className="text-center text-xs text-destructive font-medium mt-2">Select at least {SUBMIT_MIN} teammates before submitting.</p>
        )}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            ⚠️ <strong>Important:</strong> If insufficient members remain when your turn comes, you may not get a full team.
            Higher-ranked selections take precedence. Contact admin for assistance if needed.
          </p>
        </div>
      </form>
    </div>
  );
}
