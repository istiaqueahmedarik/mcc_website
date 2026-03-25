import { publicFinalizedTeamsByContest } from "@/actions/team_collection";
import TransitionButton from "@/components/TransitionButton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function FinalizedTeamsByContestPage() {
  const res = await publicFinalizedTeamsByContest();
  const blocks = res?.result || [];

  const formatDate = (value) => {
    if (!value) return "Unknown date";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown date";
    return date.toLocaleString();
  };

  const parsed = blocks
    .map((block) => {
      const teams = Array.isArray(block?.teams) ? block.teams : [];
      const participants = new Set();
      teams.forEach((team) => {
        (team?.members || []).forEach((member) => participants.add(member));
      });

      const scores = teams
        .map((team) => team?.combined_score)
        .filter((score) => typeof score === "number");

      return {
        id: block?.collection_id,
        title: block?.collection_title || "Untitled Collection",
        roomName: block?.room_name || "Unknown Room",
        finalizedAt: block?.finalized_at || null,
        teamCount: teams.length,
        participantCount: participants.size,
      };
    })
    .filter((item) => item.id !== undefined && item.id !== null);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12">
      <div className="max-w-7xl mx-auto px-5 space-y-10">
        <header className="text-center space-y-2">
          <h1 className="text-xl md:text-3xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Finalized Teams For Official Contests
          </h1>
          <p className="text-sm text-muted-foreground">
            Basic collection view. Open full details for team-by-team breakdown.
          </p>
        </header>

        {parsed.length === 0 && (
          <div className="mx-auto max-w-md text-center rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-8">
            <p className="text-sm text-muted-foreground">
              No finalized teams yet. Check back soon.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          {parsed.map((item) => (
            <Card key={item.id} className="flex flex-col">
              <CardHeader className="space-y-2">
                <CardTitle className="line-clamp-2">{item.title}</CardTitle>
                <CardDescription>Room: {item.roomName}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline">Teams: {item.teamCount}</Badge>
                  <Badge variant="outline">
                    Participants: {item.participantCount}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Finalized on: {formatDate(item.finalizedAt)}
                </div>
              </CardContent>
              <CardContent className="flex-1 flex flex-col gap-3">
                <TransitionButton
                  href={`/finalized-teams/${encodeURIComponent(item.id)}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
