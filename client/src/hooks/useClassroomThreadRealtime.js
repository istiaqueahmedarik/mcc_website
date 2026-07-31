"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabase/client";

export function useClassroomThreadRealtime({ channelName, eventName = "thread_changed", onSignal }) {
  const [status, setStatus] = useState(channelName ? "connecting" : "idle");
  const [lastSignalAt, setLastSignalAt] = useState(null);

  const enabled = useMemo(() => {
    return Boolean(
      channelName &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }, [channelName]);

  useEffect(() => {
    if (!channelName) {
      setStatus("idle");
      return undefined;
    }

    if (!enabled) {
      setStatus("unavailable");
      return undefined;
    }

    setStatus("connecting");
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
        },
      })
      .on("broadcast", { event: eventName }, (payload) => {
        setLastSignalAt(new Date());
        onSignal?.(payload);
      })
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") setStatus("connected");
        else if (subscriptionStatus === "CHANNEL_ERROR") setStatus("disconnected");
        else if (subscriptionStatus === "TIMED_OUT") setStatus("reconnecting");
        else if (subscriptionStatus === "CLOSED") setStatus("disconnected");
      });

    return () => {
      setStatus("idle");
      supabase.removeChannel(channel);
    };
  }, [channelName, enabled, eventName, onSignal]);

  return {
    status,
    lastSignalAt,
    enabled,
  };
}
