import * as React from "react"

import { cn } from "@/lib/utils"

const bubbleVariants = {
  default:
    "border-transparent bg-primary text-primary-foreground shadow-sm",
  secondary:
    "border-border/70 bg-card text-card-foreground shadow-[0_8px_28px_-22px_hsl(var(--foreground))]",
  muted:
    "border-border/60 bg-muted/55 text-foreground",
  tinted:
    "border-primary/15 bg-primary/10 text-foreground",
  outline:
    "border-border bg-background text-foreground",
  ghost:
    "max-w-none border-transparent bg-transparent px-0 py-0 text-foreground shadow-none",
  destructive:
    "border-destructive/20 bg-destructive/10 text-destructive",
}

const Bubble = React.forwardRef(
  ({ className, align = "start", variant = "secondary", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex w-full",
        align === "end" ? "justify-end" : "justify-start",
        className
      )}
      {...props}
    />
  )
)
Bubble.displayName = "Bubble"

const BubbleContent = React.forwardRef(
  ({ className, variant = "secondary", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative max-w-[82%] rounded-lg border px-3.5 py-2.5 text-sm leading-relaxed",
        "break-words [overflow-wrap:anywhere]",
        bubbleVariants[variant] || bubbleVariants.secondary,
        className
      )}
      {...props}
    />
  )
)
BubbleContent.displayName = "BubbleContent"

const BubbleReactions = React.forwardRef(
  ({ className, side = "bottom", align = "end", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "mt-1 flex items-center gap-1",
        side === "top" && "mb-1 mt-0",
        align === "start" ? "justify-start" : "justify-end",
        className
      )}
      {...props}
    />
  )
)
BubbleReactions.displayName = "BubbleReactions"

const BubbleGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-2", className)} {...props} />
))
BubbleGroup.displayName = "BubbleGroup"

export { Bubble, BubbleContent, BubbleGroup, BubbleReactions }
