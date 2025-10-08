import { publicFinalizedTeamsLeaderboard } from "@/actions/team_collection";

export const dynamic = "force-dynamic";

export default async function TeamsLeaderboardPage() {
  const res = await publicFinalizedTeamsLeaderboard();
  const teams = res?.result || [];
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-6">Teams Leaderboard</h1>
        {teams.length === 0 && (
          <p className="text-muted-foreground">No finalized teams yet.</p>
        )}
        <ol className="space-y-3">
          {teams.map((t, idx) => (
            <li
              key={t.id}
              className="p-4 rounded-xl border border-border bg-card flex flex-col gap-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-semibold w-8 text-center">
                    #{idx + 1}
                  </span>
                  <span className="font-medium">{t.team_title}</span>
                </div>
                <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                  Score: {t.combined_score}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Members: {t.members.join(", ")}
              </div>
              <div className="text-xs text-muted-foreground">
                Room: {t.room_name}{" "}
                {t.collection_title ? `• ${t.collection_title}` : ""}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
