"use client";

import { useEffect, useRef } from "react";

// Reads only sections already available to this role. The parent retains its
// existing section handlers (including attendance fetches and other setup).
export default function ClassroomTabUrlSync({ allowedValues, onSelect }) {
  const selectRef = useRef(onSelect);
  const valuesKey = allowedValues.join(",");
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    const allowed = new Set(valuesKey.split(","));
    const restore = () => {
      const value =
        new URLSearchParams(window.location.search).get("tab") || "updates";
      selectRef.current(allowed.has(value) ? value : "updates");
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [valuesKey]);
  return null;
}
