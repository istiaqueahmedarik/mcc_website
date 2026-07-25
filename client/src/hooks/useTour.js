"use client";

import { useEffect, useRef, useCallback } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Custom hook to run ADHD-friendly product tours using driver.js.
 * Automatically starts for first-time visitors based on `storageKey`.
 * Allows manual re-triggering anytime via `startTour()`.
 */
export function useTour({ storageKey, steps = [], autoStart = true, onComplete }) {
  const driverRef = useRef(null);

  const markTourSeen = useCallback(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        localStorage.setItem(storageKey, "true");
      } catch (err) {
        console.error("Failed to save tour completion status:", err);
      }
    }
  }, [storageKey]);

  const startTour = useCallback(() => {
    if (typeof window === "undefined" || !steps || steps.length === 0) return;

    if (driverRef.current && driverRef.current.isActive()) {
      driverRef.current.destroy();
    }

    const driverObj = driver({
      showProgress: true,
      progressText: "Step {{current}} of {{total}}",
      animate: true,
      smoothScroll: true,
      allowClose: true,
      allowKeyboardControl: true,
      overlayColor: "#000000",
      overlayOpacity: 0.7,
      stagePadding: 6,
      stageRadius: 8,
      skipMissingElement: true,
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Got it! 🎉",
      steps: steps,
      onDestroyed: () => {
        markTourSeen();
        if (onComplete) onComplete();
      },
    });

    driverRef.current = driverObj;
    driverObj.drive();
  }, [steps, markTourSeen, onComplete]);

  const resetTour = useCallback(() => {
    if (typeof window !== "undefined" && storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.error("Failed to reset tour status:", err);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !autoStart || !storageKey || !steps.length) return;
    try {
      const hasSeenTour = localStorage.getItem(storageKey);
      if (!hasSeenTour) {
        const timer = setTimeout(() => {
          startTour();
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch (err) {
      console.error("Failed to check tour status:", err);
    }
  }, [storageKey, autoStart, steps.length, startTour]);

  return {
    startTour,
    resetTour,
  };
}
