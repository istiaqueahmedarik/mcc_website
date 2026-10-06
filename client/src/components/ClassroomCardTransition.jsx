"use client";

import { createContext, useContext, useEffect, useMemo, useState, ViewTransition } from "react";
import { usePathname } from "next/navigation";

const ClassroomNavigationContext = createContext(null);

export function ClassroomNavigationProvider({ children }) {
  const pathname = usePathname();
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (preview && pathname !== "/trainer/dashboard" && pathname !== `/classroom/live/${preview.id}`) {
      setPreview(null);
    }
  }, [pathname, preview]);
  const value = useMemo(() => ({ preview, setPreview }), [preview]);
  return <ClassroomNavigationContext.Provider value={value}>{children}</ClassroomNavigationContext.Provider>;
}

export function useClassroomNavigation() {
  const context = useContext(ClassroomNavigationContext);
  if (!context) throw new Error("ClassroomNavigationProvider is required");
  return context;
}

export function useClassroomPreview(classroomId, loading) {
  const { preview, setPreview } = useClassroomNavigation();
  useEffect(() => {
    // Discard the display-only handoff on success, error, or an access gate.
    if (!loading && preview?.id === classroomId) setPreview(null);
  }, [classroomId, loading, preview, setPreview]);
  return loading && preview?.id === classroomId ? preview : null;
}

export function ClassroomCardTransition({ classroomId, title = false, enabled = true, children }) {
  if (!enabled) return children;
  return (
    <ViewTransition
      name={`classroom-${title ? "title" : "surface"}-${classroomId}`}
      default="none"
      share="classroom-morph"
    >
      {children}
    </ViewTransition>
  );
}
