"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useTransition } from "react";

export function TeamCollectionTabs({ activeTab, collectingCount, finalizedCount, startCount }) {
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
      { key: "collecting", label: `In progress (${collectingCount})` },
      { key: "finalized", label: `Finalized (${finalizedCount})` },
      { key: "start", label: `Start New (${startCount})` },
    ],
    [collectingCount, finalizedCount, startCount]
  );

  const onTabClick = (tab) => {
    if (tab === activeTab) return;

    const nextParams = new URLSearchParams(searchParams?.toString() || "");
    nextParams.set("tab", tab);

    startTransition(() => {
      router.push(`${pathname}?${nextParams.toString()}`);
    });
  };

  return (
    <>
      <div className="flex flex-col items-center gap-3" aria-busy={isPending}>
        <div className="inline-flex rounded-md border border-border bg-card p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabClick(tab.key)}
              disabled={isPending && tab.key !== activeTab}
              className={`px-5 py-2.5 text-sm font-semibold rounded-md transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed ${activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              aria-current={activeTab === tab.key ? "page" : undefined}
              aria-busy={isPending && tab.key === activeTab}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isPending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
          role="status"
          aria-live="assertive"
        >
          <div className="px-6 py-5">
            <div className="flex items-center gap-3 text-foreground">
              <span
                className="inline-block h-12 w-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
                aria-hidden="true"
              />
              {/* <span className="text-base font-semibold">Loading tab content...</span> */}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
