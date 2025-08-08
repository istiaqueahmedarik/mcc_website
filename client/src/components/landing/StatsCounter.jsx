"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Animated counter for landing page statistics.
 * Props:
 *  - value: final number to reach
 *  - suffix: string appended (e.g., '+')
 *  - duration: animation duration ms
 *  - title: label below number
 */
export default function StatsCounter({ value, suffix = '', duration = 1800, title }) {
  const [count, setCount] = useState(0);
  const start = useRef(null);
  const frame = useRef(null);

  useEffect(() => {
    const step = (timestamp) => {
      if (!start.current) start.current = timestamp;
      const progress = Math.min((timestamp - start.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setCount(Math.floor(eased * value));
      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      }
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration]);

  return (
    <div className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-b from-secondary/40 to-secondary/10 dark:from-secondary/20 dark:to-secondary/5 border border-border/60 backdrop-blur-sm shadow-sm">
      <span className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(90deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)]">
        {count}{count === value ? suffix : ''}
      </span>
      <span className="mt-1 text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </span>
    </div>
  );
}
