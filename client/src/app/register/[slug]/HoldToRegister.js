"use client";

import { Button } from "@/components/ui/button";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./registration.module.css";

const HOLD_SECONDS = 1;

export default function HoldToRegister({ busy, validate, onConfirm }) {
  const [standardMode, setStandardMode] = useState(false);
  const [holding, setHolding] = useState(false);
  const progress = useMotionValue(0);
  const reduceMotion = useReducedMotion();
  const buttonRef = useRef(null);
  const gesture = useRef(null);
  const animation = useRef(null);
  const confirm = useRef(onConfirm);
  confirm.current = onConfirm;

  const cancel = useCallback(() => {
    const pointerId = gesture.current?.pointerId;
    gesture.current = null;
    if (pointerId !== undefined && buttonRef.current?.hasPointerCapture(pointerId)) buttonRef.current.releasePointerCapture(pointerId);
    animation.current?.stop();
    progress.set(0);
    setHolding(false);
  }, [progress]);

  useEffect(() => {
    const visibilityChange = () => { if (document.hidden) cancel(); };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", visibilityChange);
      animation.current?.stop();
    };
  }, [cancel]);

  useEffect(() => { if (busy) cancel(); }, [busy, cancel]);

  function start(source) {
    if (busy || gesture.current || !validate()) return;
    gesture.current = source;
    setHolding(true);
    progress.set(0);
    animation.current = animate(progress, 1, {
      duration: HOLD_SECONDS,
      ease: "linear",
      onComplete: () => {
        if (!gesture.current || document.hidden) return cancel();
        cancel();
        confirm.current();
      },
    });
  }

  return <div className="mt-4 space-y-2">
    <Button
      ref={buttonRef}
      data-registration-confirm
      type="button"
      disabled={busy}
      className={`${styles.holdButton} min-h-14 w-full rounded-xl text-base`}
      data-holding={holding}
      aria-describedby="registration-submit-help"
      onPointerDown={(event) => {
        if (standardMode || !event.isPrimary || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        start({ pointerId: event.pointerId });
      }}
      onPointerMove={(event) => {
        if (gesture.current?.pointerId !== event.pointerId) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onBlur={cancel}
      onKeyDown={(event) => {
        if (event.key === "Escape") return cancel();
        if (standardMode || ![" ", "Enter"].includes(event.key)) return;
        event.preventDefault();
        if (!event.repeat) start({ key: event.key });
      }}
      onKeyUp={(event) => {
        if (standardMode || ![" ", "Enter"].includes(event.key)) return;
        event.preventDefault();
        cancel();
      }}
      onClick={() => { if (standardMode && !busy) onConfirm(); }}
      onContextMenu={(event) => { if (!standardMode) event.preventDefault(); }}
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : standardMode || reduceMotion ? <Send className="h-5 w-5" aria-hidden="true" /> : <svg className={styles.holdRing} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" /><motion.circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ pathLength: progress }} transform="rotate(-90 12 12)" /></svg>}
      {busy ? "Registering…" : standardMode ? "Confirm registration" : holding ? "Keep holding…" : "Hold to register"}
    </Button>
    <p id="registration-submit-help" className="text-center text-xs leading-5 text-muted-foreground">{standardMode ? "Select Confirm registration when you are ready." : "Hold for 1 second. Release or move away to cancel. Keyboard: hold Space or Enter."}</p>
    <div className="text-center"><Button type="button" variant="link" className="min-h-11 text-xs text-muted-foreground" disabled={busy} onClick={() => { cancel(); setStandardMode((value) => !value); }}>{standardMode ? "Use hold to register" : "Use a standard submit button instead"}</Button></div>
    <span className="sr-only" role="status">{busy ? "Submitting your registration." : holding ? "Hold started. Keep holding for one second to register." : ""}</span>
  </div>;
}
