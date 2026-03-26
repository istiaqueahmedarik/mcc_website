import MarkdownRender from "@/components/MarkdownRenderer";
import { getAchievementsById } from "@/lib/action";
import { formatRelative } from "date-fns";
import { CalendarArrowUp, Tag, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";

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
  const achievement = achievementArr[0];
  const tags = normalizeAchievementTags(achievement);
  const cookieStore = await cookies();
  const isAdmin = cookieStore.get("admin")?.value === "true";

  if (!Array.isArray(achievementArr) || achievementArr.length === 0) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <span className="text-5xl">🏆</span>
          <p className="font-semibold tracking-wide uppercase text-sm">Achievement Not Found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f1f0ff] font-sans relative overflow-x-hidden">

      {/* Ambient background blobs */}
      <div className="pointer-events-none fixed top-[-200px] left-[-200px] w-[700px] h-[700px] rounded-full bg-indigo-600/[0.06] blur-3xl z-0" />
      <div className="pointer-events-none fixed bottom-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-amber-500/[0.04] blur-3xl z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12 pb-24 flex flex-col gap-8">

        {/* Top action bar */}
        <div className="flex justify-end">
          {isAdmin && (
            <Link
              href={`/achievements/${ach_id}/edit`}
              className="inline-flex items-center gap-2 text-sm text-white rounded-lg px-5 py-2 font-bold uppercase tracking-wider transition-all hover:-translate-y-px"
              style={{
                fontFamily: "'Syne', sans-serif",
                background: "linear-gradient(135deg, #6366f1, #818cf8)",
                boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
              }}
            >
              <Pencil size={13} />
              Edit
            </Link>
          )}
        </div>

        {/* Hero Image */}
        <div
          className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden aspect-square border"
          style={{ borderColor: "#2a2a38", background: "#111118" }}
        >
          {/* Gold shimmer top rule */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] z-10"
            style={{ background: "linear-gradient(90deg, transparent, #f59e0b, transparent)" }}
          />

          <Image
            src={achievement.image}
            alt={achievement.title ?? "Achievement"}
            width={1200}
            height={1200}
            className="w-full h-full object-contain"
            priority
          />

          {/* Gradient overlay with title */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,10,15,0) 20%, rgba(10,10,15,0.55) 60%, rgba(10,10,15,0.97) 100%)",
            }}
          />

          {/* Hero bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
            {achievement.intro && (
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold mb-4 border"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  background: "linear-gradient(135deg, rgba(245,158,11,0.18), rgba(251,191,36,0.12))",
                  borderColor: "rgba(245,158,11,0.35)",
                  color: "#fbbf24",
                }}
              >
                {achievement.intro}
              </div>
            )}
            {achievement.title && (
              <h1
                className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  background: "linear-gradient(120deg, #f1f0ff 50%, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {achievement.title}
              </h1>
            )}
          </div>
        </div>

        {/* Date + Tags row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Date pill */}
          <div
            className="inline-flex items-center gap-2 text-sm border rounded-lg px-4 py-2"
            style={{
              color: "#9090b0",
              borderColor: "#2a2a38",
              background: "#111118",
            }}
          >
            <CalendarArrowUp size={14} className="text-amber-400" />
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: "0.78rem", letterSpacing: "0.05em" }}>
              {formatRelative(achievement.date, new Date())}
            </span>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-all cursor-default hover:border-indigo-400/50"
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.1))",
                    borderColor: "rgba(99,102,241,0.25)",
                    color: "#a78bfa",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="h-px w-full"
          style={{ background: "linear-gradient(90deg, transparent, #2a2a38, transparent)" }}
        />

        {/* Description */}
        <div
          className="rounded-2xl overflow-hidden border"
          style={{ background: "#111118", borderColor: "#2a2a38" }}
        >
          {/* Toolbar header */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b"
            style={{ background: "#17171f", borderColor: "#2a2a38" }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ fontFamily: "'Syne', sans-serif", color: "#6b6b8a" }}
            >
              Description
            </span>
            <Tag size={13} style={{ color: "#6b6b8a" }} />
          </div>

          {/* Body */}
          <div
            className="px-8 py-7 text-base leading-loose"
            style={{ color: "#9090b0", fontWeight: 300 }}
          >
            <MarkdownRender content={achievement.description} />
          </div>
        </div>

      </div>
    </div>
  );
}
