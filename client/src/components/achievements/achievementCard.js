import { deleteAchievement } from "@/lib/action";
import { format } from "date-fns";
import { CalendarDays, ArrowUpRight, Trophy, Tag } from "lucide-react";
import Image from "next/image";
import DeleteComp from "../deleteComp";
import ProgressLink from "../ProgressLink";

const normalizeTags = (rawTags) => {
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

export default function AchievementCard({ achievement, isAdmin, onDeleteSuccess, index = 0 }) {
  const glowColors = [
    "from-violet-500/30 via-purple-500/20",
    "from-amber-500/30 via-orange-500/20",
    "from-cyan-500/30 via-blue-500/20",
    "from-emerald-500/30 via-teal-500/20",
    "from-rose-500/30 via-pink-500/20",
    "from-green-500/30 via-yellow-500/20",
  ];
  const accentColors = [
    "bg-violet-500",
    "bg-amber-400",
    "bg-cyan-400",
    "bg-emerald-400",
    "bg-rose-400",
    "bg-green-400",
  ];
  const borderColors = [
    "group-hover:border-violet-500/60",
    "group-hover:border-amber-400/60",
    "group-hover:border-cyan-400/60",
    "group-hover:border-emerald-400/60",
    "group-hover:border-rose-400/60",
    "group-hover:border-green-400/60",
  ];

  const colorIdx = index % glowColors.length;
  const tags = normalizeTags(achievement?.tag_names ?? achievement?.tags ?? []);
  const introMsg =
    typeof achievement?.intro === "string" ? achievement.intro.trim() : "";

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden cursor-pointer
        bg-white dark:bg-[#0d0d0f] border border-zinc-900/10 dark:border-white/[0.06] ${borderColors[colorIdx]}
        transition-all duration-500 ease-out
        hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-zinc-900/25 dark:hover:shadow-black/60`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Ambient glow behind image */}
      <div className={`absolute -inset-px bg-gradient-to-br ${glowColors[colorIdx]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />

      {/* Image area */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-zinc-100 dark:bg-[#111114]">
        <Image
          src={achievement.image || "/vjudge_cover.png"}
          alt={achievement.title || "Achievement Photo"}
          fill
          className="object-contain transition-transform duration-700 ease-out group-hover:scale-[1.07]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority
        />

        {/* Top bar: admin delete */}
        {isAdmin && (
          <div className="absolute top-3 right-3 z-20">
            <DeleteComp
              delFunc={deleteAchievement}
              content={achievement}
              onDeleteSuccess={onDeleteSuccess}
            />
          </div>
        )}

        {/* Trophy badge */}
        <div className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900/65 dark:bg-black/60 backdrop-blur-md border border-zinc-300/20 dark:border-white/10`}>
          <Trophy className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-semibold tracking-widest uppercase text-zinc-100/90 dark:text-white/70">Achievement</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative px-5 pb-5 pt-4 flex flex-col gap-3 z-10">
        {/* Accent line */}
        <div className={`absolute top-0 left-5 right-5 h-px ${accentColors[colorIdx]} opacity-30 group-hover:opacity-70 transition-opacity duration-300`} />

        {/* Date */}
        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-white/40 text-[11px] font-medium tracking-wide">
          <CalendarDays className="w-3 h-3 shrink-0" />
          <span>{format(achievement.date, "dd MMM yyyy")}</span>
        </div>

        {/* Title */}
        <h2 className="font-semibold text-[15px] text-zinc-900 dark:text-white leading-snug line-clamp-2 tracking-tight">
          {achievement.title}
        </h2>

        {/* Intro message */}
        {introMsg && (
          <div className="relative overflow-hidden rounded-xl border border-zinc-900/10 dark:border-white/10 bg-gradient-to-br from-zinc-900/[0.05] to-zinc-900/[0.02] dark:from-white/[0.08] dark:to-white/[0.03] px-3 py-2.5">
            <div className={`pointer-events-none absolute inset-y-0 left-0 w-1 ${accentColors[colorIdx]} opacity-80`} />
            <p className="pl-2 text-[10px] uppercase tracking-wider text-zinc-500 dark:text-white/45">Summary</p>
            <p className="mt-1 pl-2 text-[12px] leading-relaxed text-zinc-700 dark:text-white/80 line-clamp-2">
              {introMsg}
            </p>
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-900/10 dark:border-white/10 bg-zinc-900/[0.04] dark:bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-600 dark:text-white/55">
              <Tag className="h-3 w-3" />
              Tags
            </span>
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-zinc-900/10 dark:border-white/10 bg-zinc-900/[0.04] dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-white/70"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="rounded-full border border-zinc-900/10 dark:border-white/10 bg-zinc-900/[0.04] dark:bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-white/55">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
          <ProgressLink
            href={`/achievements/${achievement.id}`}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide
              px-3 py-1.5 rounded-lg border border-zinc-900/10 dark:border-white/10
              bg-zinc-900/[0.05] dark:bg-white/[0.05] hover:bg-zinc-900/[0.1] dark:hover:bg-white/10 text-zinc-700 dark:text-white/80 hover:text-zinc-900 dark:hover:text-white
              backdrop-blur-sm transition-all duration-200`}
          >
            View Details
            <ArrowUpRight className="w-3.5 h-3.5" />
          </ProgressLink>
        </div>
      </div>
    </div>
  );
}