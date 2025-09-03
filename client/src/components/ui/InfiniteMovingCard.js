"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const scrollerRef = React.useRef<HTMLUListElement | null>(null);

  const [start, setStart] = useState(false);

  useEffect(() => {
    addAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        scrollerRef.current?.appendChild(duplicatedItem);
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }

  const getDirection = () => {
    if (containerRef.current) {
      containerRef.current.style.setProperty(
        "--animation-direction",
        direction === "left" ? "forwards" : "reverse"
      );
    }
  };

  const getSpeed = () => {
    if (containerRef.current) {
      if (speed === "fast") {
        containerRef.current.style.setProperty("--animation-duration", "20s");
      } else if (speed === "normal") {
        containerRef.current.style.setProperty("--animation-duration", "40s");
      } else {
        containerRef.current.style.setProperty("--animation-duration", "80s");
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,rgba(0,0,0,0.9)_15%,rgba(0,0,0,0.9)_85%,transparent)]",
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          "flex min-w-full shrink-0 gap-8 py-8 w-max flex-nowrap",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
      >
        {items.map((item, idx) => (
          <li
            key={idx}
            className={cn(
              "group relative w-[320px] md:w-[420px] flex-shrink-0",
              "[transform-style:preserve-3d] perspective-1000"
            )}
          >
            {/* Animated gradient border */}
            <div className="absolute inset-0 rounded-3xl p-[2px] bg-[linear-gradient(140deg,hsl(var(--primary))_0%,hsl(var(--highlight))_40%,transparent_90%)] opacity-60 group-hover:opacity-100 transition-all duration-500" />

            {/* Main card */}
            <figure className="relative h-full rounded-3xl bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-md border border-border/50 shadow-xl overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1">
              <div className="flex items-start gap-6 mb-6 px-6 pt-6">
                {/* Logo or avatar */}
                <div className="relative">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.company || item.name}
                      className="h-14 w-14 rounded-2xl border border-border/70 object-contain bg-white/90 p-2 shadow-inner group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/70 to-highlight/50 flex items-center justify-center text-lg font-bold text-white">
                      {item.company?.charAt(0) || item.name?.charAt(0) || "?"}
                    </div>
                  )}

                  {/* Verified badge */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-card shadow-sm flex items-center justify-center">
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 
                          01-1.414 0l-4-4a1 1 0 011.414-1.414L8 
                          12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                {/* Name + Role + Company */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground mb-1 truncate group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    {item.role || item.title || "Engineer"}
                  </p>
                  {item.company && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-primary/80 font-semibold">@</span>
                      <span className="font-bold text-primary group-hover:text-highlight transition-colors">
                        {item.company}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quote */}
              <blockquote className="relative px-6 pb-6 text-sm md:text-base text-muted-foreground leading-relaxed">
                <span className="absolute left-6 top-0 h-full w-px bg-gradient-to-b from-primary/60 via-border to-transparent" />
                {item.quote}
              </blockquote>

              {/* Decorative glow */}
              <div className="pointer-events-none absolute inset-0 rounded-3xl [background:radial-gradient(circle_at_80%_15%,hsl(var(--highlight)/0.15),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
};
