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
    <div className="profile-card transition-all duration-300 hover:shadow-xl">
      <h3 
        className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8"
        style={{ color: "hsl(var(--profile-text))" }}
      >
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
        className="space-y-6 sm:space-y-8"
      >
        <div className="space-y-3">
          <label 
            className="block text-sm font-bold"
            style={{ color: "hsl(var(--profile-text))" }}
          >
            Team Title
          </label>
          <input
            name="team_title"
            required
            defaultValue={myChoice?.team_title || ""}
            placeholder="Enter a unique team title"
            className="w-full px-4 py-3 sm:py-3.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 profile-focus-ring text-sm sm:text-base"
            style={{ 
              background: "hsl(var(--profile-surface-1))",
              borderColor: "hsl(var(--profile-border))",
              color: "hsl(var(--profile-text))"
            }}
          />
          <p 
            className="text-xs sm:text-sm px-4 py-2.5 rounded-lg"
            style={{ 
              background: "hsl(var(--profile-surface-2))",
              color: "hsl(var(--profile-text-muted))"
            }}
          >
            ℹ️ If you&apos;re the first member, your team title becomes official. You can request changes before finalization.
          </p>
        </div>

        {isParticipant ? (
          <div className="space-y-4">
            <label 
              className="block text-sm font-bold"
              style={{ color: "hsl(var(--profile-text))" }}
            >
              Select and Order Your Preferred Teammates (choose {UI_MIN}-{UI_MAX})
            </label>
            <div 
              className="rounded-xl p-4 sm:p-6 border"
              style={{ 
                background: "hsl(var(--profile-surface-2))",
                borderColor: "hsl(var(--profile-border))"
              }}
            >
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
            <p 
              className="text-xs sm:text-sm px-4 py-2.5 rounded-lg"
              style={{ 
                background: "hsl(var(--profile-surface-2))",
                color: "hsl(var(--profile-text-muted))"
              }}
            >
              📋 Pick {UI_MIN}–{UI_MAX} teammates within an effective score window of ±5. Higher-ranked selections override
              yours; you&apos;ll receive the next available names from your ordered list.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <label 
              className="block text-sm font-bold"
              style={{ color: "hsl(var(--profile-text))" }}
            >
              Propose Teammates
            </label>
            <input
              name="choices"
              defaultValue={Array.isArray(myChoice?.ordered_choices) ? myChoice.ordered_choices.join(",") : ""}
              placeholder="e.g. alice,bob,charlie"
              className="w-full px-4 py-3 sm:py-3.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 profile-focus-ring text-sm sm:text-base"
              style={{ 
                background: "hsl(var(--profile-surface-1))",
                borderColor: "hsl(var(--profile-border))",
                color: "hsl(var(--profile-text))"
              }}
            />
            <p 
              className="text-xs sm:text-sm px-4 py-2.5 rounded-lg"
              style={{ 
                background: "hsl(var(--profile-surface-2))",
                color: "hsl(var(--profile-text-muted))"
              }}
            >
              👤 You&apos;re not on the participant list. Propose teammates by vjudge ID for admin review.
            </p>
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={isPending || (isParticipant && selectedCount < SUBMIT_MIN)}
            className="w-full font-bold py-3.5 sm:py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm sm:text-base"
            style={{ 
              background: isPending || (isParticipant && selectedCount < SUBMIT_MIN) 
                ? "hsl(var(--profile-text-muted))" 
                : "hsl(var(--profile-primary))",
              color: "white",
            }}
          >
            {isPending ? (myChoice ? "Updating..." : "Submitting...") : myChoice ? "Update Selection" : "Submit Choices"}
          </button>
        </div>
        {isParticipant && selectedCount < SUBMIT_MIN && (
          <p 
            className="text-center text-xs sm:text-sm font-semibold mt-2"
            style={{ color: "hsl(var(--profile-danger))" }}
          >
            Select at least {SUBMIT_MIN} teammates before submitting.
          </p>
        )}
        <div 
          className="rounded-xl p-4 border"
          style={{ 
            background: "hsl(var(--profile-warning) / 0.05)",
            borderColor: "hsl(var(--profile-warning) / 0.2)"
          }}
        >
          <p 
            className="text-xs sm:text-sm leading-relaxed"
            style={{ color: "hsl(var(--profile-text-secondary))" }}
          >
            ⚠️ <strong>Important:</strong> If insufficient members remain when your turn comes, you may not get a full team.
            Higher-ranked selections take precedence. Contact admin for assistance if needed.
          </p>
        </div>
      </form>
    </div>
  );
}
