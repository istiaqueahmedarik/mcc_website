import { publicFinalizedTeamsByContest } from "@/actions/team_collection";
import DeferredImage from "@/components/DeferredImage";
import ProgressLink from "@/components/ProgressLink";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { get_with_token } from "@/lib/action";

export const dynamic = "force-dynamic";

async function fetchPublicProfile(vjudge) {
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL;
    const r = await fetch(
      `${base}/auth/public/profile/vj/${encodeURIComponent(vjudge)}`,
      { cache: "force-cache", next: { revalidate: 300 } }
    );
    return await r.json();
  } catch (e) {
    return { error: "failed" };
  }
}

async function fetchCurrentUser() {
  try {
    const user = await get_with_token("auth/user/profile");
    if (!user || user.error) return null;
    if (!Array.isArray(user.result) || user.result.length === 0) return null;
    return user.result[0];
  } catch (e) {
    return null;
  }
}

export default async function FinalizedTeamsCollectionDetailsPage({ params }) {
  const { id } = await params;
  const [res, me] = await Promise.all([
    publicFinalizedTeamsByContest(),
    fetchCurrentUser(),
  ]);

  const blocks = res?.result || [];
  const block = blocks.find((b) => String(b?.collection_id) === String(id));

  if (!block) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12">
        <div className="max-w-4xl mx-auto px-5">
          <div className="rounded-xl border border-border/60 bg-card/50 p-8 text-center space-y-4">
            <p className="text-muted-foreground">Collection not found.</p>
            <ProgressLink
              href="/finalized-teams"
              className="inline-flex text-sm font-medium hover:text-primary"
            >
              Back to finalized collections
            </ProgressLink>
          </div>
        </div>
      </main>
    );
  }

  console.log("Finalized collection details:", block);

  const isAdmin = !!me?.admin;

  const memberSet = new Set();
  for (const t of block.teams || []) {
    for (const m of t.members || []) memberSet.add(m);
    if (t.coach_vjudge_id) memberSet.add(t.coach_vjudge_id);
  }

  const allMembers = Array.from(memberSet);
  const profilesArr = await Promise.all(
    allMembers.map(async (vj) => ({ vj, data: await fetchPublicProfile(vj) }))
  );
  const profileMap = new Map(
    profilesArr.map((p) => [p.vj, p.data?.result || {}])
  );

  console.log("Profiles loaded for finalized teams:", profileMap);
  console.log("ProfileArr:", profilesArr);

  const yearNow = new Date().getFullYear();
  const deriveLevel = (mistId) => {
    if (!mistId) return "-";
    const s = String(mistId);
    if (s.length < 4) return "-";
    const year = parseInt(s.slice(0, 4));
    if (!Number.isFinite(year)) return "-";
    const lvl = yearNow - year + 1;
    return Math.min(4, lvl > 0 ? lvl : 1);
  };

  const calculateScore = (score) => {
    if (typeof score !== "number") return "-";
    return (score / 3).toFixed(2);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-12">
      <div className="max-w-7xl mx-auto px-5 space-y-6">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="text-center">
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
              {block.collection_title || "Untitled Collection"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Room: {block.room_name}
            </p>
          </div>
        </div>

        {!isAdmin && (
          <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur shadow-sm overflow-hidden">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="w-24 text-center">Team</TableHead>
                  <TableHead className="w-40">Members</TableHead>
                  <TableHead className="w-28">Contacts</TableHead>
                  <TableHead className="w-16">Student ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(block.teams || []).map((t, idx) => {
                  const top = idx === 0;
                  return (t.members || []).map((m, mi) => {
                    const p = profileMap.get(m) || {};
                    const display = p.full_name || m;
                    const img = p.profile_pic;

                    return (
                      <TableRow key={`${t.id}_${m}`}>
                        {mi === 0 && (
                          <TableCell
                            rowSpan={t.members.length}
                            className="font-semibold align-middle text-center"
                          >
                            {idx + 1}
                          </TableCell>
                        )}
                        {mi === 0 && (
                          <TableCell
                            rowSpan={t.members.length}
                            className="align-middle text-center"
                          >
                            <div className="space-y-1">
                              <ProgressLink
                                href={`/team/final/${t.id}`}
                                className="font-semibold text-sm hover:text-primary inline-block"
                              >
                                {t.team_title}
                              </ProgressLink>
                              <div className="text-xs text-muted-foreground">
                                Score: {calculateScore(t.combined_score)}
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <ProgressLink
                            href={`/profile/${encodeURIComponent(m)}`}
                            className="flex items-center gap-2 hover:text-primary"
                          >
                            <span className="relative w-7 h-7 rounded-full overflow-hidden ring-2 ring-background/60">
                              <DeferredImage
                                src={img}
                                alt={display}
                                sizes="28px"
                                className="object-cover"
                                fallback={
                                  <span className="w-full h-full flex items-center justify-center text-[10px] font-semibold bg-muted/70">
                                    {display.charAt(0).toUpperCase()}
                                  </span>
                                }
                              />
                            </span>
                            <div className="flex flex-col">
                              <span className="truncate w-full">{display}</span>
                              <span className="text-muted-foreground/90 text-xs">
                                {p.batch_name || "-"}
                              </span>
                            </div>
                          </ProgressLink>
                        </TableCell>
                        <TableCell>
                          <div>{p.email || "-"}</div>
                          <div>{p.phone || "-"}</div>
                        </TableCell>
                        <TableCell>{p.mist_id || "-"}</TableCell>
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {isAdmin && (
          <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur shadow-inner overflow-hidden">
            <div className="px-4 pt-4 pb-2 text-xs text-center font-medium uppercase tracking-wider text-muted-foreground">
              Admin Detailed View
            </div>
            <Table className="text-[13px]">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="w-48 text-center">Team</TableHead>
                  <TableHead className="w-auto">Members</TableHead>
                  <TableHead className="w-28">Contacts</TableHead>
                  <TableHead className="w-28">Student ID</TableHead>
                  <TableHead className="w-48">Coach Information</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(block.teams || []).map((t, idx) => {
                  const coachProfile = t.coach_vjudge_id
                    ? profileMap.get(t.coach_vjudge_id) || {}
                    : {};

                  return (t.members || []).map((m, mi) => {
                    const p = profileMap.get(m) || {};
                    const display = p.full_name || m;
                    const img = p.profile_pic;

                    return (
                      <TableRow key={`${t.id}_${m}`}>
                        {mi === 0 && (
                          <TableCell
                            rowSpan={t.members.length}
                            className="align-middle font-semibold text-center"
                          >
                            {idx + 1}
                          </TableCell>
                        )}
                        {mi === 0 && (
                          <TableCell
                            rowSpan={t.members.length}
                            className="align-middle text-center"
                          >
                            <div className="space-y-1">
                              <ProgressLink
                                href={`/team/final/${t.id}`}
                                className="font-semibold text-sm hover:text-primary inline-block"
                              >
                                {t.team_title}
                              </ProgressLink>
                              <div className="text-[11px] text-muted-foreground">
                                Score: {calculateScore(t.combined_score)}
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <ProgressLink
                            href={`/profile/${encodeURIComponent(m)}`}
                            className="flex items-center gap-2 hover:text-primary"
                          >
                            <span className="relative w-7 h-7 rounded-full overflow-hidden ring-2 ring-background/60">
                              <DeferredImage
                                src={img}
                                alt={display}
                                sizes="28px"
                                className="object-cover"
                                fallback={
                                  <span className="w-full h-full flex items-center justify-center text-[10px] font-semibold bg-muted/70">
                                    {display.charAt(0).toUpperCase()}
                                  </span>
                                }
                              />
                            </span>
                            <div className="flex flex-col">
                              <span className="truncate w-full">{display}</span>
                              <span className="text-muted-foreground/90 text-xs">
                                {p.batch_name || "-"}
                              </span>
                            </div>
                          </ProgressLink>
                        </TableCell>
                        <TableCell>
                          <div>{p.email || "-"}</div>
                          <div>{p.phone || "-"}</div>
                        </TableCell>
                        <TableCell>{p.mist_id || "-"}</TableCell>
                        {mi === 0 && (
                          <TableCell
                            rowSpan={t.members.length}
                            className="align-center justify-center text-xs"
                          >
                            {t.coach_vjudge_id && (
                              <ProgressLink
                                href={`/profile/${encodeURIComponent(
                                  t.coach_vjudge_id
                                )}`}
                                className="mb-1 flex items-center gap-2"
                              >
                                <span className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-background/60 shadow-sm">
                                  <DeferredImage
                                    src={coachProfile.profile_pic}
                                    alt={coachProfile.full_name || t.coach_vjudge_id}
                                    sizes="28px"
                                    className="object-cover"
                                    fallback={
                                      <span className="w-full h-full flex items-center justify-center text-[10px] font-semibold bg-muted/70">
                                        {(coachProfile.full_name || t.coach_vjudge_id)
                                          .charAt(0)
                                          .toUpperCase()}
                                      </span>
                                    }
                                  />
                                </span>
                                <div className="flex flex-col">
                                  <span className="truncate max-w-[12rem]">
                                    {coachProfile.full_name || t.coach_vjudge_id}
                                  </span>
                                  <span className="text-muted-foreground/90 text-[12px]">
                                    {coachProfile.email || "-"}
                                  </span>
                                  <span className="text-muted-foreground/90 text-[12px]">
                                    {coachProfile.phone || "-"}
                                  </span>
                                </div>
                              </ProgressLink>
                            )}
                            {!t.coach_vjudge_id && (
                              <span className="text-muted-foreground/60">-</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  });
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </main>
  );
}
