// Lightweight Supabase Realtime broadcast helper.
//
// The server does not keep a persistent websocket. Instead it POSTs to the
// Supabase Realtime HTTP endpoint, which fans the message out to every client
// subscribed to the channel. This lets notification delivery be event-driven
// (push) instead of clients polling on a timer.
//
// Security note: broadcast channels here are public, so payloads intentionally
// carry NO sensitive data. They are only a "something changed" signal. Clients
// always refetch the actual notification content over the authenticated API.

const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).replace(/\/+$/, "");
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || "";

export function userNotificationChannel(userId: string) {
  return `notifications:${userId}`;
}

// Fire-and-forget broadcast. Never throws into the caller: notification
// creation must succeed even if the realtime hop fails (clients still have a
// focus/visibility refetch fallback).
export async function broadcast(
  channel: string,
  event: string,
  payload: Record<string, unknown> = {}
) {
  if (!supabaseUrl || !serviceKey) {
    console.warn(
      "Realtime broadcast skipped: SUPABASE_URL or SUPABASE_SERVICE_KEY not set."
    );
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: channel,
            event,
            payload,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error(
        `Realtime broadcast failed (${res.status}) on channel ${channel}`
      );
    }
  } catch (err) {
    console.error("Realtime broadcast error:", err);
  }
}
