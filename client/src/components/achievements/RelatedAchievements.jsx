"use client";

import { Tag } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarArrowUp, CalendarDays } from "lucide-react";

function AchievementCard({ achievement }) {
  const rawTags = achievement?.tags ?? achievement?.tag_names ?? [];
  const normalizedTags = Array.isArray(rawTags)
    ? rawTags
      .map((tag) => {
        if (typeof tag === "string") return tag.trim();
        if (typeof tag?.name === "string") return tag.name.trim();
        if (typeof tag?.tag === "string") return tag.tag.trim();
        return "";
      })
      .filter(Boolean)
    : typeof rawTags === "string"
      ? rawTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
      : [];
  const sortedTags = [...new Set(normalizedTags)].sort(
    (a, b) => a.length - b.length || a.localeCompare(b)
  );

  const [visibleCount, setVisibleCount] = useState(sortedTags.length);
  const rowRef = useRef(null);
  const probePlusRef = useRef(null);
  const tagMeasureRefs = useRef([]);

  useEffect(() => {
    const recalcVisibleCount = () => {
      const row = rowRef.current;
      if (!row) return;

      const maxWidth = row.clientWidth;
      const gap = 6; // Tailwind gap-1.5 => 0.375rem => 6px
      const widths = sortedTags.map((_, idx) => tagMeasureRefs.current[idx]?.offsetWidth || 0);

      if (sortedTags.length === 0 || maxWidth <= 0 || widths.some((w) => w <= 0)) {
        setVisibleCount(sortedTags.length);
        return;
      }

      let count = 0;
      let used = 0;
      for (let i = 0; i < widths.length; i += 1) {
        const next = (count === 0 ? 0 : gap) + widths[i];
        if (used + next <= maxWidth) {
          used += next;
          count += 1;
        } else {
          break;
        }
      }

      let hidden = sortedTags.length - count;
      if (hidden > 0 && probePlusRef.current) {
        let plusWidth = 0;
        probePlusRef.current.textContent = `+${hidden}`;
        plusWidth = probePlusRef.current.offsetWidth;

        while (count > 0 && used + gap + plusWidth > maxWidth) {
          count -= 1;
          hidden = sortedTags.length - count;
          used -= widths[count];
          if (count > 0) used -= gap;
          probePlusRef.current.textContent = `+${hidden}`;
          plusWidth = probePlusRef.current.offsetWidth;
        }
      }

      // Always show at least one tag chip (truncated) when tags exist.
      if (count === 0 && sortedTags.length > 0) count = 1;

      setVisibleCount(count);
    };

    const rafId = requestAnimationFrame(recalcVisibleCount);
    const observer = new ResizeObserver(recalcVisibleCount);
    if (rowRef.current) observer.observe(rowRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [sortedTags]);

  const visibleTags = sortedTags.slice(0, visibleCount);
  const extraTagCount = Math.max(0, sortedTags.length - visibleCount);

  return (
    <Link
      href={`/achievements/${achievement.id}`}
      className="group w-full rounded-md overflow-hidden bg-white dark:bg-[#111118] transition-all duration-200 scale- hover:scale-105 relative"
    >
      {/* Gold shimmer top rule */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] z-10"
        style={{
          background: "linear-gradient(90deg, transparent, #f59e0b, transparent)",
        }}
      />

      {/* Image */}
      <div className="w-full aspect-[4/3] relative border-b border-slate-200 dark:border-[#2a2a38]">
        <Image
          src={achievement.image}
          alt={achievement.title ?? "Achievement"}
          fill
          className="object-contain p-2"
        />
      </div>

      {/* Body */}
      <div className="p-4 gap-4">
        <h2
          className="tracking-wide font-semibold text-slate-900 dark:text-[#e2e0ff]"
        >
          {achievement.title}
        </h2>

        {/* <div className="flex items-center gap-2 text-amber-300/60">
          <CalendarArrowUp size={12} className="" />
          <span className="text-xs tracking-wide">
            {formatRelative(achievement.date, new Date())}
          </span>
        </div> */}
        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-white/40 text-[11px] font-medium tracking-wide">
          <CalendarDays className="w-3 h-3 shrink-0" />
          <span>{format(achievement.date, "dd MMM yyyy")}</span>
        </div>
        {sortedTags.length > 0 && (
          <>
            <div ref={rowRef} className="mt-1.5 mb-1.5 flex items-center gap-1.5 min-w-0">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 border border-indigo-300/50 dark:border-[rgba(99,102,241,0.22)] text-indigo-700 dark:text-[#a78bfa] max-w-full min-w-0"
                  style={{
                    background: "rgba(99,102,241,0.10)",
                  }}
                  title={tag}
                >
                  <Tag size={10} aria-hidden="true" />
                  <span className="truncate">{tag}</span>
                </span>
              ))}
              {extraTagCount > 0 && (
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 border border-indigo-300/50 dark:border-[rgba(99,102,241,0.22)] text-indigo-700 dark:text-[#a78bfa]"
                  style={{
                    background: "rgba(99,102,241,0.10)",
                  }}
                >
                  +{extraTagCount}
                </span>
              )}
            </div>

            {/* Hidden measurement probes for accurate width-based fitting. */}
            <div className="absolute -z-10 opacity-0 pointer-events-none whitespace-nowrap">
              {sortedTags.map((tag, idx) => (
                <span
                  key={`measure-${tag}-${idx}`}
                  ref={(el) => {
                    tagMeasureRefs.current[idx] = el;
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 border border-indigo-300/50 dark:border-[rgba(99,102,241,0.22)]"
                >
                  <Tag size={10} aria-hidden="true" />
                  <span>{tag}</span>
                </span>
              ))}
              <span
                ref={probePlusRef}
                className="inline-block text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5 border border-indigo-300/50 dark:border-[rgba(99,102,241,0.22)]"
              >
                +0
              </span>
            </div>
          </>
        )}
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
      <div className="flex items-center gap-3 mb-6 px-1">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-300 dark:to-[#2a2a38]" />
        <span
          className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-[#6b6b8a] whitespace-nowrap"
        >
          More achievements
        </span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-300 dark:to-[#2a2a38]" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </div>
    </section>
  );
}