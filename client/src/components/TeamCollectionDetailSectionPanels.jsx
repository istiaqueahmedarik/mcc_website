"use client";

import TeamCollectionDetailTabs from "@/components/TeamCollectionDetailTabs";
import { Children, useEffect, useState } from "react";

const VALID_SECTIONS = new Set([
  "current-teams",
  "submissions",
  "auto-preview",
  "manual-requests",
  "participants",
]);

function normalizeSection(section) {
  return VALID_SECTIONS.has(section) ? section : "current-teams";
}

export default function TeamCollectionDetailSectionPanels({
  initialSection,
  tabCounts,
  children,
}) {
  const [activeSection, setActiveSection] = useState(() =>
    normalizeSection(initialSection)
  );

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveSection(normalizeSection(params.get("section")));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const current = normalizeSection(params.get("section"));
    if (current === activeSection) return;

    params.set("section", activeSection);
    const qs = params.toString();
    const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.pushState(window.history.state, "", nextUrl);
  }, [activeSection]);

  return (
    <>
      <div className="flex justify-center">
        <TeamCollectionDetailTabs
          activeSection={activeSection}
          tabCounts={tabCounts}
          onSectionChange={setActiveSection}
        />
      </div>

      {Children.toArray(children).map((child, idx) => {
        if (!child || typeof child !== "object") return child;
        const key = child.props?.sectionKey;
        if (!key) return child;
        return (
          <div key={`${key}-${idx}`} className={key === activeSection ? "" : "hidden"}>
            {child}
          </div>
        );
      })}
    </>
  );
}
