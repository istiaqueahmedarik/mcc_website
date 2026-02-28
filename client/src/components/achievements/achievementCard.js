import { deleteAchievement } from "@/lib/action";
import { format } from "date-fns";
import { CalendarDays, ArrowRight } from "lucide-react";
import Image from "next/image";
import DeleteComp from "../deleteComp";
import ProgressLink from "../ProgressLink";

export default function AchievementCard({ achievement, isAdmin }) {
  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden group shadow-lg ring-1 ring-white/10 bg-black">
      
      <Image
        src={achievement.image || "/vjudge_cover.png"}
        alt={achievement.title || "Achievement Photo"}
        fill
        className="object-contain transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        priority
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10 transition-opacity duration-300 group-hover:from-black/90 group-hover:via-black/40" />

      {isAdmin && (
        <DeleteComp delFunc={deleteAchievement} content={achievement} />
      )}

      {/* Content */}
      <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2 z-10">
        {/* Date */}
        <div className="flex items-center gap-1.5 text-white/70 text-xs">
          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
          <span>{format(achievement.date, "dd MMM yyyy")}</span>
        </div>

        {/* Title */}
        <h2 className="font-mono text-base font-semibold text-white leading-snug line-clamp-2 drop-shadow">
          {achievement.title}
        </h2>

        {/* slide on hover */}
        <div className="translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <ProgressLink
            href={`/achievements/${achievement.id}`}
            className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-xs border border-white/20"
          >
            View Achievement
            <ArrowRight className="w-3.5 h-3.5" />
          </ProgressLink>
        </div>
      </div>
    </div>
  );
}
