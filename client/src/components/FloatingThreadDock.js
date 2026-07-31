"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Minimize2, X } from "lucide-react";
import { ProblemThread } from "@/components/ProblemThread";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MAX_FLOATING_THREADS = 6;

export function getThreadBubbleKey(thread) {
  const type = thread?.problemType || "class_problem";
  const assignment = thread?.assignmentId ? `:${thread.assignmentId}` : "";
  const classId = thread?.classId ? `:${thread.classId}` : "";
  return `${thread?.classroomId || "classroom"}:${type}:${thread?.problemId || "problem"}${assignment}${classId}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

function scopeLabel(problemType) {
  return String(problemType || "class_problem")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildThreadAvatar(seedText) {
  const seed = hashString(seedText);
  const palette = [
    ["#06b6d4", "#2563eb", "#111827"],
    ["#10b981", "#0f766e", "#052e2b"],
    ["#f59e0b", "#ef4444", "#23120b"],
    ["#a855f7", "#ec4899", "#1f1029"],
    ["#84cc16", "#14b8a6", "#102014"],
    ["#38bdf8", "#6366f1", "#111827"],
  ];
  const [first, second, ink] = pick(palette, seed);
  const leftEye = 25 + (seed % 8);
  const rightEye = 63 + ((seed >> 3) % 7);
  const mouthY = 58 + ((seed >> 8) % 8);
  const tilt = ((seed >> 10) % 18) - 9;
  const sparkX = 18 + ((seed >> 15) % 58);
  const sparkY = 14 + ((seed >> 19) % 22);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="Thread avatar">
      <defs>
        <linearGradient id="g" x1="12" y1="8" x2="84" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${first}"/>
          <stop offset="0.58" stop-color="${second}"/>
          <stop offset="1" stop-color="${ink}"/>
        </linearGradient>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.8" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 .45 0"/>
          <feBlend in="SourceGraphic"/>
        </filter>
      </defs>
      <rect width="96" height="96" rx="32" fill="${ink}"/>
      <circle cx="22" cy="18" r="42" fill="${first}" opacity=".32"/>
      <circle cx="78" cy="84" r="48" fill="${second}" opacity=".46"/>
      <path d="M18 55C18 31 33 18 49 18c18 0 33 15 33 34 0 21-15 34-34 34-18 0-30-10-30-31Z" fill="url(#g)" filter="url(#glow)" transform="rotate(${tilt} 48 52)"/>
      <path d="M19 44c8-20 24-29 41-22 10 4 17 13 19 25-9-13-22-18-38-14-9 2-16 6-22 11Z" fill="#fff" opacity=".28"/>
      <circle cx="${leftEye}" cy="48" r="4.5" fill="#fff"/>
      <circle cx="${rightEye}" cy="48" r="4.5" fill="#fff"/>
      <path d="M35 ${mouthY}c7 7 19 7 27 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>
      <path d="M${sparkX} ${sparkY}l3 6 7 2-7 2-3 6-3-6-7-2 7-2 3-6Z" fill="#fff" opacity=".8"/>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

function usePersistentAvatar(threadKey) {
  const fallback = useMemo(() => buildThreadAvatar(threadKey), [threadKey]);
  const [avatar, setAvatar] = useState(fallback);

  useEffect(() => {
    try {
      const storageKey = `mcc-thread-avatar:${threadKey}`;
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        setAvatar(stored);
        return;
      }
      window.localStorage.setItem(storageKey, fallback);
      setAvatar(fallback);
    } catch {
      setAvatar(fallback);
    }
  }, [fallback, threadKey]);

  return avatar;
}

function LiquidLayer() {
  return (
    <>
      <svg className="pointer-events-none fixed h-0 w-0" aria-hidden="true" focusable="false">
        <filter id="mcc-thread-liquid-refraction" x="-18%" y="-18%" width="136%" height="136%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.028" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-70"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, hsl(var(--primary)) 18%, transparent), rgba(255,255,255,0.06) 42%, rgba(255,255,255,0.02))",
          filter: "url(#mcc-thread-liquid-refraction)",
          backdropFilter: "blur(22px) saturate(175%)",
          WebkitBackdropFilter: "blur(22px) saturate(175%)",
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
        style={{
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,.34), inset 0 -1px 0 rgba(255,255,255,.08), 0 20px 70px -32px rgba(0,0,0,.72)",
        }}
      />
    </>
  );
}

function LiquidSurface({ children, className }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/20 bg-background/80 shadow-2xl backdrop-blur-xl",
        "dark:border-white/10 dark:bg-slate-950/80",
        className
      )}
    >
      <LiquidLayer />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function AvatarArt({ avatar, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block bg-cover bg-center", className)}
      style={{ backgroundImage: `url("${avatar}")` }}
    />
  );
}

function ThreadBubble({ thread, active, onActivate, onClose }) {
  const avatar = usePersistentAvatar(thread.key);
  const title = thread.title || "Problem thread";
  const description = thread.description || "Problem discussion";

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onActivate(thread.key)}
        className={cn(
          "relative grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-white/20 bg-background/70 shadow-xl outline-none transition-all duration-200",
          "hover:-translate-x-1 hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          active && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
        aria-label={`Open ${title}`}
      >
        <LiquidLayer />
        <AvatarArt avatar={avatar} className="relative z-10 h-11 w-11 rounded-full shadow-sm" />
        <span className="absolute bottom-1 right-1 z-10 grid h-4 w-4 place-items-center rounded-full border border-background bg-primary text-primary-foreground">
          <MessageSquare className="h-2.5 w-2.5" />
        </span>
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose(thread.key);
        }}
        className={cn(
          "absolute -right-1 -top-1 z-20 grid h-6 w-6 place-items-center rounded-full border bg-background text-muted-foreground shadow-md transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "opacity-100" : "pointer-events-none scale-75 opacity-0 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100"
        )}
        aria-label={`Close ${title}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <LiquidSurface className="pointer-events-none absolute right-[calc(100%+0.75rem)] top-1/2 hidden w-72 -translate-y-1/2 p-3 opacity-0 transition group-hover:block group-hover:opacity-100">
        <div className="flex items-start gap-3">
          <AvatarArt avatar={avatar} className="h-10 w-10 rounded-full border border-white/20" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{title}</p>
              <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px] uppercase tracking-wide">
                {scopeLabel(thread.problemType)}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
      </LiquidSurface>
    </div>
  );
}

