"use client";

import { createContext, useContext, useMemo, useState } from "react";

const AchievementFilterContext = createContext(null);

export default function AchievementFilterProvider({ children }) {
  const [selectedTags, setSelectedTags] = useState([]);

  const value = useMemo(
    () => ({ selectedTags, setSelectedTags }),
    [selectedTags]
  );

  return (
    <AchievementFilterContext.Provider value={value}>
      {children}
    </AchievementFilterContext.Provider>
  );
}

export function useAchievementFilter() {
  const ctx = useContext(AchievementFilterContext);
  if (!ctx) {
    throw new Error("useAchievementFilter must be used within AchievementFilterProvider");
  }
  return ctx;
}
