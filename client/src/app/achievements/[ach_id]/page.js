import MarkdownRender from "@/components/MarkdownRenderer";
import { getAchievementsById, getRelatedAchievements } from "@/lib/action";
import { formatRelative } from "date-fns";
import { CalendarArrowUp, Tag, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import AchievementFilterProvider from "@/components/achievements/AchievementFilterProvider";
import AchievementTagChips from "@/components/achievements/AchievementTagChips";
import FilteredRelatedAchievements from "@/components/achievements/FilteredRelatedAchievements";

const normalizeAchievementTags = (achievement) => {
  const rawTags = achievement?.tag_names ?? achievement?.tags ?? [];
  if (Array.isArray(rawTags)) {
    return rawTags
      .map((tag) => {
        if (typeof tag === "string") return tag.trim();
        if (typeof tag?.name === "string") return tag.name.trim();
        if (typeof tag?.tag === "string") return tag.tag.trim();
        return "";
      })
      .filter(Boolean);
  }
  if (typeof rawTags === "string") {
    return rawTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
};

export default async function SingleAchievement({ params }) {
  const { ach_id } = await params;
  const achievementArr = await getAchievementsById(ach_id);

  if (!Array.isArray(achievementArr) || achievementArr.length === 0) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4 text-slate-500 dark:text-[#6b6b8a]">
          <span className="text-5xl">🏆</span>
          <p
            className="text-sm uppercase tracking-widest font-bold"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Achievement Not Found
          </p>
        </div>
      </div>
    );
  }

  const achievement = achievementArr[0];
  const tags = normalizeAchievementTags(achievement);
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin")?.value === "true";

  const relatedResponse = await getRelatedAchievements(ach_id, 20);
  const relatedAchievements = Array.isArray(relatedResponse) ? relatedResponse : [];

  return (
    <AchievementFilterProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0f] text-slate-900 dark:text-[#f1f0ff] font-sans relative overflow-x-hidden">

      {/* Ambient blobs */}
      <div className="pointer-events-none fixed top-[-200px] left-[-200px] w-[700px] h-[700px] rounded-full bg-indigo-600/[0.12] dark:bg-indigo-600/[0.06] blur-3xl z-0" />
      <div className="pointer-events-none fixed bottom-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-amber-500/[0.08] dark:bg-amber-500/[0.04] blur-3xl z-0" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 pb-24">

        {/* Admin edit button */}
        {isAdmin && (
          <div className="flex justify-end mb-6">
            <Link
              href={`/achievements/${ach_id}/edit`}
              prefetch={false}
              className="inline-flex items-center gap-2 text-sm text-white rounded-lg px-5 py-2 font-bold uppercase tracking-wider transition-all hover:-translate-y-px"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
              }}
            >
              <Pencil size={13} />
              Edit
            </Link>
          </div>
        )}

        {/* Top metadata */}
        <div className="flex flex-col gap-6 mb-8">
          {achievement.title && (
            <h1
              className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-indigo-700 dark:from-[#f1f0ff] dark:to-[#a78bfa]"
              style={{
                fontFamily: "'Syne', sans-serif",
              }}
            >
              {achievement.title}
            </h1>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 text-sm border rounded-lg px-4 py-2 text-slate-600 dark:text-[#9090b0] border-slate-200 dark:border-[#2a2a38] bg-white dark:bg-[#111118]">
              <CalendarArrowUp size={14} className="text-amber-400" />
              <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.78rem", letterSpacing: "0.05em" }}>
                {formatRelative(achievement.date, new Date())}
              </span>
            </div>

            <AchievementTagChips tags={tags} />
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-[#2a2a38]" />
        </div>

        {/* Sticky image + scrolling description */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="w-full lg:sticky lg:top-24 lg:h-fit self-start flex flex-col gap-4">
            <div
              className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2a2a38] bg-white dark:bg-[#111118]"
              style={{ aspectRatio: "1 / 1" }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[2px] z-10"
                style={{ background: "linear-gradient(90deg, transparent, #f59e0b, transparent)" }}
              />
              <Image
                src={achievement.image}
                alt={achievement.title ?? "Achievement"}
                width={800}
                height={800}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            {achievement.intro && (
              <div
                className="w-full rounded-xl border px-5 py-3 text-sm font-bold text-center"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(251,191,36,0.07))",
                  borderColor: "rgba(245,158,11,0.28)",
                  color: "#bd8d11",
                  letterSpacing: "0.03em",
                }}
              >
                {achievement.intro}
              </div>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden border bg-white dark:bg-[#111118] border-slate-200 dark:border-[#2a2a38] h-[calc(100vw-3rem)] lg:h-[30rem] xl:h-[34rem] flex flex-col">
            <div
              className="px-8 py-7 text-base leading-loose text-slate-600 dark:text-[#9090b0] h-full overflow-y-auto lg:flex-1"
              style={{
                fontFamily:
                  "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                fontWeight: 400,
              }}
            >
              <MarkdownRender content={achievement.description} className="w-full max-w-none break-words" />
            </div>
          </div>
        </div>

        {/* Related achievements */}
        <FilteredRelatedAchievements achievements={relatedAchievements} />

      </div>
      </div>
    </AchievementFilterProvider>
  );
}