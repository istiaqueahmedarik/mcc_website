"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function TransitionButton({
  href,
  idleText = "Full Details",
  pendingText = "Opening details...",
  className = "w-full mt-auto",
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleOpenDetails = () => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Button
      type="button"
      className={className}
      onClick={handleOpenDetails}
      disabled={isPending}
      aria-busy={isPending}
    >
      {isPending ? pendingText : idleText}
    </Button>
  );
}
