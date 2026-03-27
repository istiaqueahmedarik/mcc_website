"use client";

import { useMemo } from "react";

export function TeamCollectionTabs({
  activeTab,
  collectingCount,
  finalizedCount,
  startCount,
  onTabChange,
}) {

  const formatTabLabel = (label, count) =>
    Number.isFinite(count) ? `${label} (${count})` : label;

  const tabs = useMemo(
    () => [
      { key: "collecting", label: formatTabLabel("In progress", collectingCount) },
      { key: "finalized", label: formatTabLabel("Finalized", finalizedCount) },
      { key: "start", label: formatTabLabel("Start New", startCount) },
    ],
    [collectingCount, finalizedCount, startCount]
  );

  const onTabClick = (tab) => {
    if (tab === activeTab) return;
    onTabChange?.(tab);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex rounded-md border border-border bg-card p-1 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabClick(tab.key)}
              className={`px-5 py-2.5 text-sm font-semibold rounded-md transition-colors duration-200 ${activeTab === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              aria-current={activeTab === tab.key ? "page" : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
