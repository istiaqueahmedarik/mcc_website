"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Edit3, Search, Trash2, UserCog, UserMinus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function TeamCardActionsInline({
  collectionId,
  teamTitle,
  members,
  coachVjudgeId,
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [memberList, setMemberList] = useState((members || []).map(String));
  const [coach, setCoach] = useState(coachVjudgeId ? String(coachVjudgeId) : "");
  const [newTitle, setNewTitle] = useState(teamTitle || "");

  useEffect(() => {
    setMemberList((members || []).map(String));
  }, [members]);

  useEffect(() => {
    setCoach(coachVjudgeId ? String(coachVjudgeId) : "");
  }, [coachVjudgeId]);

  const searchUsers = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { searchUsersClient } = await import("@/actions/team_collection");
      const res = await searchUsersClient(q.trim());
      setResults(Array.isArray(res?.result) ? res.result : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      searchUsers(query);
    }, 350);
    return () => clearTimeout(t);
  }, [query, searchUsers]);

  const memberSet = useMemo(() => new Set(memberList.map(String)), [memberList]);

  async function deleteTeam() {
    if (!window.confirm(`Delete team \"${teamTitle}\"? This cannot be undone.`)) {
      return;
    }
    setPending(true);
    const tid = toast.loading("Deleting team...");
    try {
      const { adminDeleteTeam } = await import("@/actions/team_collection");
      await adminDeleteTeam(collectionId, teamTitle);
      toast.success("Team deleted", { id: tid });
      setOpen(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete team", { id: tid });
    } finally {
      setPending(false);
    }
  }

  async function renameTeam() {
    const title = String(newTitle || "").trim();
    if (!title || title === teamTitle) return;
    setPending(true);
    const tid = toast.loading("Renaming team...");
    try {
      const { adminRenameTeam } = await import("@/actions/team_collection");
      await adminRenameTeam(collectionId, teamTitle, title);
      toast.success("Team renamed", { id: tid });
      setOpen(false);
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to rename team", { id: tid });
    } finally {
      setPending(false);
    }
  }

  async function addMember(vjudgeId) {
    const vj = String(vjudgeId || "").trim();
    if (!vj || memberSet.has(vj)) return;
    setPending(true);
    const tid = toast.loading("Adding member...");
    try {
      const { adminApproveManualTeam } = await import("@/actions/team_collection");
      const next = [...memberList, vj];
      await adminApproveManualTeam(collectionId, teamTitle, next);
      setMemberList(next);
      toast.success("Member added", { id: tid });
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to add member", { id: tid });
    } finally {
      setPending(false);
    }
  }

  async function removeMember(vjudgeId) {
    const vj = String(vjudgeId || "").trim();
    if (!vj || !memberSet.has(vj)) return;
    setPending(true);
    const tid = toast.loading("Removing member...");
    try {
      const { adminRemoveMember } = await import("@/actions/team_collection");
      await adminRemoveMember(collectionId, teamTitle, vj);
      setMemberList((prev) => prev.filter((m) => String(m) !== vj));
      toast.success("Member removed", { id: tid });
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove member", { id: tid });
    } finally {
      setPending(false);
    }
  }

  async function setCoachForTeam(vjudgeId) {
    const vj = String(vjudgeId || "").trim();
    if (!vj) return;
    setPending(true);
    const tid = toast.loading("Assigning coach...");
    try {
      const { adminAssignCoach } = await import("@/actions/team_collection");
      await adminAssignCoach(collectionId, teamTitle, vj);
      setCoach(vj);
      toast.success("Coach assigned", { id: tid });
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to assign coach", { id: tid });
    } finally {
      setPending(false);
    }
  }

  async function clearCoach() {
    setPending(true);
    const tid = toast.loading("Removing coach...");
    try {
      const { adminAssignCoach } = await import("@/actions/team_collection");
      await adminAssignCoach(collectionId, teamTitle, "");
      setCoach("");
      toast.success("Coach removed", { id: tid });
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove coach", { id: tid });
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          <Edit3 className="h-3.5 w-3.5" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Team</DialogTitle>
          <DialogDescription>{teamTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border/50 p-3 space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current Members
            </div>
            {memberList.length > 0 ? (
              <div className="space-y-1.5 max-h-40 overflow-auto pr-1">
                {memberList.map((vj) => (
                  <div
                    key={`${teamTitle}_member_${vj}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/40 px-2 py-1.5"
                  >
                    <span className="text-sm">{vj}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMember(vj)}
                      disabled={pending}
                      className="h-7 px-2 gap-1"
                    >
                      <UserMinus className="h-3 w-3" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No members assigned.</div>
            )}
          </div>

          <div className="rounded-lg border border-border/50 p-3 space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Rename Team
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-9 text-sm"
                placeholder="New team name"
                disabled={pending}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={renameTeam}
                disabled={
                  pending ||
                  !String(newTitle || "").trim() ||
                  String(newTitle).trim() === teamTitle
                }
                className="h-9 px-3 gap-1"
              >
                <Edit3 className="h-3.5 w-3.5" /> Rename
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border/50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Coach
              </div>
              <span className="text-xs text-muted-foreground">
                {coach ? `Current: ${coach}` : "No coach assigned"}
              </span>
            </div>
            {!!coach && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCoach}
                  disabled={pending}
                  className="h-7 px-2"
                >
                  Remove coach
                </Button>
              </div>
            )}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 text-sm pl-7"
                placeholder="Search users by name/email/vjudge"
                disabled={pending}
              />
            </div>

            {query.trim() && (
              <div className="max-h-60 overflow-auto rounded-md border border-border/50 bg-background p-1 space-y-1">
                {loading && (
                  <div className="text-xs text-muted-foreground px-2 py-1">
                    Searching...
                  </div>
                )}
                {!loading && results.length === 0 && (
                  <div className="text-xs text-muted-foreground px-2 py-1">
                    No matches found.
                  </div>
                )}
                {!loading &&
                  results.map((u) => {
                    const vj = String(u?.vjudge_id || "").trim();
                    if (!vj) return null;
                    const isMember = memberSet.has(vj);
                    const isCoach = coach === vj;
                    return (
                      <div
                        key={`${teamTitle}_${vj}`}
                        className="rounded border border-border/40 px-2 py-1.5 text-xs"
                      >
                        <div className="font-medium truncate">
                          {u?.full_name || vj}
                        </div>
                        <div className="text-muted-foreground truncate">{vj}</div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addMember(vj)}
                            disabled={pending || isMember}
                            className="h-6 px-2 gap-1"
                          >
                            <UserPlus className="h-3 w-3" /> Add
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeMember(vj)}
                            disabled={pending || !isMember}
                            className="h-6 px-2 gap-1"
                          >
                            <UserMinus className="h-3 w-3" /> Remove
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCoachForTeam(vj)}
                            disabled={pending || isCoach}
                            className="h-6 px-2 gap-1"
                          >
                            <UserCog className="h-3 w-3" />
                            {isCoach ? " Coach" : " Set Coach"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-destructive/40 p-3 space-y-2 bg-destructive/5">
            <div className="text-xs font-medium uppercase tracking-wide text-destructive">
              Danger Zone
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={deleteTeam}
              disabled={pending}
              className="h-8 px-3 gap-1 text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Team
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
