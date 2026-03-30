"use client";

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useState } from "react";

export default function AnimatedTooltip({ items = [] }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const x = useMotionValue(0);
  const rotate = useSpring(useTransform(x, [-100, 100], [-45, 45]), {
    stiffness: 100,
    damping: 8,
  });
  const translateX = useSpring(useTransform(x, [-100, 100], [-40, 40]), {
    stiffness: 100,
    damping: 8,
  });

  const handleMouseMove = (event) => {
    const halfWidth = event.currentTarget.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  return (
    <div className="group flex flex-row">
      {items.map((item) => (
        <div
          key={`${item.id}-${item.designation}`}
          className="relative -mr-2 rounded-full border-2 border-border/60 bg-background"
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: "spring", stiffness: 260, damping: 12 },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                style={{ x: translateX, rotate, whiteSpace: "nowrap" }}
                className="absolute -left-1/2 -top-16 z-50 flex translate-x-1/2 flex-col items-center justify-center rounded-md border border-border/70 bg-popover px-4 py-2 text-xs text-popover-foreground shadow-xl"
              >
                <div className="absolute inset-x-10 -bottom-px z-30 h-px w-[20%] bg-gradient-to-r from-transparent via-primary to-transparent" />
                <div className="absolute -bottom-px left-10 z-30 h-px w-[40%] bg-gradient-to-r from-transparent via-ring to-transparent" />
                {item.role && (
                  <div className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-primary">
                    ({item.role})
                  </div>
                )}
                <div className="relative z-30 whitespace-nowrap text-base font-medium text-popover-foreground">
                  {item.name}
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                  <img
                    src="/vj.jpg"
                    alt="VJudge"
                    className="h-3.5 w-3.5 rounded-sm object-cover"
                  />
                  <span>{item.designation}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <img
            onMouseMove={handleMouseMove}
            src={item.image}
            alt={item.name}
            className="relative !m-0 h-12 w-12 rounded-full border-2 border-border object-cover object-top !p-0 transition duration-300 group-hover:z-30 group-hover:scale-105"
          />
        </div>
      ))}
    </div>
  );
}
