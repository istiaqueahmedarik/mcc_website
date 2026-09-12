"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export function AnimatedCollapsibleContent({
  open,
  children,
  className,
  ...props
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          {...props}
          className={cn("overflow-hidden", className)}
          initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0, y: 10 }}
          animate={reduceMotion ? { opacity: 1 } : { height: "auto", opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0, y: 10 }}
          transition={reduceMotion ? { duration: 0 } : {
            height: { duration: 0.18, ease: "easeOut" },
            opacity: { duration: 0.18, ease: "easeIn" },
            y: { duration: 0.25, ease: "easeOut" },
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
