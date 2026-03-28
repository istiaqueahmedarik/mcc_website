"use client";

import ProgressLink from "@/components/ProgressLink";
import AnimatedTooltip from "@/components/ui/AnimatedTooltip";
import { Shield } from "lucide-react";
import { useMemo, useState } from "react";

export default function CoachedTeamsSection({ coachedTeams = [], hasVjudgeId = false }) {
  const [selectedCollection, setSelectedCollection] = useState("");

  const collectionOptions = useMemo(
    () => [...new Set(
      coachedTeams
        .map((team) => (team?.collection_title || "").trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b)),
    [coachedTeams]
  );

  const filteredTeams = useMemo(() => {
    if (!selectedCollection) return coachedTeams;
    return coachedTeams.filter(
      (team) => (team?.collection_title || "").trim() === selectedCollection
    );
  }, [coachedTeams, selectedCollection]);

  return (
    <section className="profile-card" aria-labelledby="coached-teams-title">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2
          id="coached-teams-title"
          className="flex items-center gap-2 text-xl font-bold"
          style={{ color: "hsl(var(--profile-text))" }}
        >
          <Shield className="h-5 w-5" />
          Teams Coached{" "}
          {coachedTeams.length > 0 && (
            <span
              className="text-sm font-normal"
              style={{ color: "hsl(var(--profile-text-muted))" }}
            >
              ({filteredTeams.length})
            </span>
          )}
        </h2>

        {coachedTeams.length > 0 && collectionOptions.length > 0 && (
          <select
            value={selectedCollection}
            onChange={(event) => setSelectedCollection(event.target.value)}
            className="rounded-md border px-2 py-1.5 text-xs"
            style={{
              borderColor: "hsl(var(--profile-border))",
              background: "hsl(var(--profile-surface-2))",
              color: "hsl(var(--profile-text-secondary))",
            }}
            aria-label="Filter coached teams by collection"
          >
            <option value="">All collections</option>
            {collectionOptions.map((collectionName) => (
              <option key={collectionName} value={collectionName}>
                {collectionName}
              </option>
            ))}
          </select>
        )}
      </div>

      {!hasVjudgeId && (
        <p
          className="text-sm font-medium"
          style={{ color: "hsl(var(--profile-text-muted))" }}
        >
          Add a VJudge ID to appear as a coach.
        </p>
      )}

      {hasVjudgeId && coachedTeams.length === 0 && (
        <p
          className="text-sm font-medium"
          style={{ color: "hsl(var(--profile-text-muted))" }}
        >
          You are not coaching any finalized teams yet.
        </p>
      )}

      {hasVjudgeId && coachedTeams.length > 0 && filteredTeams.length === 0 && (
        <p
          className="text-sm font-medium"
          style={{ color: "hsl(var(--profile-text-muted))" }}
        >
          No teams found for the selected collection.
        </p>
      )}

      {hasVjudgeId && filteredTeams.length > 0 && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <ProgressLink
              key={`coach-${team.id}`}
              href={`/team/final/${team.id}`}
              className="block profile-stat-tile profile-focus-ring group"
            >
              <div
                className="font-semibold group-hover:underline"
                style={{ color: "hsl(var(--profile-primary))" }}
              >
                {team.team_title}
              </div>
              {team.collection_title && (
                <div
                  className="text-sm text-muted-foreground font-medium"
                  style={{ color: "hsl(var(--profile-text-muted))" }}
                >
                  {team.collection_title}
                </div>
              )}
              <TeamMemberList team={team} />
            </ProgressLink>
          ))}
        </div>
      )}
    </section>
  );
}

function TeamMemberList({ team }) {
  const profiles = Array.isArray(team?.member_profiles)
    ? team.member_profiles.filter((member) => member && member.vjudge_id)
    : [];

  const fallbackIds = Array.isArray(team?.member_vjudge_ids)
    ? team.member_vjudge_ids
    : [];

  if (profiles.length === 0 && fallbackIds.length === 0) {
    return null;
  }

  const tooltipItems = profiles.map((member, index) => ({
    id: index + 1,
    name: member.full_name || "Unknown Member",
    designation: member.vjudge_id,
    image: member.profile_pic || "/placeholder.svg",
  }));

  return (
    <div className="mt-2 space-y-2">
      {profiles.length > 0
        ? <AnimatedTooltip items={tooltipItems} />
        : fallbackIds.map((vjudgeId) => (
          <div
            key={vjudgeId}
            className="text-xs rounded-md px-2 py-1"
            style={{
              color: "hsl(var(--profile-text-muted))",
              background: "hsl(var(--profile-surface-2))",
            }}
          >
            {vjudgeId}
          </div>
        ))}
    </div>
  );
}
