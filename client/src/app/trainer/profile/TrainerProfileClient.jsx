"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api-client";
import {
  AlertCircle,
  Briefcase,
  Camera,
  Check,
  Clock3,
  Github,
  Globe,
  Key,
  Linkedin,
  Loader2,
  LogOut,
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
import ChangePasswordModal from "@/components/ChangePasswordModal";

async function saveTrainerProfile({ formData, tags }) {
  const fullName = formData.get("full_name")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim() || null;

  const basicPayload = { phone };
  if (fullName) {
    basicPayload.full_name = fullName;
  }

  const trainerPayload = {
    trainer_title: formData.get("trainer_title")?.toString().trim() || null,
    trainer_bio: formData.get("trainer_bio")?.toString().trim() || null,
    trainer_experience: formData.get("trainer_experience")?.toString().trim() || null,
    trainer_specializations: tags,
    trainer_linkedin: formData.get("trainer_linkedin")?.toString().trim() || null,
    trainer_github: formData.get("trainer_github")?.toString().trim() || null,
    trainer_website: formData.get("trainer_website")?.toString().trim() || null,
  };

  const basicResult = await apiPost("user/basic/set", basicPayload);
  const trainerResult = await apiPost("user/trainer-profile/set", trainerPayload);

  return { basicResult, trainerResult };
}

async function uploadTrainerProfilePicture(file) {
  const formData = new FormData();
  formData.append("image", file);
  return apiPost("trainer/profile-picture", formData);
}

export default function TrainerProfileClient({ user }) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [previewPic, setPreviewPic] = useState(user.profile_pic || null);
  const fileInputRef = useRef(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || "");
  const [savedFullName, setSavedFullName] = useState(user.full_name || "");
  const [verificationPending, setVerificationPending] = useState(!user.granted);
  const nameChanged = fullName.trim() !== savedFullName.trim();

  const saveProfileMutation = useMutation({
    mutationFn: saveTrainerProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trainer", "profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const profilePictureMutation = useMutation({
    mutationFn: uploadTrainerProfilePicture,
    onSuccess: async (data) => {
      if (data?.profile_pic) {
        setPreviewPic(data.profile_pic);
      }
      await queryClient.invalidateQueries({ queryKey: ["trainer", "profile"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiPost("auth/logout", {}),
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const saving = saveProfileMutation.isPending;
  const picSaving = profilePictureMutation.isPending;
  const isLoggingOut = logoutMutation.isPending;

  const handleLogout = () => {
    setSaveError("");
    logoutMutation.mutate(undefined, {
      onError: (error) => setSaveError(error?.message || "Failed to log out"),
    });
  };

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
    const previewUrl = URL.createObjectURL(file);
    setPreviewPic(previewUrl);
    setSaveError("");
    try {
      await profilePictureMutation.mutateAsync(file);
    } catch (error) {
      setPreviewPic(user.profile_pic || null);
      setSaveError(error?.message || "Failed to upload profile picture");
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaved(false);
    setSaveError("");
    const form = e.target;
    const formData = new FormData(form);
    try {
      await saveProfileMutation.mutateAsync({ formData, tags });
      if (nameChanged) {
        setVerificationPending(true);
      }
      setSavedFullName(fullName.trim());
    } catch (error) {
      setSaveError(error?.message || "Failed to save trainer profile");
    }
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
    <>
    <div className="trainer-page">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-1 pb-1">
          <p className="text-xs font-semibold text-muted-foreground">
            Trainer workspace
          </p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your public trainer identity — picture, bio, experience, and links.
          </p>
        </div>

        <form onSubmit={handleSave}>
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* ── Left sidebar ── */}
            <aside className="flex flex-col gap-5">
              {/* Avatar card */}
              <div className="trainer-panel p-6 text-center">
                <div className="relative mx-auto mb-4 w-fit">
                  <Avatar className="h-28 w-28 rounded-lg border border-border/70">
                    <AvatarImage src={previewPic} className="object-cover" />
                    <AvatarFallback className="rounded-lg bg-foreground text-3xl font-semibold text-background">
                      {initials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="trainer-floating-help absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
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
                  <span className="trainer-chip">
                    <ShieldCheck className="h-3 w-3" />
                    {roleLabel}
                  </span>
                  {verificationPending && (
                    <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400">
                      <Clock3 className="h-3 w-3" />
                      Pending verification
                    </Badge>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-left">
                  <div className="trainer-panel-soft flex items-center gap-2 px-3 py-2 text-sm">
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
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Social links card */}
              <div className="trainer-panel p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  Links
                </h3>
                <div className="space-y-3">
                  <div className="relative">
                    <Linkedin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="trainer-linkedin-input"
                      name="trainer_linkedin"
                      type="url"
                      defaultValue={user.trainer_linkedin || ""}
                      placeholder="linkedin.com/in/yourname"
                      className="pl-9"
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
                      className="pl-9"
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
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="trainer-panel space-y-3 p-5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChangePasswordOpen(true)}
                  className="w-full gap-2"
                  id="trainer-change-password-btn"
                >
                  <Key className="h-4 w-4" />
                  Change Password
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                  id="trainer-logout-btn"
                >
                  {isLoggingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  Logout
                </Button>
              </div>
            </aside>

            {/* ── Right main ── */}
            <main className="flex flex-col gap-5">
              {/* Identity */}
              <section className="trainer-panel p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
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
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      maxLength={160}
                      required
                      aria-describedby="trainer-full-name-verification-note"
                    />
                    <p
                      id="trainer-full-name-verification-note"
                      className="flex gap-1.5 text-xs leading-5 text-amber-600 dark:text-amber-400"
                    >
                      <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {nameChanged
                        ? "Saving this name will send your account to admin verification again."
                        : "Changing your full name will send your account to admin verification again."}
                    </p>
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
              <section className="trainer-panel p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
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
                    className="min-h-[120px] resize-y text-base leading-relaxed md:text-sm"
                  />
                </div>
              </section>

              {/* Experience */}
              <section className="trainer-panel p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
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
                    className="min-h-[180px] resize-y font-mono text-base leading-relaxed md:text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Plain text or bullet points — this appears on your public trainer card.
                  </p>
                </div>
              </section>

              {/* Specializations */}
              <section className="trainer-panel p-6">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
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
              <div className="trainer-command-bar sticky bottom-4 z-20 flex items-center justify-end gap-3 px-6 py-4">
                {saveError && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                    <AlertCircle className="h-4 w-4" /> {saveError}
                  </span>
                )}
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
                      {nameChanged ? "Save and request verification" : "Save Profile"}
                    </>
                  )}
                </Button>
              </div>
            </main>
          </div>
        </form>
      </div>
    </div>

    <ChangePasswordModal
      isOpen={changePasswordOpen}
      onClose={() => setChangePasswordOpen(false)}
    />
    </>
  );
}
