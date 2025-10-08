import Edit from "@/components/achievements/edit";
import Loader from "@/components/Loader";
import { getAchievementsById } from "@/lib/action";
import { Suspense } from "react";

const Page = async ({ params }) => {
  const { ach_id } = await params;
  const achievement = await getAchievementsById(ach_id);
  if (!Array.isArray(achievement) || achievement.length === 0) {
    return (
      <div className="min-h-screen w-full py-12 px-4 flex items-center justify-center bg-background">
        Achievement Not Found
      </div>
    );
  }
  return (
    <Suspense fallback={<Loader />}>
      <Edit achievement={achievement[0]} />
    </Suspense>
  );
};

export default Page;
