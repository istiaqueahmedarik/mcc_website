import Edit from "@/components/achievements/edit";
import Loader from "@/components/Loader";
import { getAchievementsById } from "@/lib/action";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

const Page = async ({ params }) => {
  const { ach_id } = await params;
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin")?.value === "true";

  if (!isAdmin) {
    redirect(`/achievements/${ach_id}`);
  }

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
