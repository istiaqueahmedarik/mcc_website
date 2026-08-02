"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/utils/supabase/client";

const RENEW_RETRY_MS = 10_000;

function isUsableCredentials(value) {
  return Boolean(value?.channel && value?.access_token);
}

export function useClassroomThreadRealtime({
  realtime,
  channelName,
  eventName = "thread_changed",
  onSignal,
  onSubscribed,
  onRenew,
}) {
  const externalCredentials = useMemo(() => {
    if (realtime) return realtime;
    return channelName ? { channel: channelName, event: eventName } : null;
  }, [channelName, eventName, realtime]);
  const [credentials, setCredentials] = useState(externalCredentials);
  const [status, setStatus] = useState(externalCredentials?.channel ? "connecting" : "idle");
  const [lastSignalAt, setLastSignalAt] = useState(null);
  const signalRef = useRef(onSignal);
  const subscribedRef = useRef(onSubscribed);
  const renewRef = useRef(onRenew);

  useEffect(() => {
    signalRef.current = onSignal;
    subscribedRef.current = onSubscribed;
    renewRef.current = onRenew;
  }, [onRenew, onSignal, onSubscribed]);

  useEffect(() => {
    setCredentials(externalCredentials);
  }, [externalCredentials]);

  const enabled = useMemo(() => Boolean(
    isUsableCredentials(credentials) &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ), [credentials]);

  useEffect(() => {
    if (!credentials?.channel) {
      setStatus("idle");
      return undefined;
    }
    if (!enabled) {
      setStatus("unavailable");
      return undefined;
    }

    let active = true;
    let channel = null;
    setStatus("connecting");

    void (async () => {
      try {
        await supabase.realtime.setAuth(credentials.access_token);
        if (!active) return;

        channel = supabase
          .channel(credentials.channel, {
            config: {
              private: true,
              broadcast: { self: false },
            },
          })
          .on("broadcast", { event: credentials.event || eventName }, (payload) => {
            if (!active) return;
            setLastSignalAt(new Date());
            const signal = payload?.payload && typeof payload.payload === "object"
              ? payload.payload
              : payload;
            signalRef.current?.(signal);
          })
          .subscribe((subscriptionStatus) => {
            if (!active) return;
            if (subscriptionStatus === "SUBSCRIBED") {
              setStatus("connected");
              void subscribedRef.current?.();
            } else if (subscriptionStatus === "CHANNEL_ERROR") {
              setStatus("disconnected");
            } else if (subscriptionStatus === "TIMED_OUT") {
              setStatus("reconnecting");
            } else if (subscriptionStatus === "CLOSED") {
              setStatus("disconnected");
            }
          });
      } catch {
        if (active) setStatus("unavailable");
      }
    })();

    return () => {
      active = false;
      setStatus("idle");
      if (channel) void supabase.removeChannel(channel);
    };
  }, [credentials?.access_token, credentials?.channel, credentials?.event, enabled, eventName]);

  useEffect(() => {
    if (!enabled || !credentials?.renew_after || !renewRef.current) return undefined;
    let active = true;
    let timer;

    const schedule = (delay) => {
      timer = window.setTimeout(async () => {
        try {
          const nextCredentials = await renewRef.current?.(credentials);
          if (!active) return;
          if (!isUsableCredentials(nextCredentials)) throw new Error("Realtime renewal failed");
          setCredentials(nextCredentials);
        } catch {
          if (!active) return;
          const expiresAt = new Date(credentials.expires_at || 0).getTime();
          if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
            setStatus("disconnected");
            return;
          }
          setStatus("reconnecting");
          schedule(RENEW_RETRY_MS);
        }
      }, Math.max(0, delay));
    };

    schedule(new Date(credentials.renew_after).getTime() - Date.now());
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [credentials, enabled]);

  return { status, lastSignalAt, enabled };
}
