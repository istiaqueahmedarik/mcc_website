"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  Server,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ApiClientError, apiGet, apiPost, apiPut } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const ruleCopy = {
  morning_checkin: {
    label: "Morning check-in",
    description: "Ask students for goals and blockers.",
    kind: "local_time",
  },
  morning_digest: {
    label: "Morning digest",
    description: "Post the day plan to Discord.",
    kind: "local_time",
  },
  end_of_day_checkin: {
    label: "End-of-day check-in",
    description: "Collect completed work and next steps.",
    kind: "local_time",
  },
  end_of_day_digest: {
    label: "End-of-day digest",
    description: "Summarize classroom activity.",
    kind: "local_time",
  },
  session_reminder: {
    label: "Session reminder",
    description: "Nudge students before scheduled classes.",
    kind: "offset",
  },
  submission_reminder: {
    label: "Submission reminder",
    description: "Nudge students before explicit due dates.",
    kind: "offset",
  },
  missed_submission: {
    label: "Missed submission",
    description: "Notify once after a due date passes.",
    kind: "offset",
  },
  pending_review_digest: {
    label: "Pending review digest",
    description: "Send trainers a review queue summary.",
    kind: "local_time",
  },
  website_reply_alert: {
    label: "Website reply alert",
    description: "Content-free deep link when a website thread reply lands.",
    kind: "toggle",
  },
};

const ruleOrder = Object.keys(ruleCopy);

const statusStyles = {
  ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  healthy: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  provisioning: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  pending_bot_install: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  action_required: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  permission_error: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  unavailable: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  disabled: "border-muted bg-muted text-muted-foreground",
  archived: "border-muted bg-muted text-muted-foreground",
  deleted: "border-muted bg-muted text-muted-foreground",
  unknown: "border-border bg-background text-muted-foreground",
};

function prettyStatus(value) {
  return String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusBadge(value) {
  const status = String(value || "unknown");
  return (
    <Badge variant="outline" className={statusStyles[status] || statusStyles.unknown}>
      {prettyStatus(status)}
    </Badge>
  );
}

function normalizeTime(value) {
  const text = String(value || "").trim();
  return /^\d{2}:\d{2}/.test(text) ? text.slice(0, 5) : "";
}

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka";
  } catch {
    return "Asia/Dhaka";
  }
}

function normalizeRule(rule) {
  const ruleType = rule?.rule_type || rule?.ruleType;
  return {
    ruleType,
    enabled: Boolean(rule?.enabled),
    localTime: normalizeTime(rule?.local_time || rule?.localTime),
    offsetMinutes: Number.isFinite(Number(rule?.offset_minutes ?? rule?.offsetMinutes))
      ? Number(rule?.offset_minutes ?? rule?.offsetMinutes)
      : null,
    timezone: rule?.timezone || "",
    metadata: rule?.metadata || {},
  };
}

function normalizeRules(incoming) {
  const byType = new Map((Array.isArray(incoming) ? incoming : []).map((rule) => {
    const normalized = normalizeRule(rule);
    return [normalized.ruleType, normalized];
  }));
  return ruleOrder.map((ruleType) => ({
    ruleType,
    enabled: byType.get(ruleType)?.enabled ?? false,
    localTime: byType.get(ruleType)?.localTime || "",
    offsetMinutes: byType.get(ruleType)?.offsetMinutes ?? null,
    timezone: byType.get(ruleType)?.timezone || "",
    metadata: byType.get(ruleType)?.metadata || {},
  }));
}

