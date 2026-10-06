import * as React from "react"

import { cn } from "@/lib/utils"

const Message = React.forwardRef(
  ({ className, align = "start", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex w-full gap-2.5",
        align === "end" ? "justify-end" : "justify-start",
        className
      )}
      {...props}
    />
  )
)
Message.displayName = "Message"

const MessageGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-3", className)} {...props} />
))
MessageGroup.displayName = "MessageGroup"

const MessageAvatar = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mt-5 grid h-7 w-7 shrink-0 place-items-center rounded-md border bg-muted text-[10px] font-semibold text-muted-foreground",
      className
    )}
    {...props}
  />
))
MessageAvatar.displayName = "MessageAvatar"

const MessageContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex min-w-0 max-w-full flex-col", className)}
    {...props}
  />
))
MessageContent.displayName = "MessageContent"

const MessageHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "mb-1 flex items-center gap-2 text-[11px] font-medium text-muted-foreground",
      className
    )}
    {...props}
  />
))
MessageHeader.displayName = "MessageHeader"

const MessageFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground", className)}
    {...props}
  />
))
MessageFooter.displayName = "MessageFooter"

export {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
}
