import MarkdownRender from "@/components/MarkdownRenderer";
import { getAchievementsById } from "@/lib/action";
import { formatRelative } from "date-fns";
import { CalendarArrowUp } from "lucide-react";
import Image from "next/image";

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
  const achievement = achievementArr[0];
  const tags = normalizeAchievementTags(achievement);
  // console.log("ach: ", achievement);

  if (!Array.isArray(achievementArr) || achievementArr.length === 0) {
    return (
      <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
        Achievement Not Found
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-10 p-8">
      <Image
        src={achievement.image}
        alt={achievement.title}
        height={1000}
        width={1000}
        className="rounded-2xl shadow-md mb-4 h-96 w-auto max-w-5xl"
      />
      <div className="flex flex-row gap-2">
        <CalendarArrowUp />
        <p>{formatRelative(achievement.date, new Date())}</p>
      </div>
      {tags.length > 0 && (
        <div className="flex w-full max-w-5xl flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="text-lg leading-loose">
        <MarkdownRender content={achievement.description} />
      </div>
    </div>
  );
}
