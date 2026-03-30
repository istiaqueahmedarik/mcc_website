"use client";

import RelatedAchievements from "@/components/achievements/RelatedAchievements";
import { useAchievementFilter } from "@/components/achievements/AchievementFilterProvider";

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

export default function FilteredRelatedAchievements({ achievements = [] }) {
  const { selectedTags } = useAchievementFilter();

  const selectedUpper = selectedTags.map((tag) => tag.toUpperCase());

  const filtered = selectedUpper.length > 0
    ? achievements.filter((item) =>
        normalizeAchievementTags(item).some((tag) =>
          selectedUpper.includes(tag.toUpperCase())
        )
      )
    : achievements;

  return <RelatedAchievements achievements={filtered} />;
}
