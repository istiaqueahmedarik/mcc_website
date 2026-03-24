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

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden cursor-pointer
        bg-[#0d0d0f] border border-white/[0.06] ${borderColors[colorIdx]}
        transition-all duration-500 ease-out
        hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-black/60`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Ambient glow behind image */}
      <div className={`absolute -inset-px bg-gradient-to-br ${glowColors[colorIdx]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />

      {/* Image area */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-[#111114]">
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
        <div className={`absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10`}>
          <Trophy className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-semibold tracking-widest uppercase text-white/70">Achievement</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative px-5 pb-5 pt-4 flex flex-col gap-3 z-10">
        {/* Accent line */}
        <div className={`absolute top-0 left-5 right-5 h-px ${accentColors[colorIdx]} opacity-30 group-hover:opacity-70 transition-opacity duration-300`} />

        {/* Date */}
        <div className="flex items-center gap-1.5 text-white/40 text-[11px] font-medium tracking-wide">
          <CalendarDays className="w-3 h-3 shrink-0" />
          <span>{format(achievement.date, "dd MMM yyyy")}</span>
        </div>

        {/* Title */}
        <h2 className="font-semibold text-[15px] text-white leading-snug line-clamp-2 tracking-tight">
          {achievement.title}
        </h2>

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/55">
              <Tag className="h-3 w-3" />
              Tags
            </span>
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">
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
              px-3 py-1.5 rounded-lg border border-white/10
              bg-white/[0.05] hover:bg-white/10 text-white/80 hover:text-white
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