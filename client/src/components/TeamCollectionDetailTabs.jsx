"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useTransition } from "react";

export default function TeamCollectionDetailTabs({
  activeSection,
  tabCounts,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const tabs = useMemo(
    () => [
      {
        key: "current-teams",
        label: "Current Teams",
        count: tabCounts?.currentTeams || 0,
      },
      {
        key: "submissions",
        label: "Team submissions",
        count: tabCounts?.submissions || 0,
      },
      {
        key: "auto-preview",
        label: "Automatic preview",
        count: tabCounts?.autoPreview || 0,
      },
      {
        key: "manual-requests",
        label: "Team requests",
        count: tabCounts?.manualRequests || 0,
      },
      {
        key: "participants",
        label: "All participants",
        count: tabCounts?.participants || 0,
      },
    ],
    [tabCounts]
  );

  const onTabClick = (sectionKey) => {
    if (sectionKey === activeSection) return;

    const nextParams = new URLSearchParams(searchParams?.toString() || "");
    nextParams.set("section", sectionKey);

    startTransition(() => {
      router.push(`${pathname}?${nextParams.toString()}`);
    });
  };

  return (
    <>
      <div className="inline-flex flex-wrap justify-center rounded-md border border-border bg-card p-1 shadow-sm gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabClick(tab.key)}
            disabled={isPending && tab.key !== activeSection}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed ${
              activeSection === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            aria-current={activeSection === tab.key ? "page" : undefined}
            aria-busy={isPending && tab.key === activeSection}
          >
            {tab.label}
            {tab.count ? ` (${tab.count})` : ""}
          </button>
        ))}
      </div>

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
