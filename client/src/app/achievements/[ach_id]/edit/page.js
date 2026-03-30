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
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0f] px-4">
        <div className="flex flex-col items-center gap-4 text-slate-500 dark:text-[#6b6b8a]">
          <span className="text-5xl">🏆</span>
          <p className="text-sm uppercase tracking-widest font-bold">Achievement Not Found</p>
        </div>
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
