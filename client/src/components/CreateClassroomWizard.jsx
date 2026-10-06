"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Bell, Bot, CheckCircle2, Loader2, Plus, Server, Settings2 } from "lucide-react";
import { ApiClientError, apiGet, apiPost } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka";
  } catch {
    return "Asia/Dhaka";
  }
}

function StepDot({ active, complete, icon: Icon, label }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${
          active
            ? "border-foreground bg-foreground text-background"
            : complete
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              : "border-border bg-muted text-muted-foreground"
        }`}
      >
        {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
      </span>
      <span className={`truncate text-xs font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

export default function CreateClassroomWizard({
  open,
  onOpenChange,
  trigger,
  onCreated,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [discordStatus, setDiscordStatus] = useState(null);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [guilds, setGuilds] = useState([]);
  const [guildsLoading, setGuildsLoading] = useState(false);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [timezone, setTimezone] = useState(browserTimezone);
  const [reminderPreset, setReminderPreset] = useState("default");

  const discordEnabled = Boolean(discordStatus?.enabled);
  const steps = useMemo(() => (
    discordEnabled
      ? [
          { label: "Details", icon: Plus },
          { label: "Server", icon: Server },
          { label: "Automation", icon: Bell },
        ]
      : [{ label: "Details", icon: Plus }]
  ), [discordEnabled]);
  const selectedGuild = guilds.find((guild) => guild.id === selectedGuildId);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setDiscordLoading(true);
    setError("");
    apiGet("auth/discord/status")
      .then((status) => {
        if (!active) return;
        setDiscordStatus(status);
      })
      .catch((err) => {
        if (!active) return;
        setDiscordStatus({ enabled: false });
        setError(err?.message || "Could not check Discord status.");
      })
      .finally(() => {
        if (active) setDiscordLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !discordEnabled || !discordStatus?.linked) return;
    let active = true;
    setGuildsLoading(true);
    apiGet("classroom/discord/guilds")
      .then((res) => {
        if (!active) return;
        const nextGuilds = Array.isArray(res?.guilds) ? res.guilds : [];
        setGuilds(nextGuilds);
        setSelectedGuildId((current) => current || nextGuilds[0]?.id || "");
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || "Could not load Discord servers.");
      })
      .finally(() => {
        if (active) setGuildsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [discordEnabled, discordStatus?.linked, open]);

  useEffect(() => {
    if (open) return;
    setName("");
    setDescription("");
    setStep(0);
    setError("");
    setSubmitting(false);
    setSelectedGuildId("");
    setReminderPreset("default");
    setTimezone(browserTimezone());
  }, [open]);

  const connectDiscord = async () => {
    setError("");
    try {
      const res = await apiPost("auth/discord/authorize", {
        returnTo: window.location.pathname,
      });
      if (!res?.authorizeUrl) throw new Error("Discord authorization URL was not returned.");
      window.location.assign(res.authorizeUrl);
    } catch (err) {
      setError(err?.message || "Could not start Discord connection.");
    }
  };

  const canAdvance = () => {
    if (step === 0) return Boolean(name.trim());
    if (step === 1) return Boolean(discordStatus?.linked && selectedGuildId);
    return true;
  };

  const nextStep = () => {
    setError("");
    if (!canAdvance()) {
      setError(step === 0 ? "Classroom name is required." : "Choose a Discord server.");
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Classroom name is required.");
      setStep(0);
      return;
    }
    if (discordEnabled && (!discordStatus?.linked || !selectedGuildId)) {
      setError(discordStatus?.linked ? "Choose a Discord server." : "Connect Discord first.");
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        description,
      };
      if (discordEnabled) {
        payload.discord = {
          guildId: selectedGuildId,
          guildName: selectedGuild?.name || null,
          timezone,
          reminderPreset,
        };
      }
      const res = await apiPost("classroom/create", payload);
      if (!res?.success) throw new Error(res?.error || "Failed to create classroom.");
      onOpenChange?.(false);
      await onCreated?.(res.classroom);
    } catch (err) {
      if (err instanceof ApiClientError && err.data?.code === "DISCORD_LINK_REQUIRED") {
        setStep(1);
      }
      setError(err?.message || "Failed to create classroom.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Create classroom</DialogTitle>
          <DialogDescription>
            {discordEnabled
              ? "Set up the classroom, Discord server, and reminder defaults."
              : "Set a clear name and short description for students."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-2">
          {discordEnabled && (
            <div className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-3">
              {steps.map((item, index) => (
                <StepDot
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  active={step === index}
                  complete={step > index}
                />
              ))}
            </div>
          )}

          <div aria-live="polite">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {step === 0 && (
            <div className="grid gap-4">
              <div className="space-y-2">
                <label htmlFor="new-classroom-name" className="text-sm font-semibold">Classroom name</label>
                <Input
                  id="new-classroom-name"
                  placeholder="Advanced Graph Theory"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="new-classroom-description" className="text-sm font-semibold">Description</label>
                <Textarea
                  id="new-classroom-description"
                  placeholder="Topics, schedule, audience, outcomes"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-24 text-base md:text-sm"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {discordLoading ? (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">Checking Discord connection...</div>
              ) : !discordStatus?.linked ? (
                <div className="rounded-md border p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">Connect Discord first</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        MCC needs your Discord identity to create private classroom channels.
                      </p>
                      <Button type="button" size="sm" className="mt-3 gap-2" onClick={connectDiscord}>
                        <Bot className="h-4 w-4" />
                        Connect Discord
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Discord connected</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {discordStatus.connection?.globalName || discordStatus.connection?.username || "Linked account"}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-md text-emerald-600">Linked</Badge>
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
                      <Select value={selectedGuildId} onValueChange={setSelectedGuildId}>
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
                      You can reuse the same Discord server for multiple classrooms. MCC keeps each classroom&apos;s channels and permissions separate.
                    </p>
                    {selectedGuild?.botInviteUrl && (
                      <a
                        href={selectedGuild.botInviteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        Install MCC bot in this server
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4">
              <div className="rounded-md border p-3">
                <div className="flex items-start gap-3">
                  <Settings2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold">Default classroom automation</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Morning and end-of-day check-ins, session reminders, submission reminders, missed submission alerts, and pending review digests start enabled.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="discord-timezone" className="text-sm font-semibold">Timezone</label>
                  <Input
                    id="discord-timezone"
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    placeholder="Asia/Dhaka"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Reminder preset</label>
                  <Select value={reminderPreset} onValueChange={setReminderPreset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default reminders</SelectItem>
                      <SelectItem value="quiet">Quiet start</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              {discordEnabled && step > 0 && (
                <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))}>
                  Back
                </Button>
              )}
              {discordEnabled && step < steps.length - 1 && (
                <Button type="button" onClick={nextStep}>
                  Continue
                </Button>
              )}
            </div>
            {(!discordEnabled || step === steps.length - 1) && (
              <Button type="submit" disabled={submitting} className="w-full gap-2 font-semibold sm:w-auto">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Classroom
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
