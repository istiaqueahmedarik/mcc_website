import { Calendar, Tags } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import ProgressLink from "@/components/ProgressLink";

const normalizeTags = (rawTags) => {
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

export default function FeaturedAchievement( { featuredAchievement}) {
    const tags = normalizeTags(featuredAchievement?.tag_names ?? featuredAchievement?.tags ?? []);

    return (
        <div className="w-full">
            <div className="flex flex-col lg:flex-row gap-8 rounded-3xl shadow-2xl border">
                
                <div className="relative lg:w-1/2 h-[300px] lg:h-[450px] flex-shrink-0">
                    <Image
                        key={featuredAchievement.id}
                        src={featuredAchievement.image || "/vjudge_cover.png"}
                        alt={featuredAchievement.title || "Achievement"}
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                
                <div className="flex flex-col justify-between p-6 md:p-10 lg:w-1/2">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                            {format(new Date(featuredAchievement.date), "MMMM dd, yyyy")}
                        </span>
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                        {featuredAchievement.title}
                    </h2>

                    {tags.length > 0 && (
                        <div className="mb-6 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                <Tags className="h-3.5 w-3.5" />
                                Tags
                            </span>
                            {tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                                >
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                    
                    
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