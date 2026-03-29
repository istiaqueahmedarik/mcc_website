import AchievementFilterProvider from "@/components/achievements/AchievementFilterProvider";
import AchievementTagChips from "@/components/achievements/AchievementTagChips";
import FilteredRelatedAchievements from "@/components/achievements/FilteredRelatedAchievements";
import MarkdownRender from "@/components/MarkdownRenderer";
import { getAchievementsById, getRelatedAchievements } from "@/lib/action";
import { formatRelative } from "date-fns";
import { CalendarArrowUp } from "lucide-react";
import { cookies } from "next/headers";
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

  if (!Array.isArray(achievementArr) || achievementArr.length === 0) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4 text-slate-500 dark:text-[#6b6b8a]">
          <span className="text-5xl">🏆</span>
          <p
            className="text-sm uppercase tracking-widest font-bold"
          >
            Achievement Not Found
          </p>
        </div>
      </div>
    );
  }

  const achievement = achievementArr[0];
  const tags = normalizeAchievementTags(achievement);
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin")?.value === "true";

  const relatedResponse = await getRelatedAchievements(ach_id, 20);
  const relatedAchievements = Array.isArray(relatedResponse) ? relatedResponse : [];

  return (
    <AchievementFilterProvider>
      <div className="min-h-screen text-slate-900">
        <div className="max-w-7xl border mx-auto px-4 sm:px-6 py-10 sm:py-12 pb-24">
          <header className="relative mb-10 sm:mb-12">
            {/* {isAdmin && (
              <div className="mb-4 flex justify-end">
                <Link
                  href={`/achievements/${ach_id}/edit`}
                  prefetch={false}
                  className="inline-flex items-center gap-2 text-sm text-white rounded-lg px-4 py-2 font-semibold tracking-wide transition-all hover:-translate-y-px"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #818cf8)",
                    boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
                  }}
                >
                  <Pencil size={13} />
                  Edit
                </Link>
              </div>
            )} */}

            {achievement.title && (
              <h1 className="mx-auto max-w-5xl text-center sm:text-3xl md:text-5xl font-extrabold tracking-wide border-b-2 border-border text-slate-600 dark:text-[#a9a9c5] pb-3 shadow-sm">
                {achievement.title}
              </h1>
            )}
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)] gap-4 lg:gap-4 items-start">
            <aside className="w-full lg:sticky lg:top-24 self-start">
              <div className="rounded-3xl overflow-hidden">
                <div className="relative w-full">
                  <Image
                    src={achievement.image}
                    alt={achievement.title ?? "Achievement"}
                    width={1200}
                    height={1200}
                    className="w-full h-full object-contain rounded-xl shadow-lg"
                    priority
                  />
                </div>

                <div className="p-2">
                  <div className="flex flex-col border items-start gap-2 text-sm sm:text-base rounded-lg px-3 py-2 text-slate-600 dark:text-[#a9a9c5]">
                    {achievement.intro && (
                      <p className="rounded-xl text-base font-large text-amber-900 dark:text-amber-200 leading-relaxed">
                        {achievement.intro}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-amber-500">
                      <CalendarArrowUp size={16} className="text-amber-500" />
                      <span className="font-semibold tracking-wide">
                        {formatRelative(achievement.date, new Date())}
                      </span>
                    </div>
                    <AchievementTagChips tags={tags} />
                  </div>


                </div>
              </div>
            </aside>

            <section className="rounded-3xl">
              <div className="px-2 sm:px-4 lg:px-6 py-2">
                <MarkdownRender
                  content={achievement.description}
                  className="w-full max-w-none break-words text-base sm:text-lg leading-9 text-slate-700 dark:text-[#c6c6dc]"
                />
              </div>
            </section>
          </div>

          <div className="mt-14 sm:mt-16">
            <FilteredRelatedAchievements achievements={relatedAchievements} />
          </div>
        </div>
      </div>
    </AchievementFilterProvider>
  );
}