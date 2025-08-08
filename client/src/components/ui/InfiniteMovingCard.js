"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

export const InfiniteMovingCards = ({
  items,
  direction = "left",
  speed = "fast",
  pauseOnHover = true,
  className
}) => {
  const containerRef = React.useRef(null);
  const scrollerRef = React.useRef(null);

  useEffect(() => {
    addAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [start, setStart] = useState(false);
  function addAnimation() {
    if (containerRef.current && scrollerRef.current) {
      const scrollerContent = Array.from(scrollerRef.current.children);

      scrollerContent.forEach((item) => {
        const duplicatedItem = item.cloneNode(true);
        if (scrollerRef.current) {
          scrollerRef.current.appendChild(duplicatedItem);
        }
      });

      getDirection();
      getSpeed();
      setStart(true);
    }
  }
  const getDirection = () => {
    if (containerRef.current) {
      if (direction === "left") {
        containerRef.current.style.setProperty("--animation-direction", "forwards");
      } else {
        containerRef.current.style.setProperty("--animation-direction", "reverse");
      }
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
    (<div
      ref={containerRef}
      className={cn(
        // outer mask gradient for smooth fade edges
        "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,rgba(0,0,0,0.9)_15%,rgba(0,0,0,0.9)_85%,transparent)]",
        className
      )}>
      <ul
        ref={scrollerRef}
        className={cn(
          "flex min-w-full shrink-0 gap-6 py-6 w-max flex-nowrap",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}>
        {items.map((item, idx) => (
          <li
            key={idx}
            className={cn(
              "group relative w-[300px] md:w-[400px] flex-shrink-0",
              // perspective wrapper for subtle hover lift
              "[transform-style:preserve-3d]"
            )}
          >
            {/* gradient border frame */}
            <div className="absolute inset-0 rounded-2xl p-[1px] bg-[linear-gradient(140deg,hsl(var(--primary))_0%,hsl(var(--highlight))_40%,transparent_80%)] opacity-60 group-hover:opacity-100 transition-opacity" />
            {/* inner card */}
            <figure className="relative h-full rounded-2xl bg-background/70 backdrop-blur-md border border-border/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col gap-4 px-5 py-6 transition-all duration-300 group-hover:shadow-[0_6px_28px_-6px_rgba(0,0,0,0.4)] group-hover:-translate-y-1">
              <div className="flex items-center gap-4">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-12 w-12 rounded-full border border-border/70 object-contain bg-gradient-to-br from-secondary/40 to-background p-1 shadow-inner"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full border border-border/70 bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {item.name?.charAt(0) || '?'}
                  </div>
                )}
                <div className="flex flex-col">
                  <figcaption className="text-sm font-semibold tracking-wide text-foreground">{item.name}</figcaption>
                  <span className="text-[11px] uppercase tracking-wider font-medium text-primary/80 group-hover:text-primary transition-colors">{item.title}</span>
                </div>
              </div>
              <blockquote className="relative pl-3 text-xs md:text-sm text-muted-foreground leading-relaxed">
                <span className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-primary/60 via-border to-transparent" />
                {item.quote}
              </blockquote>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-[10px] tracking-wider text-muted-foreground/70">ALUMNI</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary/80 font-medium group-hover:bg-primary/20 transition-colors">Mentor</span>
              </div>
              {/* subtle decorative grid */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl [background:radial-gradient(circle_at_80%_15%,hsl(var(--highlight)/0.15),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </figure>
          </li>
        ))}
      </ul>
    </div>)
  );
};
