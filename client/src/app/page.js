"use client";

import AchievementPage from "@/components/achievements/AchievmentPage";
import MccLogo from "@/components/IconChanger/MccLogo";
import StatsCounter from "@/components/landing/StatsCounter";
import { Button } from "@/components/ui/button";
import MagicButton from "@/components/ui/MagicButton";
import { Spotlight } from "@/components/ui/Spotlight";
import { TextGenerateEffect } from "@/components/ui/TextGenEffect";
import { motion, useScroll } from "framer-motion";
import {
  Award,
  BarChart3,
  Bell,
  Database,
  LineChart,
  MoveRight,
  PlayCircle,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function Home() {
  const [cms, setCms] = React.useState(null);
  const { scrollYProgress } = useScroll();
  const router = useRouter();

  // Function to scroll to stats section
  const scrollToStats = () => {
    if (typeof window !== "undefined") {
      const statsSection = document.getElementById("stats-section");
      if (statsSection) {
        statsSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };
  
  const [joinNowDestination, setJoinNowDestination] = useState("/login");

  useEffect(() => {
    // Check for token only on client side
    if (typeof window !== "undefined") {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="));
      
      setJoinNowDestination(token ? "/courses" : "/login");
    }
  }, []);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          process.env.NEXT_PUBLIC_SERVER_URL + "/landing/public",
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!json.error) {
          if (
            json.features &&
            !json.features.some((f) => f.title === "Problem Tracker")
          ) {
            json.features = [
              {
                title: "Problem Tracker",
                desc: "Track practice across platforms with smart streaks & heatmaps.",
              },
              ...json.features,
            ];
          }
          setCms(json);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);
  const features =
    cms?.features ||
    [
      {
        title: "Problem Tracker",
        desc: "Track practice across platforms with smart streaks & heatmaps.",
      },
      {
        title: "Problem Bank",
        desc: "Curated topic wise sets from beginner to advanced.",
      },
      {
        title: "Class Videos",
        desc: "Recorded sessions & micro lessons for revision.",
      },
      {
        title: "Standings",
        desc: "Real-time contest standings & performance analytics.",
      },
      {
        title: "Live Share",
        desc: "Share code & collaborate during virtual practice rooms.",
      },
      {
        title: "Reports",
        desc: "Weekly personalized growth reports & recommendations.",
      },
      {
        title: "Achievements",
        desc: "Celebrate milestones, badges & inter-club rankings.",
      },
      {
        title: "Reminders",
        desc: "Never miss a contest — instant multi-OJ notifications.",
      },
    ].map((f) => ({ title: f.title, description: f.desc }));

  // Feature icons mapping
  const featureIcons = {
    "Problem Tracker": <LineChart className="w-5 h-5" />,
    "Problem Bank": <Database className="w-5 h-5" />,
    "Class Videos": <PlayCircle className="w-5 h-5" />,
    Standings: <Trophy className="w-5 h-5" />,
    "Live Share": <Users className="w-5 h-5" />,
    Reports: <BarChart3 className="w-5 h-5" />,
    Achievements: <Award className="w-5 h-5" />,
    Reminders: <Bell className="w-5 h-5" />,
  };
  const stats = cms?.stats || [
    { title: "Active Members", value: 500, suffix: "+" },
    { title: "Contests Hosted", value: 120, suffix: "+" },
    { title: "Problems Tracked", value: 8000, suffix: "+" },
    { title: "National Awards", value: 35, suffix: "+" },
  ];
  const timeline = cms?.timeline || [
    {
      year: "2016",
      title: "Founded",
      body: "Started with a handful of passionate problem solvers.",
    },
    {
      year: "2018",
      title: "First National Finals",
      body: "Multiple teams qualify for national ICPC regional level.",
    },
    {
      year: "2021",
      title: "Platform Launch",
      body: "Internal tools evolve into a full learning platform.",
    },
    {
      year: "2024",
      title: "Scaling Up",
      body: "Hundreds of active members & cross‑university collabs.",
    },
  ];

  // Parse alumni data from database or use fallback
  const alumni = cms?.alumni
    ? cms.alumni.map((a) => {
        // Parse company and role from title if they don't exist as separate fields
        let company = a.company;
        let role = a.role;

        // If company and role aren't available, extract from title
        if (!company || !role) {
          // Title format: "Former Position • Role @ Company"
          const titleParts = a.title.split("•");
          if (titleParts.length > 1) {
            const rolePart = titleParts[1].trim();
            const roleCompanyMatch = rolePart.match(/(.*)\s+@\s+(.*)$/);

            if (roleCompanyMatch) {
              role = role || roleCompanyMatch[1].trim();
              company = company || roleCompanyMatch[2].trim();
            }
          }
        }

        return {
          quote: a.quote,
          name: a.name,
          title: a.title,
          image: a.image_url || a.image,
          company: company || "Unknown Company",
          role: role || "Software Engineer",
        };
      })
    : [
        {
          quote: "Leadership & Platform Scaling",
          name: "Ayesha Rahman",
          title: "Former President (2019–2020) • Software Engineer @ Google",
          image:
            "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",
          company: "Google",
          role: "Software Engineer",
        },
        {
          quote: "Problem Setting & Training",
          name: "Mahmudul Hasan",
          title: "Former Competitive Programming Lead • SDE @ Amazon",
          image:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1024px-Amazon_logo.svg.png",
          company: "Amazon",
          role: "Software Development Engineer",
        },
        {
          quote: "Curriculum & Mentorship",
          name: "Farhan Ahmed",
          title: "Former Education Coordinator • SWE @ Meta",
          image:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/2560px-Meta_Platforms_Inc._logo.svg.png",
          company: "Meta",
          role: "Software Engineer",
        },
        {
          quote: "AI Research & Innovation",
          name: "Nusrat Jahan",
          title: "Former Core Member • Research Engineer @ Microsoft",
          image:
            "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/2560px-Microsoft_logo_%282012%29.svg.png",
          company: "Microsoft",
          role: "Research Engineer",
        },
        {
          quote: "Automation & Tooling",
          name: "Sakib Chowdhury",
          title: "Former Contest Ops • Engineer @ DeepMind",
          image:
            "https://cdn.brandfetch.io/id9M89MUnI/theme/dark/logo.svg?c=1dxbfHSJFAPEGdCLU4o5B",
          company: "DeepMind",
          role: "Software Engineer",
        },
      ];

  // Inline, lightweight marquee to avoid ref error from InfiniteMovingCards
  const AlumniMarquee = ({ items, speed = 0.5 }) => {
    const trackRef = React.useRef(null);
    React.useEffect(() => {
      const el = trackRef.current;
      if (!el) return;
      let raf;
      let x = 0;
      const getHalfWidth = () => el.scrollWidth / 2;
      const step = () => {
        x -= speed;
        const half = getHalfWidth();
        if (-x >= half) x = 0;
        el.style.transform = `translateX(${x}px)`;
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }, [speed]);

    const Card = ({ item }) => (
      <div className="min-w-[260px] rounded-lg border p-4 bg-card/80 backdrop-blur flex items-center gap-3">
        <img
          src={item.image}
          alt={item.company || item.name}
          className="h-8 w-8 object-contain rounded-sm"
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{item.name}</span>
          <span className="text-xs text-muted-foreground">
            {(item.role || "").trim()} {item.company ? `@ ${item.company}` : ""}
          </span>
        </div>
      </div>
    );

    const list = React.useMemo(() => items.concat(items), [items]);

    return (
      <div className="relative overflow-hidden">
        <div ref={trackRef} className="flex gap-4 will-change-transform">
          {list.map((it, idx) => (
            <Card key={idx} item={it} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="scroll-smooth w-full flex flex-col gap-32 justify-center items-center overflow-x-hidden bg-background">
      {/* Scroll Progress Indicator */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-highlight to-primary origin-left z-50"
        style={{ scaleX: scrollYProgress }}
      />

      <Spotlight className="-top-4 md:left-60 md:-top-20" fill="white" />

      {/* Hero */}
      <section className="relative min-h-[90vh] w-full flex justify-center items-center px-4 pt-20 overflow-hidden">
        {/* Enhanced Background with Dynamic Pattern */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,hsl(var(--primary)/0.02)_50%)] bg-[size:60px_60px] animate-pulse" />
          <div
            className="absolute inset-0 bg-[linear-gradient(0deg,transparent_50%,hsl(var(--highlight)/0.015)_50%)] bg-[size:40px_40px] animate-pulse"
            style={{ animationDelay: "1s" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,hsl(var(--secondary))/40%,transparent_70%)]" />
        </div>

        <div className="flex justify-center items-center flex-col max-w-3xl gap-8 text-center relative z-10">
          <TextGenerateEffect
            className="uppercase text-3xl md:text-5xl font-bold"
            words="Hello Programmer, Welcome To"
          />
          <div className="relative">
            <MccLogo
              classes="animate-appear drop-shadow-xl hover:scale-105 transition-transform duration-300"
              w={260}
              h={260}
            />
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-highlight/20 to-primary/20 rounded-full blur-3xl opacity-30 animate-pulse" />
          </div>

          <div className="relative max-w-xl">
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              A community for algorithms, problem solving & collaborative
              learning. Compete, learn, build & grow with peers pushing the same
              limits as you.
            </p>
            <div className="absolute -inset-4 bg-gradient-to-r from-transparent via-primary/5 to-transparent rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300 -z-10" />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href={joinNowDestination}>
              <MagicButton
                title="Join Now"
                position="right"
                icon={<MoveRight className="ml-2" />}
              />
            </Link>
            <MagicButton title="Explore Platform" handleClick={scrollToStats} />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats-section" className="w-full max-w-7xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <StatsCounter
            value={stats[0]?.value || 0}
            suffix={stats[0]?.suffix || ""}
            title={stats[0]?.title || ""}
          />
          <StatsCounter
            value={stats[1]?.value || 0}
            suffix={stats[1]?.suffix || ""}
            title={stats[1]?.title || ""}
          />
          <StatsCounter
            value={stats[2]?.value || 0}
            suffix={stats[2]?.suffix || ""}
            title={stats[2]?.title || ""}
          />
          <StatsCounter
            value={stats[3]?.value || 0}
            suffix={stats[3]?.suffix || ""}
            title={stats[3]?.title || ""}
          />
        </div>
      </section>

      {/* Features */}
      <section className="w-full max-w-7xl px-4">
        <h2 className="uppercase text-3xl md:text-4xl font-bold tracking-wider mb-10 text-center">
          What We Offer
        </h2>
        <div className="grid md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-6 mb-16">
          {features.map((f, index) => (
            <div
              key={f.title}
              className="group relative rounded-xl border border-border/60 p-[1px] bg-gradient-to-br from-primary/10 via-background to-background hover:from-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/10"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div className="h-full rounded-[inherit] p-5 flex flex-col justify-between bg-background/80 backdrop-blur relative overflow-hidden">
                {/* Icon with gradient background */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-highlight/20 text-primary group-hover:from-primary/30 group-hover:to-highlight/30 transition-all duration-300 group-hover:scale-110">
                    {featureIcons[f.title] || <Target className="w-5 h-5" />}
                  </div>
                  <h3 className="font-semibold text-sm md:text-base tracking-wide group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>
                </div>

                <div>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
                    {f.description || f.desc}
                  </p>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-highlight/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]" />

                {/* Subtle animated border */}
                <div
                  className="absolute inset-0 rounded-[inherit] bg-gradient-to-r from-primary via-highlight to-primary opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, hsl(var(--primary))/0.3, transparent)",
                    backgroundSize: "200% 100%",
                    animation: "feature-shimmer 2s linear infinite",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Achievements Preview */}
      <section className="w-full max-w-7xl px-4 py-16 rounded-2xl">
        <h2 className="uppercase text-3xl md:text-4xl font-bold tracking-wider mb-8 text-center">
          Our Achievements
        </h2>
        <div className="flex flex-col items-center">
          <AchievementPage />
          <Link href="/achievements" className="mt-8">
            <Button>See all</Button>
          </Link>
        </div>
      </section>

      {/* Timeline / About */}
      <section className="w-full max-w-5xl px-4">
        <h2 className="uppercase text-3xl md:text-4xl font-bold tracking-wider mb-10 text-center">
          About The Club
        </h2>
        <div className="relative pl-8 before:content-[''] before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-primary before:via-highlight before:to-primary before:opacity-60">
          {timeline.map((item, idx) => (
            <div
              key={item.year + idx}
              className="group relative mb-12 last:mb-0"
            >
              {/* Enhanced card with hover effects */}
              <div className="ml-6 p-6 rounded-lg border bg-card/80 backdrop-blur-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group-hover:scale-105 group-hover:bg-card/90 relative overflow-hidden">
                {/* Background pattern on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-highlight/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="flex items-center gap-4 mb-2 relative z-10">
                  <span className="text-xs font-bold tracking-wider text-primary uppercase px-3 py-1 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    {item.year}
                  </span>
                  <h3 className="font-semibold text-base md:text-lg group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                </div>

                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors relative z-10">
                  {item.body || item.text}
                </p>

                {/* Subtle decorative elements */}
                <div className="absolute top-2 right-2 w-20 h-20 bg-gradient-to-br from-primary/10 to-highlight/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Progress indicator for timeline */}
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-highlight transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Alumni */}
      <section className="w-full max-w-7xl px-4">
        <h2 className="uppercase text-3xl md:text-4xl font-bold tracking-wider mb-4 text-center">
          Our Alumni
        </h2>
        <p className="text-center text-sm md:text-base text-muted-foreground max-w-2xl mx-auto mb-8">
          They honed their skills here and now contribute at world‑class
          companies & research labs. Stay inspired by their journeys.
        </p>
        {/* Replaced InfiniteMovingCards with inline marquee to avoid ref error */}
        <AlumniMarquee items={alumni} speed={0.6} />
        <div className="flex justify-center mt-6">
          <Link href="/alumni">
            <Button variant="outline">See all Alumni</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
