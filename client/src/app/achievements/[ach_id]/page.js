import MarkdownRender from "@/components/MarkdownRenderer";
import { getAchievementsById } from "@/lib/action";
import { formatRelative } from "date-fns";
import { CalendarArrowUp } from "lucide-react";
import Image from "next/image";

export default async function SingleAchievement({ params }) {
  const { ach_id } = await params;
  const achievementArr = await getAchievementsById(ach_id);
  const achievement = achievementArr[0];
  console.log("ach: ", achievement);

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
      <div className="text-lg leading-loose">
        <MarkdownRender content={achievement.description} />
      </div>
    </div>
  );
}
