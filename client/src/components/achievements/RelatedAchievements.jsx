"use client";

import Image from "next/image";
import Link from "next/link";
import { formatRelative } from "date-fns";

function AchievementCard({ achievement }) {
  const tags =
    achievement?.tag_names ??
    achievement?.tags ??
    [];

  const firstTag = Array.isArray(tags)
    ? typeof tags[0] === "string"
      ? tags[0]
      : tags[0]?.name ?? tags[0]?.tag ?? ""
    : "";

  return (
    <Link
      href={`/achievements/${achievement.id}`}
      className="group w-full rounded-[14px] overflow-hidden border border-slate-300 dark:border-[#2a2a38] bg-white dark:bg-[#111118] transition-all duration-200 hover:-translate-y-1 relative"
    >
      {/* Gold shimmer top rule */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] z-10"
        style={{
          background: "linear-gradient(90deg, transparent, #f59e0b, transparent)",
        }}
      />

      {/* Image */}
      <div className="w-full aspect-square relative bg-slate-50 dark:bg-[#1a1a24]">
        <Image
          src={achievement.image}
          alt={achievement.title ?? "Achievement"}
          fill
          className="object-cover"
        />
      </div>

      {/* Body */}
      <div className="px-3 pt-2.5 pb-3">
        {firstTag && (
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 mb-1.5 border border-indigo-300/50 dark:border-[rgba(99,102,241,0.22)] text-indigo-700 dark:text-[#a78bfa]"
            style={{
              fontFamily: "'Syne', sans-serif",
              background: "rgba(99,102,241,0.10)",
            }}
          >
            {firstTag}
          </span>
        )}
        <p
          className="text-[12px] font-semibold leading-[1.4] line-clamp-2 text-slate-900 dark:text-[#e2e0ff]"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {achievement.title}
        </p>
        <p className="text-[10px] mt-1.5 text-slate-500 dark:text-[#6b6b8a]">
          {formatRelative(achievement.date, new Date())}
        </p>
      </div>

      {/* Hover border glow */}
      <div
        className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none border border-indigo-500/45"
      />
    </Link>
  );
}

export default function RelatedAchievements({ achievements }) {
  if (!achievements || achievements.length === 0) return null;

  return (
    <section className="mt-16">
      {/* Section heading */}
      <div className="flex items-center gap-3 mb-6 px-1">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-300 dark:to-[#2a2a38]" />
        <span
          className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-[#6b6b8a] whitespace-nowrap"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          More achievements
        </span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-300 dark:to-[#2a2a38]" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </section>
  );
}