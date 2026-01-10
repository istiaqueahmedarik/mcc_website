import { Calendar } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import ProgressLink from "@/components/ProgressLink";

export default function FeaturedAchievement( { featuredAchievement}) {
    return (
        <div className="w-full max-w-6xl relative">
            <div className="relative h-[350px] md:h-[450px] rounded-3xl overflow-hidden group shadow-2xl">
                
                <div className="absolute inset-0">
                    <Image
                        key={featuredAchievement.id}
                        src={featuredAchievement.image || "/vjudge_cover.png"}
                        alt={featuredAchievement.title || "Achievement"}
                        fill
                        className="object-cover transition-all duration-1000 ease-in-out"
                        priority
                    />
                    <div className="absolute inset-0 bg-black/30" />
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
                    <div className="max-w-4xl">
                        
                        <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-white/80" />
                            <span className="text-sm font-medium text-white/80">
                                {format(new Date(featuredAchievement.date), "MMMM dd, yyyy")}
                            </span>
                        </div>
                        
                        <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-2xl mb-3 line-clamp-2">
                            {featuredAchievement.title}
                        </h2>
                        
                        {featuredAchievement.description && (
                            <p className="text-white/90 text-sm mb-6 line-clamp-2 max-w-3xl">
                                {featuredAchievement.description}
                            </p>
                        )}
                        
                        <ProgressLink
                            href={`/achievements/${featuredAchievement.id}`}
                            className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                        >
                            View Full Details
                        </ProgressLink>
                    </div>
                </div>
            </div>
        </div>
    );
}