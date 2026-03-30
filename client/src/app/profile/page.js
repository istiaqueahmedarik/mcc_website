import { listActiveParticipationCollections } from "@/actions/team_collection";
import EditableIdForm from "@/components/EditableIdForm";
import { ParticipationToggle } from "@/components/ParticipationToggle";
import ProfileSidebarEditor from "@/components/ProfileSidebarEditor";
import ProgressLink from "@/components/ProgressLink";
import CoachedTeamsSection from "@/components/profile/CoachedTeamsSection";
import AnimatedTooltip from "@/components/ui/AnimatedTooltip";
import { get_with_token, logout, post_with_token } from "@/lib/action";
import { createClient } from "@/utils/supabase/server";

import {
  Award,
  CheckCircle2,
  ExternalLink,
  Users,
  XCircle,
} from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import Image from "next/image";
import { redirect } from "next/navigation";

async function getPublicProfileByVjudge(vjudgeId) {
  if (!vjudgeId) return null;
  try {
    const base = process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL;
    const res = await fetch(
      `${base}/auth/public/profile/vj/${encodeURIComponent(vjudgeId)}`,
      {
        cache: "force-cache",
        next: { revalidate: 300 },
      }
    );
    const data = await res.json();
    return data?.result || null;
  } catch (error) {
    return null;
  }
}

