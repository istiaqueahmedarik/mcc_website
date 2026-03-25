"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

export default function TransitionButton({
  href,
  idleText = "Full Details",
  pendingText = "Opening details...",
  className = "w-full mt-auto",
  icon,
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (isPending) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isPending]);

  const handleOpenDetails = () => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <>
      <Button
        type="button"
        className={className}
        onClick={handleOpenDetails}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? (
          pendingText
        ) : (
          <span className="flex items-center gap-2">
            {icon}
            {idleText}
          </span>
        )}
      </Button>

      {isPending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
          role="status"
          aria-live="assertive"
        >
          <div className="px-6 py-5">
            <span
              className="inline-block h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </>
  );
}
