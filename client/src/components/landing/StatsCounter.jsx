"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, Code, Trophy } from "lucide-react";

/**
 * Animated counter for landing page statistics.
 * Props:
 *  - value: final number to reach
 *  - suffix: string appended (e.g., '+')
 *  - duration: animation duration ms
 *  - title: label below number
 */
export default function StatsCounter({ value, suffix = '', duration = 2500, title }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);
  const start = useRef(null);
  const frame = useRef(null);

  // Icon mapping for different stats
  const getIcon = (title) => {
    const icons = {
      'Active Members': <Users className="w-5 h-5" />,
      'Contests Hosted': <Trophy className="w-5 h-5" />,
      'Problems Tracked': <Code className="w-5 h-5" />,
      'National Awards': <TrendingUp className="w-5 h-5" />
    };
    return icons[title] || <TrendingUp className="w-5 h-5" />;
  };

  // Intersection Observer to trigger animation when in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [isVisible]);

  // Enhanced counter animation
  useEffect(() => {
    if (!isVisible) return;

    const step = (timestamp) => {
      if (!start.current) start.current = timestamp;
      const progress = Math.min((timestamp - start.current) / duration, 1);

      // Enhanced easing with bounce effect
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      setCount(Math.floor(eased * value));

      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      }
    };

    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current) {
        cancelAnimationFrame(frame.current);
      }
    };
  }, [isVisible, value, duration]);

  return (
    <div
      ref={elementRef}
      className="group relative rounded-xl border border-border/60 p-[1px] bg-gradient-to-br from-primary/10 via-background to-background hover:from-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/10"
    >
      <div className="h-full rounded-[inherit] p-6 flex flex-col items-center bg-background/80 backdrop-blur relative overflow-hidden">
        {/* Icon with gradient background */}
        <motion.div
          className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-highlight/20 text-primary group-hover:from-primary/30 group-hover:to-highlight/30 transition-all duration-300 group-hover:scale-110 mb-4"
          initial={{ scale: 0, rotate: -180 }}
          animate={isVisible ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring", bounce: 0.3 }}
        >
          {getIcon(title)}
        </motion.div>

        {/* Main counter with typewriter effect */}
        <motion.span
          className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-[linear-gradient(90deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          {count.toLocaleString()}{count === value ? suffix : ''}
        </motion.span>

        {/* Title */}
        <motion.span
          className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider text-center group-hover:text-foreground/80 transition-colors"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {title}
        </motion.span>

        {/* Enhanced progress bar */}
        <div className="w-full h-1 bg-secondary/20 rounded-full mt-4 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-highlight rounded-full relative"
            initial={{ width: 0 }}
            animate={isVisible ? { width: `${(count / value) * 100}%` } : { width: 0 }}
            transition={{ duration: 0.8, delay: 1, ease: "easeOut" }}
          >
            {/* Shimmer effect on progress bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-pulse" />
          </motion.div>
        </div>

        {/* Hover effect overlay - similar to features section */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-highlight/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[inherit]" />

        {/* Subtle animated border */}
        <div className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-20 transition-opacity duration-500"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(var(--primary))/0.3, transparent)',
            backgroundSize: '200% 100%',
            animation: 'feature-shimmer 2s linear infinite'
          }} />
      </div>
    </div>
  );
}
