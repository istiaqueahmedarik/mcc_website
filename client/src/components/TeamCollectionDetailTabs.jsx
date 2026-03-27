"use client";

import { useMemo } from "react";

export default function TeamCollectionDetailTabs({
  activeSection,
  tabCounts,
  onSectionChange,
}) {

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
    onSectionChange?.(sectionKey);
  };

  return (
    <>
      <div className="inline-flex flex-wrap justify-center rounded-md border border-border bg-card p-1 shadow-sm gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabClick(tab.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
              activeSection === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            aria-current={activeSection === tab.key ? "page" : undefined}
          >
            {tab.label}
            {tab.count ? ` (${tab.count})` : ""}
          </button>
        ))}
      </div>
    </>
  );
}
