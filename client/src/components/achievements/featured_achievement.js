import { Calendar, Tags } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

export default function FeaturedAchievement({ featuredAchievement }) {
    const tags = normalizeTags(featuredAchievement?.tag_names ?? featuredAchievement?.tags ?? []);

    return (
        <div className="w-full">
            <div className="flex flex-col lg:flex-row gap-8 border rounded-md">

                <div className="relative lg:w-1/2 h-[300px] lg:h-[450px] flex-shrink-0">
                    <Image
                        key={featuredAchievement.id}
                        src={featuredAchievement.image || "/vjudge_cover.png"}
                        alt={featuredAchievement.title || "Achievement"}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                        priority
                    />
                </div>

                <div className="flex flex-col justify-center p-6 md:p-10 lg:w-1/2">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                            {format(new Date(featuredAchievement.date), "MMMM dd, yyyy")}
                        </span>
                    </div>

                    <h2 className="text-xl md:text-3xl font-bold text-foreground mb-4">
                        {featuredAchievement.title}
                    </h2>

                    {featuredAchievement.intro && (
                        <h2 className="text-lg md:text-xl text-foreground/65 mb-4">
                            {featuredAchievement.intro}
                        </h2>
                    )}

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

                    <Link
                        href={`/achievements/${featuredAchievement.id}`}
                    >
                         <Button variant="outline">View Details</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}