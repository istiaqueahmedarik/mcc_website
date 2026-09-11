"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

// App Router supplies React's ViewTransition; no second navigation provider.
export default function TrainerViewTransition({ children, enabled = true }) {
  const pathname = usePathname();
  if (!enabled) return children;

  return (
    <ViewTransition
      key={pathname}
      name="trainer-page"
      default="none"
      enter="trainer-fade"
      exit="trainer-fade"
      share="trainer-fade"
    >
      <div data-trainer-transitions="">{children}</div>
    </ViewTransition>
  );
}