export default async function page({ searchParams }) {
  // Removed Codeforces OAuth code parameter handling
  noStore();

  const res = await get_with_token(`auth/user/profile?t=${Date.now()}`);
  if (!res || res.error || !Array.isArray(res.result) || res.result.length === 0) {
    redirect("/login");
  }
  const user = res.result[0];
  const myTeamsRes = await get_with_token("team-collection/my-teams");
  console.log("My Teams Response:", myTeamsRes);
  const myTeams = myTeamsRes?.result || [];
  const coachIds = Array.from(
    new Set(
      myTeams
        .map((team) => team?.coach_vjudge_id)
        .filter((coachId) => typeof coachId === "string" && coachId.trim())
    )
  );
  const coachProfiles = Object.fromEntries(
    await Promise.all(
      coachIds.map(async (coachId) => [
        coachId,
        await getPublicProfileByVjudge(coachId),
      ])
    )
  );
  const coachedTeamsRes = user?.vjudge_id
    ? await post_with_token("team-collection/public/teams/coached-by-vjudge", {
      vjudge_id: user.vjudge_id,
    })
    : { result: [] };
  const coachedTeams = coachedTeamsRes?.result || [];
  const participationCollectionsRes =
    await listActiveParticipationCollections();
  const participationCollections = participationCollectionsRes?.result || [];

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "hsl(var(--profile-bg))" }}
    >
      <div className="max-w-[1400px] mx-auto py-8 px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
          {/* Left Sidebar - Profile Summary */}
          <aside className="profile-sidebar-sticky" aria-label="Profile Summary">
            <ProfileSidebarEditor
              user={user}
              saveAction={saveSidebarProfile}
              logoutAction={logout}
            />
          </aside>

          {/* Right Column - Main Content */}
          <main className="space-y-6">
            {/* Contest Participation */}
            {participationCollections.length > 0 && (
              <section
                className="profile-card"
                aria-labelledby="participation-title"
              >
                <h2
                  id="participation-title"
                  className="flex items-center p-2 text-xl font-bold"
                  style={{ color: "hsl(var(--profile-text))" }}
                >
                  <Award className="h-5 w-5" />
                  Contest Participation
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {participationCollections.length === 0 && (
                    <p
                      className="text-sm font-medium"
                      style={{ color: "hsl(var(--profile-text-muted))" }}
                    >
                      No active participation windows.
                    </p>
                  )}
                  {participationCollections.map((col) => (
                    <ParticipationToggle key={col.id} col={col} />
                  ))}
                </div>
              </section>
            )}

            {/* Competitive Programming Profiles */}
            <section
              className="profile-card"
              aria-labelledby="cp-profiles-title"
            >
              <h2
                id="cp-profiles-title"
                className="flex items-center gap-2 text-xl font-bold mb-5"
                style={{ color: "hsl(var(--profile-text))" }}
              >
                <ExternalLink className="h-5 w-5" />
                Competitive Programming Profiles
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user.cf_id && (
                  <div className="flex items-start gap-4 group">
                    <div className="relative h-10 w-10 rounded-sm overflow-hidden">
                      <Image
                        src="/cf.png"
                        alt="Codeforces"
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">
                        Codeforces
                      </h3>
                      <a
                        href={`https://codeforces.com/profile/${user.cf_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {user.cf_id}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        {user.cf_verified ? (
                          <span className="text-emerald-600 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="h-4 w-4" /> Verified
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1 font-medium">
                            <XCircle className="h-4 w-4" /> Pending admin
                            verification
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <EditableIdForm
                          action={saveCodeforces}
                          fieldName="cf_id"
                          inputId="cf_id"
                          current={user.cf_id}
                          placeholder={user.cf_id ? "CF Handle" : "Enter CF handle"}
                          saveVariant={user.cf_id ? "outline" : "default"}
                          saveLabel={user.cf_id ? "Save" : "Add"}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Changing your handle will reset verification.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {!user.cf_id && (
                  <div className="flex items-start gap-4 group">
                    <div className="relative h-10 w-10 rounded-sm overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-inner bg-white">
                      <Image
                        src="/cf.png"
                        alt="Codeforces"
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">
                        Codeforces
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">
                        No handle saved
                      </p>
                      <EditableIdForm
                        action={saveCodeforces}
                        fieldName="cf_id"
                        inputId="cf_id_new"
                        current={user.cf_id}
                        placeholder="Enter CF handle"
                        saveVariant="default"
                        saveLabel="Add"
                      />
                    </div>
                  </div>
                )}

                {user.codechef_id && (
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 shadow-inner">
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        CC
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">
                        CodeChef
                      </h3>
                      <a
                        href={`https://www.codechef.com/users/${user.codechef_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {user.codechef_id}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {user.atcoder_id && (
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 shadow-inner">
                      <span className="font-bold text-gray-600 dark:text-gray-400">
                        AC
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">
                        AtCoder
                      </h3>
                      <a
                        href={`https://atcoder.jp/users/${user.atcoder_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {user.atcoder_id}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}

                {user.vjudge_id && (
                  <div className="flex items-start gap-4">
                    <div className="relative h-10 w-10 rounded-sm overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-inner bg-white">
                      <Image
                        src="/vj.jpg"
                        alt="VJudge"
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">
                        Virtual Judge
                      </h3>
                      <a
                        href={`https://vjudge.net/user/${user.vjudge_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                      >
                        {user.vjudge_id}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        {user.vjudge_verified ? (
                          <span className="text-emerald-600 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="h-4 w-4" /> Verified by
                            admin
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1 font-medium">
                            <XCircle className="h-4 w-4" /> Pending admin
                            verification
                          </span>
                        )}
                      </div>
                      <div className="mt-3">
                        <EditableIdForm
                          action={saveVjudge}
                          fieldName="vjudge_id"
                          inputId="vjudge_id"
                          current={user.vjudge_id}
                          placeholder="Enter VJudge ID"
                          saveVariant="outline"
                          saveLabel="Save"
                          inputClassName="max-w-xs rounded-xl"
                          saveClassName="rounded-full px-5"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Changing your handle will reset verification.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {!user.vjudge_id && (
                  <div className="flex items-start gap-4">
                    <div className="relative h-12 w-12 rounded-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-inner bg-white">
                      <Image
                        src="/vj.jpg"
                        alt="VJudge"
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-medium tracking-tight text-base">
                        Virtual Judge
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">
                        No VJudge ID saved
                      </p>
                      <EditableIdForm
                        action={saveVjudge}
                        fieldName="vjudge_id"
                        inputId="vjudge_id_new"
                        label="Add ID:"
                        current={user.vjudge_id}
                        placeholder="Enter VJudge ID"
                        saveVariant="default"
                        saveLabel="Save"
                        inputClassName="max-w-xs rounded-xl"
                        saveClassName="rounded-full px-5"
                        className="mt-2"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Admin will verify after you save.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* My Teams */}
            <section className="profile-card" aria-labelledby="my-teams-title">
              <h2
                id="my-teams-title"
                className="flex items-center gap-2 text-xl font-bold mb-5"
                style={{ color: "hsl(var(--profile-text))" }}
              >
                <Users className="h-5 w-5" />
                My Teams
              </h2>
              {myTeams.length === 0 ? (
                <p
                  className="text-sm font-medium"
                  style={{ color: "hsl(var(--profile-text-muted))" }}
                >
                  No finalized teams yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {myTeams.map((t) => (
                    <ProgressLink
                      key={t.id}
                      href={`/team/final/${t.id}`}
                      className="block profile-stat-tile profile-focus-ring group"
                    >
                      <div
                        className="font-semibold group-hover:underline"
                        style={{ color: "hsl(var(--profile-primary))" }}
                      >
                        {t.team_title}
                      </div>
                      {t.collection_title && (
                        <div
                          className="text-sm text-muted-foreground font-medium"
                          style={{ color: "hsl(var(--profile-text-muted))" }}
                        >
                          {t.collection_title}
                        </div>
                      )}
                      <TeamMemberList
                        team={t}
                        coachProfile={coachProfiles[t.coach_vjudge_id] || null}
                      />
                    </ProgressLink>
                  ))}
                </div>
              )}
            </section>

            {coachedTeams.length > 0 && (
              <CoachedTeamsSection
                coachedTeams={coachedTeams}
                hasVjudgeId={Boolean(user?.vjudge_id)}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function TeamMemberList({ team, coachProfile }) {
  const coachId =
    typeof team?.coach_vjudge_id === "string" ? team.coach_vjudge_id : null;
  const profiles = Array.isArray(team?.member_profiles)
    ? team.member_profiles.filter((m) => m && m.vjudge_id)
    : [];

  const fallbackIds = Array.isArray(team?.member_vjudge_ids)
    ? team.member_vjudge_ids
    : [];

  if (profiles.length === 0 && fallbackIds.length === 0 && !coachId) {
    return null;
  }

  const tooltipItems = profiles.map((m, idx) => ({
    id: idx + 1,
    name: m.full_name || "Unknown Member",
    designation: m.vjudge_id,
    image: m.profile_pic || "/placeholder.svg",
  }));

  const memberAndCoachItems = coachId
    ? [
      ...tooltipItems,
      {
        id: tooltipItems.length + 1,
        name: coachProfile?.full_name || "Coach",
        role: "Coach",
        designation: coachId,
        image: coachProfile?.profile_pic || "/placeholder.svg",
      },
    ]
    : tooltipItems;

  return (
    <div className="mt-2 space-y-2">
      {memberAndCoachItems.length > 0
        ? <AnimatedTooltip items={memberAndCoachItems} />
        : fallbackIds.map((vj) => (
          <div
            key={vj}
            className="text-xs rounded-md px-2 py-1"
            style={{
              color: "hsl(var(--profile-text-muted))",
              background: "hsl(var(--profile-surface-2))",
            }}
          >
            {vj}
          </div>
        ))}
    </div>
  );
}

async function saveCodeforces(formData) {
  "use server";
  const cf_id = formData.get("cf_id")?.toString().trim();
  if (!cf_id) return;
  await post_with_token("user/cf/set", { cf_id });
  redirect("/profile");
}

async function saveVjudge(formData) {
  "use server";
  const vjudge_id = formData.get("vjudge_id")?.toString().trim();
  if (!vjudge_id) return;
  await post_with_token("user/vjudge/set", { vjudge_id });
  redirect("/profile");
}

async function saveSidebarProfile(formData) {
  "use server";

  const full_name = formData.get("full_name")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim() || null;
  const batch_name = formData.get("batch_name")?.toString().trim() || null;
  const mist_id = formData.get("mist_id")?.toString().trim();
  const tshirt_size = formData.get("tshirt_size")?.toString().trim() || null;
  const file = formData.get("image");

  const basicPayload = { phone, batch_name };
  if (full_name) basicPayload.full_name = full_name;
  await post_with_token("user/basic/set", basicPayload);

  if (mist_id) {
    await post_with_token("user/mist-id/set", { mist_id });
  }

  await post_with_token("user/tshirt/set", { tshirt_size });

  if (file && typeof file !== "string") {
    // Get current user id/email
    const prof = await get_with_token("auth/user/profile");
    const me = prof?.result?.[0];
    const userId = me?.id || "me";

    const supabase = await createClient();
    const fileName = `${Date.now()}-${file.name}`;
    const path = `profile_pics/${userId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from("all_picture")
      .upload(path, file);

    if (!error) {
      const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${data.fullPath}`;
      await post_with_token("user/profile-pic/set", { profile_pic: url });
    } else {
      console.error("Upload error:", error);
    }
  }

  redirect("/profile");
}
