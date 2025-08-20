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
          "flex min-w-full shrink-0 gap-8 py-8 w-max flex-nowrap",
          start && "animate-scroll",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}>
        {items.map((item, idx) => (
          <li
            key={idx}
            className={cn(
              "group relative w-[320px] md:w-[420px] flex-shrink-0",
              // perspective wrapper for 3D hover effects
              "[transform-style:preserve-3d] perspective-1000"
            )}
          >
            {/* Animated gradient border */}
            <div className="absolute inset-0 rounded-3xl p-[2px] bg-gradient-to-br from-primary/60 via-highlight/40 to-primary/20 opacity-60 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-highlight/20 animate-pulse" />
            </div>

            {/* Main card */}
            <figure className="relative h-full rounded-3xl bg-gradient-to-br from-card/95 via-card/90 to-card/95 backdrop-blur-xl border border-border/40 shadow-2xl overflow-hidden transition-all duration-500 group-hover:shadow-3xl group-hover:-translate-y-2 group-hover:rotate-x-2">

              {/* Background decorative elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-highlight/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-highlight/20 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/20 to-transparent rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700 delay-100" />

              <div className="relative p-8 flex flex-col h-full">
                {/* Header with name and company info */}
                <div className="flex items-start gap-6 mb-6">
                  {/* Company Logo (replacing profile picture) */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-gradient-to-br from-primary/30 to-highlight/30 shadow-lg group-hover:shadow-xl transition-all duration-300 bg-white/95">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={`${item.company} logo`}
                          className="w-full h-full object-contain p-2 group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to gradient background with company initial
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="w-full h-full bg-gradient-to-br from-primary/80 to-highlight/60 flex items-center justify-center text-lg font-bold text-white"
                        style={{ display: item.image ? 'none' : 'flex' }}
                      >
                        {item.company?.charAt(0) || 'C'}
                      </div>
                    </div>
                    {/* Verified badge */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-card shadow-sm flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {/* Name and Role */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors duration-300 truncate">
                      {item.name}
                    </h3>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground font-medium">
                        {item.role || 'Software Engineer'}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-primary/80 font-semibold">@</span>
                        <span className="text-xs font-bold text-primary group-hover:text-highlight transition-colors">
                          {item.company || 'Tech Company'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quote section */}
                <div className="relative flex-1 mb-6">
                  <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-primary/60 to-highlight/40 rounded-full" />
                  <div className="pl-6 text-lg md:text-xl font-semibold text-foreground leading-relaxed group-hover:text-primary transition-colors duration-300">
                    {item.quote}
                  </div>
                </div>

                {/* Floating particles animation */}
                <div className="absolute top-8 right-8 w-2 h-2 bg-highlight/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-1000 group-hover:animate-ping" />
                <div className="absolute bottom-12 left-8 w-1.5 h-1.5 bg-primary/60 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-1000 delay-300 group-hover:animate-pulse" />
                <div className="absolute top-1/2 right-4 w-1 h-1 bg-highlight/80 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-1000 delay-500 group-hover:animate-bounce" />
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out skew-x-12" />
            </figure>
          </li>
        ))}
      </ul>
    </div>)
  );
};
