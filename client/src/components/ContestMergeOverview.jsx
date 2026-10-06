"use client";

import { useId, useState } from "react";
import { ChevronDown, FunctionSquare, GitMerge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DEFAULT_COMPOSITE_FORMULA = "sum(raw_score)";
const DEFAULT_COMPOSITE_PENALTY_FORMULA = "sum(penalty)";

function contestItemId(contest) {
  return String(contest?.id || contest?.contestRoomContestId || "");
}

function contestTitle(contest, fallback = "") {
  return String(contest?.title || contest?.contest_name || contest?.name || contest?.externalContestId || contest?.contest_id || fallback || "Contest");
}

function contestKey(contest, fallback = "") {
  return String(contest?.formulaKey || contest?.formula_key || contest?.externalContestId || contest?.external_contest_id || contest?.contest_id || fallback || "");
}

function groupKey(group) {
  return String(group?.formulaKey || group?.formula_key || "");
}

function groupMemberIds(group) {
  const ids = group?.contestItemIds || group?.contest_item_ids || [];
  return Array.isArray(ids) ? ids.map(String).filter(Boolean) : [];
}

export default function ContestMergeOverview({
  contests = [],
  groups = [],
  className = "",
  title = "Merge groups",
}) {
  const contentId = useId();
  const [open, setOpen] = useState(true);
  const visibleGroups = Array.isArray(groups)
    ? groups.filter((group) => groupKey(group) && groupMemberIds(group).length > 0)
    : [];

  if (visibleGroups.length === 0) return null;

  const contestById = new Map((Array.isArray(contests) ? contests : []).map((contest) => [contestItemId(contest), contest]));

  return (
    <section className={cn("rounded-lg border bg-card p-4", className)}>
      <button
        type="button"
        className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md text-left outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <GitMerge className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{visibleGroups.length} composite result units</p>
          </div>
        </div>
        <span className="flex items-center gap-2">
          <Badge variant="secondary">{visibleGroups.length}</Badge>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open ? "rotate-180" : "rotate-0")} />
        </span>
      </button>

      {!open && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {visibleGroups.slice(0, 6).map((group) => (
            <Badge key={groupKey(group)} variant="outline" className="max-w-full truncate font-mono">
              {groupKey(group)}
            </Badge>
          ))}
          {visibleGroups.length > 6 && (
            <Badge variant="secondary">+{visibleGroups.length - 6}</Badge>
          )}
        </div>
      )}

      {open && (
        <div
          id={contentId}
          className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,28rem),1fr))]"
        >
          {visibleGroups.map((group) => {
            const memberIds = groupMemberIds(group);
            const members = memberIds.map((id) => {
              const contest = contestById.get(id);
              return {
                id,
                title: contestTitle(contest, id),
                key: contestKey(contest, id),
              };
            });

            return (
              <div key={groupKey(group)} className="rounded-md border bg-muted/20 p-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{group.name || "Composite"}</p>
                  <Badge variant="outline" className="max-w-full truncate font-mono">
                    {groupKey(group)}
                  </Badge>
                </div>
                <div className="mt-2 grid gap-1.5 rounded-md bg-background px-2.5 py-2 text-xs">
                  <div className="flex min-w-0 items-start gap-2">
                    <FunctionSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="shrink-0 font-medium">Solved</span>
                    <code className="min-w-0 break-words text-muted-foreground">
                      {group.solvedScoreFormula || group.formula || DEFAULT_COMPOSITE_FORMULA}
                    </code>
                  </div>
                  <div className="flex min-w-0 items-start gap-2 pl-[1.375rem]">
                    <span className="shrink-0 font-medium">Penalty</span>
                    <code className="min-w-0 break-words text-muted-foreground">
                      {group.penaltyScoreFormula || DEFAULT_COMPOSITE_PENALTY_FORMULA}
                    </code>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5 border-l pl-3">
                  {members.map((member, index) => (
                    <div key={`${groupKey(group)}-${member.id}`} className="grid grid-cols-[2rem,minmax(0,1fr),auto] items-center gap-2 rounded-md bg-background px-2.5 py-2 text-sm">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">#{index + 1}</span>
                      <span className="min-w-0 truncate font-medium">{member.title}</span>
                      <span className="max-w-[10rem] truncate font-mono text-xs text-muted-foreground">{member.key}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
