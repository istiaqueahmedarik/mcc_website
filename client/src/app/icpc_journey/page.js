"use client";

import { getIcpcJourneyPublic } from "@/actions/icpc_journey";
import MarkdownRender from "@/components/MarkdownRenderer";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ChevronDown,
  MapPin,
  Medal,
  Users
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/* ─── ICPC Color Palette ─────────────────────────────────────────────── */
const ICPC_BLUE = "#0072BC";
const ICPC_RED = "#E4002B";
const ICPC_YELLOW = "#FDBA11";

function toHref(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}


function YearSection({ data }) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { margin: "-35% 0px -35% 0px", once: false });
  const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
  const referenceLinks = String(data.references || data.reference || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
  const highlights = Array.isArray(data.highlights)
    ? data.highlights
      .filter(Boolean)
      .filter((item) => !referenceLinks.includes(String(item).trim()))
    : [];
  const chipData = [
    { icon: MapPin, text: data.location || "Venue TBD" },
    { icon: Users, text: data.teams ? `${data.teams} Teams` : "Teams N/A" },
    { icon: Medal, text: data.rank || "Participation" },
  ];

  return (
    <div ref={sectionRef}>
      <section
        id={`year-${data.year}`}
        className="relative flex flex-col lg:flex-row min-h-screen"
      >
        {/* ── Left panel — Sticky year + competition info ── */}
        <div className="lg:w-[40%] w-full lg:sticky lg:top-0 lg:h-screen flex items-center justify-center p-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm"
          >

            {/* Large ghost year */}
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={isInView ? { opacity: 0.08, scale: 1 } : { opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.5, delay: 0.05, type: "spring", stiffness: 160 }}
              className="block text-8xl lg:text-9xl font-black tracking-tighter leading-none mb-2 select-none text-foreground"
            >
              {data.year}
            </motion.span>

            {/* Competition name */}
            <motion.h2
              initial={{ opacity: 0, y: 14 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="text-2xl lg:text-3xl font-bold tracking-wider mb-2 text-foreground"
            >
              {data.competition}
            </motion.h2>


            {/* Meta chips */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-2"
            >
              {chipData.map(({ icon: Icon, text }, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted/60 transition-colors duration-300 cursor-default "
                >
                  <Icon className="w-3 h-3" />
                  {text}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* ── Right panel — Images & description ── */}
        <div className="lg:w-[60%] w-full p-6 lg:p-12 lg:py-24">
          {/* Images */}
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.65, delay: 0.1 }}
              className="grid grid-cols-2 gap-3 mb-8"
            >
              {images.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  className={`group relative overflow-hidden rounded-xl aspect-[3/2] border border-border/30 ${
                    images.length % 2 === 1 && i === images.length - 1 ? "col-span-2" : ""
                  }`}
                >
                  <img
                    src={img}
                    alt={`${data.competition} ${data.year}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-all duration-500" />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="rounded-xl border border-border/40 bg-card/70 backdrop-blur-sm p-6 lg:p-8"
          >
            <MarkdownRender
              content={data.description || ""}
              className="w-full max-w-none prose-sm md:prose-base text-muted-foreground mb-6"
            />

            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 mb-3">
                Highlights
              </h4>
              {highlights.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 14 }}
                  animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 14 }}
                  transition={{ duration: 0.35, delay: 0.45 + i * 0.07 }}
                  className="flex items-center gap-3"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: i === 0 ? ICPC_RED : ICPC_BLUE }}
                  />
                  <span className="text-sm text-foreground/75">{h}</span>
                </motion.div>
              ))}

              {referenceLinks.length > 0 && (
                <div className="pt-2.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 mb-2">
                    Reference
                  </h4>
                  <div className="space-y-1.5">
                    {referenceLinks.map((link, i) => (
                      <a
                        key={`${link}-${i}`}
                        href={toHref(link)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex max-w-full items-center text-sm text-blue-600 hover:text-blue-700 hover:underline break-all"
                      >
                        Standings - {data.competition}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}

/* ─── Scroll Progress Bar ────────────────────────────────────────────── */
function ScrollProgressBar({ targetRef }) {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start center", "end center"],
  });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div className="absolute inset-y-0 left-[40%] -translate-x-1/2 w-[2px] z-30 pointer-events-none hidden lg:block">
      <div className="sticky top-0 h-screen w-full">
        {/* Background track  */}
        <div className="absolute inset-0 w-full bg-foreground/[0.06]" />
        {/* Fill */}
        <motion.div
          className="absolute top-0 left-0 h-full w-full origin-top"
          style={{
            scaleY,
            background: `linear-gradient(180deg, ${ICPC_BLUE}, ${ICPC_YELLOW}, ${ICPC_RED})`,
          }}
        />
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function ICPCJourneyPage() {
  const journeyRef = useRef(null);
  const [journeyData, setJourneyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadJourney = async () => {
      setLoading(true);
      const result = await getIcpcJourneyPublic();

      if (!isMounted) return;

      setJourneyData(Array.isArray(result.journey) ? result.journey : []);
      setError(result.error || "");
      setLoading(false);
    };

    loadJourney();

    return () => {
      isMounted = false;
    };
  }, []);

  console.log("ICPC Journey Data:", journeyData);

  return (
    <main className="relative w-full bg-background">
      {/* Subtle ambient background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-[15%] left-[5%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.04]"
          style={{ background: ICPC_BLUE }}
        />
        <div
          className="absolute bottom-[20%] right-[8%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-[0.03]"
          style={{ background: ICPC_RED }}
        />
      </div>

      {/* ── Hero ── */}
      <header className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <div className="flex items-center justify-center gap-3">
            <Image src="/icpc.svg" alt="ICPC" width={200} height={200} className="object-contain" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-5">
            <span style={{ color: ICPC_BLUE }}>ICPC</span>{" "}
            <span className="text-foreground"
              style={{ color: ICPC_YELLOW }}
            >Journey</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto"
          >
            From 3 teams and a dream in 2012 to continental finals and beyond —
            the story of MIST Computer Club&apos;s competitive programming odyssey.
          </p>

          <motion.div
            className="flex items-center justify-center gap-2 text-muted-foreground/40"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.div>

        {/* Grid pattern */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage: `
                linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
              `,
              backgroundSize: "80px 80px",
            }}
          />
        </div>
      </header>

      {/* ── Year Sections ── */}
      <div ref={journeyRef} className="relative">
        {/* Scroll progress bar between left/right panels */}
        {journeyData.length > 0 && <ScrollProgressBar targetRef={journeyRef} />}
        {loading && (
          <div className="px-6 py-20 text-center text-muted-foreground">
            Loading ICPC journey...
          </div>
        )}

        {!loading && error && (
          <div className="px-6 py-20 text-center text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && journeyData.length === 0 && (
          <div className="px-6 py-20 text-center text-muted-foreground">
            No ICPC journey data found yet.
          </div>
        )}

        {!loading && !error && journeyData.map((data, index) => (
          <YearSection
            key={data.id || `${data.year}-${index}`}
            data={data}
          />
        ))}
      </div>

      {/* ── Closing Footer ── */}
      <footer className="min-h-[45vh] flex flex-col items-center justify-center text-center px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-3 text-foreground">
            The Journey Continues
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Every year, new records are broken and the dream grows bigger.
            The best chapters are yet to be written.
          </p>
        </motion.div>
      </footer>
    </main>
  );
}