export function FloatingThreadDock({ threads, activeKey, onActivate, onClose, onMinimize }) {
  const visibleThreads = useMemo(() => (threads || []).slice(-MAX_FLOATING_THREADS), [threads]);
  const activeThread = visibleThreads.find((thread) => thread.key === activeKey) || null;
  const activeAvatar = useMemo(() => (activeThread ? buildThreadAvatar(activeThread.key) : ""), [activeThread]);

  if (visibleThreads.length === 0) return null;

  return (
    <>
      {activeThread && (
        <div className="fixed bottom-24 right-[5.75rem] z-50 w-[min(760px,calc(100vw-7rem))] max-sm:bottom-36 max-sm:right-4 max-sm:w-[calc(100vw-2rem)]">
          <LiquidSurface className="p-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div className="flex min-w-0 items-center gap-3">
                <AvatarArt avatar={activeAvatar} className="h-10 w-10 rounded-full border border-white/20 shadow-sm" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{activeThread.title || "Problem thread"}</p>
                    <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px] uppercase tracking-wide">
                      {scopeLabel(activeThread.problemType)}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{activeThread.description || "Problem discussion"}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onMinimize} aria-label="Minimize thread">
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => onClose(activeThread.key)} aria-label="Close thread">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <ProblemThread
              classroomId={activeThread.classroomId}
              problemId={activeThread.problemId}
              problemType={activeThread.problemType}
              classId={activeThread.classId}
              assignmentId={activeThread.assignmentId}
              currentUser={activeThread.currentUser}
            />
          </LiquidSurface>
        </div>
      )}

      <div className="fixed bottom-20 right-4 z-[60] flex max-h-[calc(100vh-8rem)] flex-col-reverse items-end gap-2 overflow-visible max-sm:bottom-24">
        {visibleThreads.map((thread) => (
          <ThreadBubble
            key={thread.key}
            thread={thread}
            active={thread.key === activeKey}
            onActivate={onActivate}
            onClose={onClose}
          />
        ))}
      </div>
    </>
  );
}
