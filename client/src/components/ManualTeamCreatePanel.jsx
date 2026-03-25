"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, UserPlus, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const MAX_MEMBERS = 3;

export default function ManualTeamCreatePanel({ collectionId }) {
  const [teamName, setTeamName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberMeta, setMemberMeta] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const memberSet = useMemo(() => new Set(members), [members]);

  const searchUsers = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const { searchUsersClient } = await import("@/actions/team_collection");
      const res = await searchUsersClient(q.trim());
      const arr = Array.isArray(res?.result) ? res.result : [];
      setResults(arr);
      setMemberMeta((prev) => {
        const next = new Map(prev);
        for (const u of arr) {
          const vj = String(u?.vjudge_id || "").trim();
          if (vj) next.set(vj, u);
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      searchUsers(query);
    }, 300);
    return () => clearTimeout(t);
  }, [query, searchUsers]);

  function addMember(vjudgeId) {
    const vj = String(vjudgeId || "").trim();
    if (!vj || memberSet.has(vj)) return;
    if (members.length >= MAX_MEMBERS) {
      toast.error(`You can add at most ${MAX_MEMBERS} members.`);
      return;
    }
    setMembers((prev) => [...prev, vj]);
  }

  function removeMember(vjudgeId) {
    setMembers((prev) => prev.filter((m) => m !== vjudgeId));
  }

  async function createTeam() {
    const title = String(teamName || "").trim();
    if (!title) {
      toast.error("Team name is required.");
      return;
    }
    if (!members.length) {
      toast.error("Add at least one member.");
      return;
    }

    setPending(true);
    const tid = toast.loading("Creating team...");
    try {
      const { adminApproveManualTeam } = await import("@/actions/team_collection");
      await adminApproveManualTeam(collectionId, title, members);
      toast.success("Team created", { id: tid });
      setTeamName("");
      setQuery("");
      setResults([]);
      setMembers([]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to create team", { id: tid });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/40 p-3 bg-background/60 space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Team Name (Required)
        </div>
        <Input
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Enter team name"
          className="h-10"
          disabled={pending}
        />
      </div>

      <div className="rounded-lg border border-border/40 p-3 bg-background/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Selected Members
          </div>
          <Badge variant="outline" className="text-xs">
            {members.length}/{MAX_MEMBERS}
          </Badge>
        </div>

        {members.length > 0 ? (
          <div className="space-y-1.5">
            {members.map((m) => (
              <div
                key={m}
                className="rounded-md border border-border/40 px-2 py-1.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border/40">
                    {memberMeta.get(m)?.profile_pic ? (
                      <Image
                        src={memberMeta.get(m).profile_pic}
                        alt={memberMeta.get(m)?.full_name || m}
                        width={32}
                        height={32}
                        className="w-8 h-8 object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        {String(memberMeta.get(m)?.full_name || m).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{memberMeta.get(m)?.full_name || m}</div>
                    <div className="flex gap-3">
                      <div className="text-xs text-muted-foreground truncate">
                        {memberMeta.get(m)?.batch_name || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {m}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {memberMeta.get(m)?.email || "-"}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMember(m)}
                  disabled={pending}
                  className="h-7 px-2"
                  aria-label={`Remove ${m}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No members selected.</div>
        )}
      </div>

      <div className="rounded-lg border border-border/40 p-3 bg-background/60 space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Search Members (Name / ID / Email)
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type to search users"
            className="h-10 pl-7"
            disabled={pending}
          />
        </div>

        {query.trim() && (
          <div className="max-h-56 overflow-auto rounded-md border border-border/50 p-1 bg-background space-y-1">
            {loading && <div className="px-2 py-1 text-xs text-muted-foreground">Searching...</div>}
            {!loading && results.length === 0 && (
              <div className="px-2 py-1 text-xs text-muted-foreground">No users found.</div>
            )}
            {!loading &&
              results.map((u) => {
                const vj = String(u?.vjudge_id || "").trim();
                if (!vj) return null;
                const selected = memberSet.has(vj);
                const disabled = pending || selected || members.length >= MAX_MEMBERS;
                return (
                  <div
                    key={`search_${vj}`}
                    className="rounded border border-border/40 px-2 py-1.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border/40">
                          {u?.profile_pic ? (
                            <Image
                              src={u.profile_pic}
                              alt={u?.full_name || vj}
                              width={32}
                              height={32}
                              className="w-8 h-8 object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              {String(u?.full_name || vj).charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{u?.full_name || vj}</div>
                          <div className="flex gap-3">
                            <div className="text-xs text-muted-foreground truncate">
                              {u?.batch_name || "-"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {vj || "-"}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {u?.email || "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addMember(vj)}
                      disabled={disabled}
                      className="h-7 px-2 gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                      {selected ? "Added" : "Add"}
                    </Button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={createTeam}
          disabled={pending || !String(teamName || "").trim() || members.length === 0}
          className="h-10 px-4 gap-2"
        >
          <Plus className="h-4 w-4" /> Create Team
        </Button>
      </div>
    </div>
  );
}
