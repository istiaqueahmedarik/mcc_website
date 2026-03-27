"use client";

import { TeamCollectionTabs } from "@/components/TeamCollectionTabs";
import { useEffect, useState } from "react";

const VALID_TABS = new Set(["collecting", "finalized", "start"]);

function normalizeTab(tab) {
  return VALID_TABS.has(tab) ? tab : "collecting";
}

export function TeamCollectionTabPanels({
  initialTab,
  collectingCount,
  finalizedCount,
  startCount,
  collectingPanel,
  finalizedPanel,
  startPanel,
}) {
  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab));

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveTab(normalizeTab(params.get("tab")));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const current = normalizeTab(params.get("tab"));
    if (current === activeTab) return;

    params.set("tab", activeTab);
    const qs = params.toString();
    const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.pushState(window.history.state, "", nextUrl);
  }, [activeTab]);

  return (
    <>
      <div className="flex justify-center">
        <TeamCollectionTabs
          activeTab={activeTab}
          collectingCount={collectingCount}
          finalizedCount={finalizedCount}
          startCount={startCount}
          onTabChange={setActiveTab}
        />
      </div>

      {activeTab === "collecting" && collectingPanel}
      {activeTab === "finalized" && finalizedPanel}
      {activeTab === "start" && startPanel}
    </>
  );
}
