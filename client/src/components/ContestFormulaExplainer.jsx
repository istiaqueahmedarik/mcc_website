"use client";

import { ArrowRight, FunctionSquare } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DEMERIT_BARS = [
  { label: "C0", value: 2 },
  { label: "C1", value: 1 },
  { label: "C2", value: 4 },
  { label: "C3", value: 3 },
];

export default function ContestFormulaExplainer({ className = "" }) {
  const reduceMotion = useReducedMotion();
  const total = DEMERIT_BARS.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...DEMERIT_BARS.map((item) => item.value));

  return (
    <div className={cn("rounded-lg border bg-muted/20 p-3", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
          <FunctionSquare className="h-3.5 w-3.5" />
        </span>
        <Badge variant="secondary">Example</Badge>
        <code className="min-w-0 break-words text-xs text-muted-foreground">sum(demerits)</code>
      </div>

      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr),auto,7rem]">
        <div className="grid h-24 grid-cols-4 items-end gap-2 rounded-md bg-background px-3 pb-3 pt-4">
          {DEMERIT_BARS.map((item, index) => (
            <div key={item.label} className="flex h-full min-w-0 flex-col justify-end gap-1">
              <motion.div
                className="rounded-t-sm bg-destructive/70"
                initial={reduceMotion ? false : { scaleY: 0.3, opacity: 0.65 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: 0.22, delay: reduceMotion ? 0 : index * 0.04, ease: [0.23, 1, 0.32, 1] }}
                style={{
                  height: `${Math.max(12, (item.value / maxValue) * 58)}px`,
                  transformOrigin: "bottom",
                }}
              />
              <div className="flex items-center justify-between gap-1 text-[10px] leading-none text-muted-foreground">
                <span className="truncate">{item.label}</span>
                <span className="font-mono tabular-nums">{item.value}</span>
              </div>
            </div>
          ))}
        </div>

        <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />

        <motion.div
          className="rounded-md border bg-background p-3 text-center"
          initial={reduceMotion ? false : { opacity: 0.75, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: reduceMotion ? 0 : 0.18, ease: [0.23, 1, 0.32, 1] }}
        >
          <p className="text-[10px] font-medium uppercase text-muted-foreground">Result</p>
          <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{total}</p>
        </motion.div>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Four contest rows feed the selected metric, then the aggregate function returns one score value.
      </p>
    </div>
  );
}
