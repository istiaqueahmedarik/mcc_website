"use client";

import { Tag, RotateCcw } from "lucide-react";
import { useAchievementFilter } from "@/components/achievements/AchievementFilterProvider";

export default function AchievementTagChips({ tags = [] }) {
  const { selectedTags, setSelectedTags } = useAchievementFilter();

  if (!Array.isArray(tags) || tags.length === 0) return null;

  const toggleTag = (tag) => {
    const normalized = tag.toUpperCase();
    setSelectedTags((prev) => {
      const exists = prev.some((item) => item.toUpperCase() === normalized);
      if (exists) {
        return prev.filter((item) => item.toUpperCase() !== normalized);
      }
      return [...prev, tag];
    });
  };

  return (
    <div className="flex items-center justify-between gap-10 flex-wrap">
      
      {/* Tags (Left Side) */}
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isActive = selectedTags.some(
            (item) => item.toUpperCase() === tag.toUpperCase()
          );

          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                isActive
                  ? "border-indigo-500 dark:border-indigo-400 text-indigo-800 dark:text-indigo-200"
                  : "border-indigo-300/60 dark:border-[rgba(99,102,241,0.25)] text-indigo-700 dark:text-[#a78bfa] hover:border-indigo-400/60 dark:hover:border-indigo-400/50"
              }`}
              style={{
                fontFamily: "'Syne', sans-serif",
                background: isActive
                  ? "linear-gradient(135deg, rgba(99,102,241,0.24), rgba(167,139,250,0.18))"
                  : "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(167,139,250,0.06))",
              }}
            >
              <Tag size={11} aria-hidden="true" />
              {tag}
            </button>
          );
        })}
      </div>

      {/* Reset Button (Right Side) */}
      {selectedTags.length > 0 && (
        <button
          type="button"
          onClick={() => setSelectedTags([])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-red-400/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          <RotateCcw size={12} />
          Reset
        </button>
      )}
    </div>
  );
}