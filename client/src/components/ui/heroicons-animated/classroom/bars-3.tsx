// Source: https://www.heroicons-animated.com/r/bars-3.json (MIT; see ../LICENSE)
"use client";

import type { Transition, Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { cn } from "@/lib/utils";

export interface Bars3IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface Bars3IconProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

const TRANSITION: Transition = {
  duration: 0.3,
  ease: "easeInOut",
};

const CREATE_BAR_VARIANTS = (delay: number): Variants => ({
  normal: {
    scaleX: 1,
    transition: TRANSITION,
  },
  animate: {
    scaleX: [1, 0.6, 1],
    transition: {
      ...TRANSITION,
      delay,
    },
  },
});

const BARS = [
  { d: "M3.75 6.75h16.5", delay: 0 },
  { d: "M3.75 12h16.5", delay: 0.1 },
  { d: "M3.75 17.25h16.5", delay: 0.2 },
];

const Bars3Icon = forwardRef<Bars3IconHandle, Bars3IconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;

      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <span
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          {BARS.map((bar) => (
            <motion.path
              animate={controls}
              d={bar.d}
              initial="normal"
              key={bar.d}
              style={{ transformOrigin: "center" }}
              variants={CREATE_BAR_VARIANTS(bar.delay)}
            />
          ))}
        </svg>
      </span>
    );
  }
);

Bars3Icon.displayName = "Bars3Icon";

export { Bars3Icon };
