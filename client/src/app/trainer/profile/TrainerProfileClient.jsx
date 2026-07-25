"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Briefcase,
  Camera,
  Check,
  Github,
  Globe,
  Linkedin,
  Loader2,
  Mail,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

export default function TrainerProfileClient({
  user,
  saveTrainerProfileAction,
  saveProfilePicAction,
  saveBasicProfileAction,
}) {
  const [saving, setSaving] = useState(false);
  const [picSaving, setPicSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewPic, setPreviewPic] = useState(user.profile_pic || null);
  const fileInputRef = useRef(null);

  // Specialization tags state
  const [tags, setTags] = useState(
    Array.isArray(user.trainer_specializations) ? user.trainer_specializations : []
  );
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 12) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const removeTag = (tag) => setTags(tags.filter((t) => t !== tag));

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  const handlePicChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewPic(URL.createObjectURL(file));
    setPicSaving(true);
    const fd = new FormData();
    fd.append("image", file);
    await saveProfilePicAction(fd);
    setPicSaving(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const form = e.target;
    const fd = new FormData(form);
    // Append tags as JSON — the server action will parse this
    fd.set("trainer_specializations", JSON.stringify(tags));
    await saveTrainerProfileAction(fd);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const initials = (name) =>
    (name || "T")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("");

  const roleLabel = user.admin && user.trainer
    ? "Admin · Trainer"
    : user.admin
    ? "Admin"
    : "Trainer";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-1 border-b pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Trainer workspace
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your public trainer identity — picture, bio, experience, and links.
          </p>
        </div>

        <form onSubmit={handleSave}>
          <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
            {/* ── Left sidebar ── */}
            <aside className="flex flex-col gap-5">
              {/* Avatar card */}
              <div className="rounded-xl border bg-card p-6 text-center shadow-sm">
                <div className="relative mx-auto mb-4 w-fit">
                  <Avatar className="h-28 w-28 rounded-2xl border-2 border-primary/20">
                    <AvatarImage src={previewPic} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-3xl font-bold text-white">
                      {initials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-lg transition hover:scale-110"
                    aria-label="Change profile picture"
                  >
                    {picSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePicChange}
                    aria-label="Upload profile picture"
                  />
                </div>

                <h2 className="text-lg font-bold leading-snug">
                  {user.full_name || "Trainer"}
                </h2>
                <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600 dark:text-violet-400">
                    <ShieldCheck className="h-3 w-3" />
                    {roleLabel}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-left">
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-muted-foreground">{user.email}</span>
                  </div>

                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone-input"
                      name="phone"
                      type="text"
                      defaultValue={user.phone || ""}
                      placeholder="Phone number"
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Social links card */}
              <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  Links
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <Linkedin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0A66C2]" />
                    <Input
                      id="trainer-linkedin-input"
                      name="trainer_linkedin"
                      type="url"
                      defaultValue={user.trainer_linkedin || ""}
                      placeholder="linkedin.com/in/yourname"
                      className="pl-9 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <Github className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="trainer-github-input"
                      name="trainer_github"
                      type="url"
                      defaultValue={user.trainer_github || ""}
                      placeholder="github.com/yourname"
                      className="pl-9 text-sm"
                    />
                  </div>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="trainer-website-input"
                      name="trainer_website"
                      type="url"
                      defaultValue={user.trainer_website || ""}
                      placeholder="https://yourwebsite.com"
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            </aside>

            {/* ── Right main ── */}
            <main className="flex flex-col gap-5">
              {/* Identity */}
              <section className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <User className="h-4 w-4" />
                  Identity
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="full-name-input" className="text-xs font-semibold">
                      Full Name
                    </Label>
                    <Input
                      id="full-name-input"
                      name="full_name"
                      defaultValue={user.full_name || ""}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="trainer-title-input" className="text-xs font-semibold">
                      Professional Title
                    </Label>
                    <Input
                      id="trainer-title-input"
                      name="trainer_title"
                      defaultValue={user.trainer_title || ""}
                      placeholder="e.g. Competitive Programmer · ICPC Coach"
                    />
                  </div>
                </div>
              </section>

              {/* Bio */}
              <section className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  Bio
                </h3>
                <div className="space-y-1.5">
                  <Label htmlFor="trainer-bio-input" className="text-xs font-semibold">
                    About You
                  </Label>
                  <Textarea
                    id="trainer-bio-input"
                    name="trainer_bio"
                    defaultValue={user.trainer_bio || ""}
                    placeholder="Write a short bio — your background, teaching philosophy, and what you love about competitive programming."
                    className="min-h-[120px] resize-y text-sm leading-relaxed"
                  />
                </div>
              </section>

              {/* Experience */}
              <section className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  Previous Experience
                </h3>
                <div className="space-y-1.5">
                  <Label htmlFor="trainer-experience-input" className="text-xs font-semibold">
                    Experience &amp; Achievements
                  </Label>
                  <Textarea
                    id="trainer-experience-input"
                    name="trainer_experience"
                    defaultValue={user.trainer_experience || ""}
                    placeholder={`Share your competitive programming journey and teaching experience.\n\nExamples:\n• ICPC Asia Regional Finalist (2022, 2023)\n• Trainer at XYZ University Programming Club\n• Codeforces Expert (max 1900)\n• 3+ years coaching competitive programming teams`}
                    className="min-h-[180px] resize-y font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground">
                    Plain text or bullet points — this appears on your public trainer card.
                  </p>
                </div>
              </section>

              {/* Specializations */}
              <section className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <Tag className="h-4 w-4" />
                  Specializations
                </h3>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 rounded-full opacity-60 hover:opacity-100"
                          aria-label={`Remove ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {tags.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No specializations added yet.
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="specialization-input"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="e.g. Graph Theory, DP, Segment Tree…"
                      className="text-sm"
                      maxLength={40}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTag}
                      disabled={!tagInput.trim() || tags.length >= 12}
                      className="shrink-0 gap-1"
                      aria-label="Add specialization"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press Enter or comma to add · max 12 tags
                  </p>
                </div>
              </section>

              {/* Save bar */}
              <div className="flex items-center justify-end gap-3 rounded-xl border bg-card px-6 py-4 shadow-sm">
                {saved && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <Check className="h-4 w-4" /> Saved successfully
                  </span>
                )}
                <Button
                  type="submit"
                  disabled={saving}
                  className="min-w-[120px] gap-2 font-semibold"
                  id="save-trainer-profile-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Profile
                    </>
                  )}
                </Button>
              </div>
            </main>
          </div>
        </form>
      </div>
    </div>
  );
}
