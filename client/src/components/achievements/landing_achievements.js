import { Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { format } from "date-fns";
import ProgressLink from "@/components/ProgressLink";
import { deleteAchievement } from "@/lib/action";
import DeleteComp from "@/components/deleteComp";
import { isAdminClient } from "@/lib/isAdmin";

export default function LandingAchievements({
    achievements, setFeaturedIndex, featuredIndex, resetTimer
}) {
    const isAdmin = isAdminClient();
    return (
        <div className="w-full">

            <h3 className="text-xl md:text-2xl font-bold flex items-center gap-2 mb-4">
                <Trophy className="w-6 h-6 text-primary" />
                Recent Achievements
            </h3>

            <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {achievements.map((achievement, index) => (
                    <div
                        key={index}
                        onClick={() => {
                            setFeaturedIndex(index);
                            resetTimer();
                        }}
                        className={cn(
                            "group relative h-40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300",
                            featuredIndex === index
                                ? "ring-2 ring-primary scale-105"
                                : "hover:scale-105"
                        )}
                    >

                        <div className="absolute inset-0 bg-muted">
                            <Image
                                src={achievement.image || "/vjudge_cover.png"}
                                alt={achievement.title || "Achievement"}
                                fill
                                className="object-contain group-hover:scale-110 transition-transform duration-500 blur-[3px]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        </div>

                        <div className="absolute inset-0 p-4 flex flex-col justify-between">
                            <div className="flex items-start justify-between gap-2">
                                <h4 className="font-mono font-black text-white line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex-1" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
                                    {achievement.title}
                                </h4>
                                {isAdmin && <DeleteComp delFunc={deleteAchievement} content={achievement} />}
                            </div>
                            <div className="flex items-end justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-white/70" />
                                    <span className="text-xs text-white/80">
                                        {format(new Date(achievement.date), "MMM dd, yyyy")}
                                    </span>
                                </div>
                                <ProgressLink
                                    href={`/achievements/${achievement.id}`}
                                    className="flex items-center justify-center px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-xs border border-white/20"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    View
                                </ProgressLink>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}