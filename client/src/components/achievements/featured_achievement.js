import { Calendar } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import ProgressLink from "@/components/ProgressLink";

export default function FeaturedAchievement( { featuredAchievement}) {
    return (
        <div className="w-full">
            <div className="flex flex-row gap-8 rounded-3xl shadow-2xl border">
                
                <div className="relative w-1/2 h-[450px] flex-shrink-0">
                    <Image
                        key={featuredAchievement.id}
                        src={featuredAchievement.image || "/vjudge_cover.png"}
                        alt={featuredAchievement.title || "Achievement"}
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                
                {/* Content Section - Right Side */}
                <div className="flex flex-col justify-between p-6 md:p-10 md:w-1/2">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                            {format(new Date(featuredAchievement.date), "MMMM dd, yyyy")}
                        </span>
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                        {featuredAchievement.title}
                    </h2>
                    
                    
                    <ProgressLink
                        href={`/achievements/${featuredAchievement.id}`}
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg w-fit"
                    >
                        View Full Details
                    </ProgressLink>
                </div>
            </div>
        </div>
    );
}