"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Bot, Loader2, ShieldCheck } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

const DISCORD_CALLBACK_REASON_COPY = {
  access_denied: "Discord connection was cancelled before MCC received permission.",
  account_in_use: "That Discord account is already linked to another MCC user. For student testing, use a different Discord account, log out of Discord first, or unlink the other MCC user.",
  callback_failed: "Discord sent MCC back, but the server could not finish the token exchange. Check the server console for the safe callback error code.",
  invalid_user: "Discord did not return a valid user ID. Please try again.",
  missing_code: "Discord did not return an authorization code. Please try again.",
  state: "That Discord connection attempt expired or was already used. Please start again.",
  unsupported_flow: "This Discord connection flow is not supported for the current session. Please log in again and retry.",
};

function cleanDiscordCallbackParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("discord");
  url.searchParams.delete("reason");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export default function DiscordConnectionRequiredCard({
  title = "Connect Discord to continue",
  description = "MCC classrooms now use Discord for private trainer/student channels, reminders, and check-ins. Link your Discord account once to unlock protected classroom tools.",
  returnTo = "",
  className = "",
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const discordResult = params.get("discord");
    const reason = params.get("reason") || "";

    if (discordResult === "error") {
      setError(
        DISCORD_CALLBACK_REASON_COPY[reason]
          || "Discord connection did not complete. Please try again.",
      );
      return;
    }

    if (discordResult !== "connected") return;

    let cancelled = false;
    setLoading(true);
    setError("Discord connected. Rechecking classroom access…");
    apiGet("auth/discord/status")
      .then((status) => {
        if (cancelled) return;
        if (status?.linked) {
          cleanDiscordCallbackParams();
          window.location.reload();
          return;
        }
        setError("Discord returned successfully, but MCC still cannot see an active account link. Please try connecting again.");
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Could not verify Discord connection status.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const connectDiscord = async () => {
    setLoading(true);
    setError("");
    try {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      const res = await apiPost("auth/discord/authorize", {
        returnTo: returnTo || currentPath,
      });
      if (!res?.authorizeUrl) throw new Error("Discord authorization URL was not returned.");
      window.location.assign(res.authorizeUrl);
    } catch (err) {
      setError(err?.message || "Could not start Discord connection.");
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-xl border bg-card p-6 shadow-sm ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-muted text-primary">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Discord required</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>

          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <span className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Unique account link
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <Bot className="h-4 w-4 text-sky-600" />
              Private channels
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              Trainer-controlled reminders
            </span>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button onClick={connectDiscord} disabled={loading} className="mt-5 gap-2 font-semibold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            Connect Discord
          </Button>
        </div>
      </div>
    </div>
  );
}