function rosterState(row) {
  if (row?.isPlaceholder || row?.enrollmentStatus !== "active") {
    return {
      label: row?.enrollmentStatus === "link_pending" ? "Link pending" : "Placeholder",
      className: "border-muted bg-muted text-muted-foreground",
    };
  }
  if (!row?.discord) {
    return {
      label: "Discord link required",
      className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }
  if (row.discord.status === "reauth_required") {
    return {
      label: "Reconnect required",
      className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    };
  }
  if (!row?.channel) {
    return {
      label: "Provisioning pending",
      className: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    };
  }
  if (row.channel.status === "active") {
    return {
      label: "Channel ready",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }
  if (row.channel.status === "action_required") {
    return {
      label: "Provisioning error",
      className: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
    };
  }
  return {
    label: prettyStatus(row.channel.status),
    className: statusStyles[row.channel.status] || statusStyles.unknown,
  };
}

function formatDiscordName(discord) {
  if (!discord) return "Not linked";
  return discord.globalName || discord.username || discord.discordUserId;
}

export function ClassroomDiscordSettingsCard({ classroomId, isTrainer = false }) {
  const [statusPayload, setStatusPayload] = useState(null);
  const [rules, setRules] = useState([]);
  const [roster, setRoster] = useState([]);
  const [timezone, setTimezone] = useState(browserTimezone);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [binding, setBinding] = useState(false);
  const [changingChannels, setChangingChannels] = useState(false);
  const [changeChannelsOpen, setChangeChannelsOpen] = useState(false);
  const [changeGuilds, setChangeGuilds] = useState([]);
  const [changeGuildsLoading, setChangeGuildsLoading] = useState(false);
  const [changeGuildId, setChangeGuildId] = useState("");
  const [changeError, setChangeError] = useState("");
  const [trainerDiscordStatus, setTrainerDiscordStatus] = useState(null);
  const [trainerDiscordLoading, setTrainerDiscordLoading] = useState(false);
  const [guilds, setGuilds] = useState([]);
  const [guildsLoading, setGuildsLoading] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [bindReminderPreset, setBindReminderPreset] = useState("default");
  const [bindError, setBindError] = useState("");
  const [manualLinks, setManualLinks] = useState({});
  const [manualSaving, setManualSaving] = useState("");
  const [error, setError] = useState("");

  const discordStatus = statusPayload?.status || null;
  const enabled = statusPayload?.enabled !== false;
  const selectedGuild = guilds.find((guild) => guild.id === selectedGuildId);
  const selectedChangeGuild = changeGuilds.find((guild) => guild.id === changeGuildId);
  const trainerConnectPending = (
    trainerDiscordLoading ||
    (isTrainer && enabled && !discordStatus && !bindError && trainerDiscordStatus === null)
  );

  const rosterSummary = useMemo(() => {
    const rows = Array.isArray(roster) ? roster : [];
    return {
      total: rows.length,
      ready: rows.filter((row) => rosterState(row).label === "Channel ready").length,
      needsAction: rows.filter((row) => {
        const label = rosterState(row).label;
        return label.includes("required") || label.includes("error");
      }).length,
    };
  }, [roster]);

  const loadDiscord = useCallback(async () => {
    if (!classroomId) return;
    setLoading(true);
    setError("");
    try {
      const statusResponse = await apiGet(`classroom/${classroomId}/discord`);
      setStatusPayload(statusResponse);
      setTimezone(statusResponse?.status?.timezone || browserTimezone());

      if (statusResponse?.enabled === false || !statusResponse?.status) {
        setRules([]);
        setRoster([]);
        return;
      }

      const [rulesResponse, rosterResponse] = await Promise.all([
        apiGet(`classroom/${classroomId}/discord/rules`).catch((err) => {
          if (err instanceof ApiClientError && err.status === 404) return { rules: [] };
          throw err;
        }),
        isTrainer
          ? apiGet(`classroom/${classroomId}/discord/roster`).catch((err) => {
              if (err instanceof ApiClientError && err.status === 404) return { roster: [] };
              throw err;
            })
          : Promise.resolve({ roster: [] }),
      ]);
      setRules(normalizeRules(rulesResponse?.rules));
      setRoster(Array.isArray(rosterResponse?.roster) ? rosterResponse.roster : []);
    } catch (err) {
      setError(err?.message || "Could not load Discord integration.");
    } finally {
      setLoading(false);
    }
  }, [classroomId, isTrainer]);

  useEffect(() => {
    loadDiscord();
  }, [loadDiscord]);

  const loadTrainerDiscordConnectState = useCallback(async () => {
    if (!classroomId || !isTrainer || !enabled || discordStatus) return;
    setTrainerDiscordLoading(true);
    setBindError("");
    try {
      const status = await apiGet("auth/discord/status");
      setTrainerDiscordStatus(status);
      if (!status?.linked) {
        setGuilds([]);
        setSelectedGuildId("");
        return;
      }

      setGuildsLoading(true);
      const guildResponse = await apiGet("classroom/discord/guilds");
      const nextGuilds = Array.isArray(guildResponse?.guilds) ? guildResponse.guilds : [];
      setGuilds(nextGuilds);
      setSelectedGuildId((current) => current || nextGuilds[0]?.id || "");
    } catch (err) {
      setBindError(err?.message || "Could not load Discord connection options.");
    } finally {
      setTrainerDiscordLoading(false);
      setGuildsLoading(false);
    }
  }, [classroomId, discordStatus, enabled, isTrainer]);

  const loadChangeGuildOptions = useCallback(async () => {
    if (!classroomId || !isTrainer || !enabled || !discordStatus) return;
    setChangeGuildsLoading(true);
    setChangeError("");
    try {
      const status = await apiGet("auth/discord/status");
      setTrainerDiscordStatus(status);
      if (!status?.linked) {
        setChangeGuilds([]);
        setChangeGuildId("");
        return;
      }

      const guildResponse = await apiGet("classroom/discord/guilds");
      const nextGuilds = Array.isArray(guildResponse?.guilds) ? guildResponse.guilds : [];
      setChangeGuilds(nextGuilds);
      setChangeGuildId((current) => {
        if (current && nextGuilds.some((guild) => guild.id === current)) return current;
        if (discordStatus?.guildId && nextGuilds.some((guild) => guild.id === discordStatus.guildId)) {
          return discordStatus.guildId;
        }
        return nextGuilds[0]?.id || "";
      });
    } catch (err) {
      setChangeGuilds([]);
      setChangeGuildId("");
      setChangeError(err?.message || "Could not load Discord server options.");
    } finally {
      setChangeGuildsLoading(false);
    }
  }, [classroomId, discordStatus, enabled, isTrainer]);

  useEffect(() => {
    if (loading) return;
    loadTrainerDiscordConnectState();
  }, [loadTrainerDiscordConnectState, loading]);

  useEffect(() => {
    if (!changeChannelsOpen) return;
    loadChangeGuildOptions();
  }, [changeChannelsOpen, loadChangeGuildOptions]);

  const updateRule = useCallback((ruleType, patch) => {
    setRules((current) => current.map((rule) => (
      rule.ruleType === ruleType ? { ...rule, ...patch } : rule
    )));
  }, []);

  const connectDiscord = useCallback(async () => {
    setBindError("");
    try {
      const res = await apiPost("auth/discord/authorize", {
        returnTo: window.location.pathname,
      });
      if (!res?.authorizeUrl) throw new Error("Discord authorization URL was not returned.");
      window.location.assign(res.authorizeUrl);
    } catch (err) {
      setBindError(err?.message || "Could not start Discord connection.");
    }
  }, []);

  const bindClassroomDiscord = useCallback(async () => {
    if (!selectedGuildId) {
      setBindError("Choose a Discord server first.");
      return;
    }

    setBinding(true);
    setBindError("");
    const toastId = toast.loading("Connecting classroom to Discord...");
    try {
      await apiPost(`classroom/${classroomId}/discord`, {
        guildId: selectedGuildId,
        timezone,
        reminderPreset: bindReminderPreset,
        privacyAcknowledged: true,
      });
      toast.success("Discord provisioning queued for this classroom", { id: toastId });
      await loadDiscord();
    } catch (err) {
      const message = err?.message || "Could not connect this classroom to Discord.";
      setBindError(message);
      toast.error(message, { id: toastId });
      if (err instanceof ApiClientError && err.data?.code === "DISCORD_LINK_REQUIRED") {
        await loadTrainerDiscordConnectState();
      }
    } finally {
      setBinding(false);
    }
  }, [bindReminderPreset, classroomId, loadDiscord, loadTrainerDiscordConnectState, selectedGuildId, timezone]);

  const saveDiscordSettings = useCallback(async () => {
    setSaving(true);
    const toastId = toast.loading("Saving Discord settings...");
    try {
      await apiPut(`classroom/${classroomId}/discord`, {
        timezone,
        privacyAcknowledged: true,
      });
      await apiPut(`classroom/${classroomId}/discord/rules`, {
        rules: rules.map((rule) => ({
          ruleType: rule.ruleType,
          enabled: rule.enabled,
          localTime: rule.localTime || null,
          offsetMinutes: rule.offsetMinutes,
          timezone,
          metadata: rule.metadata || {},
        })),
      });
      toast.success("Discord settings saved", { id: toastId });
      await loadDiscord();
    } catch (err) {
      toast.error(err?.message || "Failed to save Discord settings", { id: toastId });
    } finally {
      setSaving(false);
    }
  }, [classroomId, loadDiscord, rules, timezone]);

  const queueRepair = useCallback(async () => {
    setRepairing(true);
    const toastId = toast.loading("Queueing Discord repair...");
    try {
      await apiPost(`classroom/${classroomId}/discord/reconcile`, {});
      toast.success("Discord repair queued", { id: toastId });
      await loadDiscord();
    } catch (err) {
      toast.error(err?.message || "Failed to queue Discord repair", { id: toastId });
    } finally {
      setRepairing(false);
    }
  }, [classroomId, loadDiscord]);

  const changeDiscordChannels = useCallback(async () => {
    if (!changeGuildId) {
      setChangeError("Choose a Discord server first.");
      return;
    }

    setChangingChannels(true);
    setChangeError("");
    const sameGuild = changeGuildId === discordStatus?.guildId;
    const toastId = toast.loading(sameGuild ? "Queueing Discord channel refresh..." : "Moving Discord channels...");
    try {
      await apiPost(`classroom/${classroomId}/discord/channels/change`, {
        guildId: changeGuildId,
        privacyAcknowledged: true,
      });
      toast.success(
        sameGuild
          ? "Fresh Discord channel provisioning queued"
          : "Discord channel move queued",
        { id: toastId },
      );
      setChangeChannelsOpen(false);
      await loadDiscord();
    } catch (err) {
      const message = err?.message || "Failed to change Discord channels.";
      setChangeError(message);
      toast.error(message, { id: toastId });
      if (err instanceof ApiClientError && err.data?.code === "DISCORD_LINK_REQUIRED") {
        await loadChangeGuildOptions();
      }
    } finally {
      setChangingChannels(false);
    }
  }, [changeGuildId, classroomId, discordStatus?.guildId, loadChangeGuildOptions, loadDiscord]);

  const updateManualLinkDraft = useCallback((studentId, patch) => {
    setManualLinks((current) => ({
      ...current,
      [studentId]: {
        discordUserId: "",
        username: "",
        ...(current[studentId] || {}),
        ...patch,
      },
    }));
  }, []);

  const saveTrustedDiscordLink = useCallback(async (row) => {
    const draft = manualLinks[row.studentId] || {};
    const discordUserId = String(draft.discordUserId || "").trim();
    if (!discordUserId) {
      toast.error("Add a Discord user ID or @mention first.");
      return;
    }

    setManualSaving(row.studentId);
    const toastId = toast.loading("Trusting Discord account...");
    try {
      await apiPost(`classroom/${classroomId}/discord/roster/${row.studentId}/trusted-link`, {
        discordUserId,
        username: String(draft.username || "").trim(),
        note: "Trusted by classroom manager from the Discord roster.",
      });
      toast.success("Discord account trusted and bot repair queued", { id: toastId });
      setManualLinks((current) => {
        const next = { ...current };
        delete next[row.studentId];
        return next;
      });
      await loadDiscord();
    } catch (err) {
      toast.error(err?.message || "Failed to trust Discord account", { id: toastId });
    } finally {
      setManualSaving("");
    }
  }, [classroomId, loadDiscord, manualLinks]);

  if (loading) {
    return (
      <Card className="rounded-lg border">
        <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Discord integration…
        </CardContent>
      </Card>
    );
  }

  if (!enabled) {
    return (
      <Card className="rounded-lg border border-dashed">
        <CardHeader className="p-5">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" />
            Discord Integration
          </CardTitle>
          <CardDescription>
            Discord integration is disabled in this environment.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-lg border">
      <CardHeader className="border-b p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-4 w-4" />
              Discord Integration
            </CardTitle>
            <CardDescription>
              Private channel provisioning, trainer-controlled reminders, and roster health.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {discordStatus?.staffChannelId && discordStatus?.guildId ? (
              <Button asChild type="button" variant="outline" size="sm" className="gap-2">
                <a
                  href={`https://discord.com/channels/${discordStatus.guildId}/${discordStatus.staffChannelId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Staff channel
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={loadDiscord}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
            {isTrainer && discordStatus ? (
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={queueRepair} disabled={repairing}>
                {repairing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                Repair
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        {error ? (
          <div role="status" className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        {!discordStatus ? (
          isTrainer ? (
            <section className="space-y-4 rounded-lg border border-dashed p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Server className="h-4 w-4" />
                    Connect this classroom to Discord
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a server you manage. MCC will create this classroom&apos;s private channels and keep them separate from other classrooms in the same server.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={loadTrainerDiscordConnectState}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>

              {bindError ? (
                <div role="status" className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{bindError}</p>
                </div>
              ) : null}

              {trainerConnectPending ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking your Discord connection...
                </div>
              ) : !trainerDiscordStatus?.linked ? (
                <div className="rounded-lg border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Connect Discord first</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        MCC needs your Discord account to list servers where you have Manage Server permission.
                      </p>
                      <Button type="button" size="sm" className="mt-3 gap-2" onClick={connectDiscord}>
                        <Bot className="h-4 w-4" />
                        Connect Discord
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.48fr)]">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">Discord connected</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {trainerDiscordStatus.connection?.globalName || trainerDiscordStatus.connection?.username || "Linked account"}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        Linked
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Discord server</label>
                      {guildsLoading ? (
                        <div className="rounded-md border p-3 text-sm text-muted-foreground">Loading eligible servers...</div>
                      ) : guilds.length === 0 ? (
                        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                          No servers with Manage Server permission were found. Create or choose a server, then reconnect if needed.
                        </div>
                      ) : (
                        <Select value={selectedGuildId} onValueChange={setSelectedGuildId} disabled={binding}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a server" />
                          </SelectTrigger>
                          <SelectContent>
                            {guilds.map((guild) => (
                              <SelectItem key={guild.id} value={guild.id}>{guild.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <p className="text-xs text-muted-foreground">
                        The same Discord server can host multiple MCC classrooms.
                      </p>
                      {selectedGuild?.botInviteUrl ? (
                        <a
                          href={selectedGuild.botInviteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          Install MCC bot in this server
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Timezone</span>
                      <Input
                        value={timezone}
                        onChange={(event) => setTimezone(event.target.value)}
                        placeholder="Asia/Dhaka"
                        disabled={binding}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Reminder preset</span>
                      <Select value={bindReminderPreset} onValueChange={setBindReminderPreset} disabled={binding}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default reminders</SelectItem>
                          <SelectItem value="quiet">Quiet start</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <Button
                      type="button"
                      className="w-full gap-2"
                      onClick={bindClassroomDiscord}
                      disabled={binding || guildsLoading || guilds.length === 0 || !selectedGuildId}
                    >
                      {binding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
                      {binding ? "Connecting..." : "Connect classroom"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <div className="rounded-lg border border-dashed p-4">
              <p className="text-sm font-semibold">Discord is not bound to this classroom.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                A classroom trainer can connect this classroom to a Discord server from Settings.
              </p>
            </div>
          )
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Server</p>
                <p className="mt-1 truncate text-sm font-semibold">{discordStatus.guildName || discordStatus.guildId}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provisioning</p>
                <div className="mt-2">{statusBadge(discordStatus.provisioningState)}</div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channels</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {discordStatus.studentChannelCount || 0} student
                  {Number(discordStatus.studentChannelCount || 0) === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Health</p>
                <div className="mt-2">{statusBadge(discordStatus.installationHealth || discordStatus.installationStatus)}</div>
              </div>
            </div>

            {discordStatus.actionRequiredReason ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{discordStatus.actionRequiredReason}</p>
              </div>
            ) : null}

            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <ShieldAlert className="h-4 w-4" />
                Privacy note
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Student channels are private to the student, trainers, assigned substitutes, and the bot. Discord server administrators can still bypass channel denies.
              </p>
            </div>

            {isTrainer ? (
              <>
                <section className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <Server className="h-4 w-4" />
                        Channel destination
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Current server: {discordStatus.guildName || discordStatus.guildId}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-fit gap-2"
                      onClick={() => setChangeChannelsOpen(true)}
                      disabled={changingChannels}
                    >
                      {changingChannels ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Change channels
                    </Button>
                  </div>
                </section>

                <Dialog
                  open={changeChannelsOpen}
                  onOpenChange={(open) => {
                    setChangeChannelsOpen(open);
                    if (!open) setChangeError("");
                  }}
                >
                  <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                      <DialogTitle>Change Discord channels</DialogTitle>
                      <DialogDescription>
                        Move this classroom to another server or provision a fresh channel set in the current server.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {changeError ? (
                        <div role="status" className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <p>{changeError}</p>
                        </div>
                      ) : null}

                      <div className="rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                        MCC will archive the old channel mappings and queue the Discord worker to create fresh mapped channels. Old Discord channels are not deleted automatically.
                      </div>

                      {changeGuildsLoading ? (
                        <div className="flex items-center gap-3 rounded-lg border p-4 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading eligible servers...
                        </div>
                      ) : !trainerDiscordStatus?.linked ? (
                        <div className="rounded-lg border p-4">
                          <p className="text-sm font-semibold">Connect Discord first</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            MCC needs your Discord account to verify server management permission.
                          </p>
                          <Button type="button" size="sm" className="mt-3 gap-2" onClick={connectDiscord}>
                            <Bot className="h-4 w-4" />
                            Connect Discord
                          </Button>
                        </div>
                      ) : changeGuilds.length === 0 ? (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                          No servers with Manage Server permission were found.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">Discord server</label>
                          <Select value={changeGuildId} onValueChange={setChangeGuildId} disabled={changingChannels}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a server" />
                            </SelectTrigger>
                            <SelectContent>
                              {changeGuilds.map((guild) => (
                                <SelectItem key={guild.id} value={guild.id}>
                                  {guild.name}
                                  {guild.id === discordStatus.guildId ? " (current)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedChangeGuild?.botInviteUrl ? (
                            <a
                              href={selectedChangeGuild.botInviteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                            >
                              Install MCC bot in this server
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setChangeChannelsOpen(false)}
                        disabled={changingChannels}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="gap-2"
                        onClick={changeDiscordChannels}
                        disabled={changingChannels || changeGuildsLoading || !changeGuildId || !trainerDiscordStatus?.linked}
                      >
                        {changingChannels ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
                        {changingChannels ? "Queueing..." : "Queue channel change"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
              <section className="space-y-3 rounded-lg border p-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Clock3 className="h-4 w-4" />
                    Classroom timezone
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Used for daily check-ins and digest schedules.
                  </p>
                </div>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">IANA timezone</span>
                  <Input
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    placeholder="Asia/Dhaka"
                    disabled={!isTrainer || saving}
                  />
                </label>
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  Existing assignments only trigger submission reminders after trainers set an explicit due date.
                </div>
              </section>

              <section className="space-y-3 rounded-lg border p-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <BellRing className="h-4 w-4" />
                    Automation rules
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Trainers can enable, disable, or reschedule each Discord automation independently.
                  </p>
                </div>
                <div className="space-y-2">
                  {rules.map((rule) => {
                    const copy = ruleCopy[rule.ruleType] || { label: prettyStatus(rule.ruleType), kind: "toggle" };
                    return (
                      <div key={rule.ruleType} className="grid gap-3 rounded-lg border bg-background p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.enabled}
                              onCheckedChange={(checked) => updateRule(rule.ruleType, { enabled: checked })}
                              disabled={!isTrainer || saving}
                              aria-label={`Toggle ${copy.label}`}
                            />
                            <p className="text-sm font-semibold">{copy.label}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{copy.description}</p>
                        </div>
                        {copy.kind === "local_time" ? (
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            Time
                            <Input
                              type="time"
                              className="h-9 w-32"
                              value={rule.localTime}
                              onChange={(event) => updateRule(rule.ruleType, { localTime: event.target.value })}
                              disabled={!isTrainer || saving || !rule.enabled}
                            />
                          </label>
                        ) : copy.kind === "offset" ? (
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            Offset
                            <Input
                              type="number"
                              className="h-9 w-28"
                              value={rule.offsetMinutes ?? ""}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                updateRule(rule.ruleType, { offsetMinutes: Number.isFinite(value) ? value : null });
                              }}
                              disabled={!isTrainer || saving || !rule.enabled}
                            />
                            <span>min</span>
                          </label>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {isTrainer ? (
                  <Button type="button" className="gap-2" onClick={saveDiscordSettings} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving..." : "Save Discord settings"}
                  </Button>
                ) : null}
              </section>
            </div>

            {isTrainer ? (
              <section className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <Users className="h-4 w-4" />
                      Roster provisioning
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Linked accounts, reconnect requirements, and private-channel readiness.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" />
                      {rosterSummary.total} total
                    </Badge>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      {rosterSummary.ready} ready
                    </Badge>
                    <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      {rosterSummary.needsAction} need action
                    </Badge>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Student</th>
                        <th className="px-3 py-2 font-semibold">Discord</th>
                        <th className="px-3 py-2 font-semibold">Channel</th>
                        <th className="px-3 py-2 font-semibold">State</th>
                        <th className="px-3 py-2 font-semibold">Trusted link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                            No students in this classroom yet.
                          </td>
                        </tr>
                      ) : roster.map((row) => {
                        const state = rosterState(row);
                        const draft = manualLinks[row.studentId] || { discordUserId: "", username: "" };
                        const canTrustManually = !row.isPlaceholder && row.enrollmentStatus === "active";
                        return (
                          <tr key={row.studentId} className="border-b last:border-b-0">
                            <td className="px-3 py-2">
                              <p className="font-medium">{row.name}</p>
                              <p className="text-xs text-muted-foreground">{row.email || row.mistId || row.enrollmentStatus}</p>
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{formatDiscordName(row.discord)}</p>
                              <p className="text-xs text-muted-foreground">{row.discord?.discordUserId || "Unique link required"}</p>
                              {row.discord?.source ? (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className={row.discord.source === "trusted_manual"
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}
                                  >
                                    {row.discord.source === "trusted_manual" ? "Trusted manual" : "OAuth linked"}
                                  </Badge>
                                </div>
                              ) : null}
                              {row.discord?.verifiedByName ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Verified by {row.discord.verifiedByName}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2">
                              <p className="font-medium">{row.channel?.channelId || "—"}</p>
                              <p className="text-xs text-muted-foreground">{row.channel?.status ? prettyStatus(row.channel.status) : "Not created yet"}</p>
                            </td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className={state.className}>
                                {state.label}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              {canTrustManually ? (
                                <div className="grid gap-2">
                                  <div className="grid gap-2 xl:grid-cols-[minmax(150px,1fr)_minmax(130px,0.8fr)]">
                                    <Input
                                      value={draft.discordUserId}
                                      onChange={(event) => updateManualLinkDraft(row.studentId, { discordUserId: event.target.value })}
                                      placeholder="@mention or Discord user ID"
                                      aria-label={`Discord user ID or mention for ${row.name}`}
                                      disabled={manualSaving === row.studentId}
                                    />
                                    <Input
                                      value={draft.username}
                                      onChange={(event) => updateManualLinkDraft(row.studentId, { username: event.target.value })}
                                      placeholder="Display name optional"
                                      aria-label={`Discord display name for ${row.name}`}
                                      disabled={manualSaving === row.studentId}
                                    />
                                  </div>
                                  <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                                    <p className="text-xs text-muted-foreground">
                                      Use only after verifying the account belongs to this student. OAuth is still needed for automatic server join.
                                    </p>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="w-fit gap-2"
                                      onClick={() => saveTrustedDiscordLink(row)}
                                      disabled={manualSaving === row.studentId}
                                    >
                                      {manualSaving === row.studentId ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <UserPlus className="h-3.5 w-3.5" />
                                      )}
                                      Trust & queue bot
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Available after this placeholder is claimed and active.
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                Discord updates for this classroom are trainer-managed. Your private channel mirrors Discord-origin messages into the website thread.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
