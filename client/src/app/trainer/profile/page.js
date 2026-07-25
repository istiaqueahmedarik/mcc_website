import { get_with_token, post_with_token } from "@/lib/action";
import { createClient } from "@/utils/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import TrainerProfileClient from "./TrainerProfileClient";

export const metadata = {
  title: "Trainer Profile | MCC",
  description: "Manage your trainer profile — bio, experience, specializations, and social links.",
};

export default async function TrainerProfilePage() {
  noStore();

  const cookieStore = await cookies();
  if (!cookieStore.get("token")) redirect("/login");

  const res = await get_with_token(`auth/user/profile?t=${Date.now()}`);
  if (!res || res.error || !Array.isArray(res.result) || res.result.length === 0) {
    redirect("/login");
  }
  const user = res.result[0];

  // Only trainers and admins may access this page
  if (!user.trainer && !user.admin) redirect("/profile");

  return (
    <TrainerProfileClient
      user={user}
      saveTrainerProfileAction={saveTrainerProfile}
      saveProfilePicAction={saveProfilePic}
      saveBasicProfileAction={saveBasicProfile}
    />
  );
}

// ── Server actions ──────────────────────────────────────────────────────────

async function saveTrainerProfile(formData) {
  "use server";

  const trainer_title = formData.get("trainer_title")?.toString().trim() || null;
  const trainer_bio = formData.get("trainer_bio")?.toString().trim() || null;
  const trainer_experience = formData.get("trainer_experience")?.toString().trim() || null;
  const trainer_linkedin = formData.get("trainer_linkedin")?.toString().trim() || null;
  const trainer_github = formData.get("trainer_github")?.toString().trim() || null;
  const trainer_website = formData.get("trainer_website")?.toString().trim() || null;

  // Tags are sent as JSON string from the client
  let trainer_specializations = [];
  try {
    const raw = formData.get("trainer_specializations")?.toString();
    if (raw) trainer_specializations = JSON.parse(raw);
  } catch {
    trainer_specializations = [];
  }

  // Also update basic profile (full_name, phone)
  const full_name = formData.get("full_name")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim() || null;
  if (full_name) {
    await post_with_token("user/basic/set", { full_name, phone });
  } else if (phone !== undefined) {
    await post_with_token("user/basic/set", { phone });
  }

  await post_with_token("user/trainer-profile/set", {
    trainer_title,
    trainer_bio,
    trainer_experience,
    trainer_specializations,
    trainer_linkedin,
    trainer_github,
    trainer_website,
  });

  redirect("/trainer/profile");
}

async function saveBasicProfile(formData) {
  "use server";
  const full_name = formData.get("full_name")?.toString().trim();
  const phone = formData.get("phone")?.toString().trim() || null;
  if (full_name) await post_with_token("user/basic/set", { full_name, phone });
  redirect("/trainer/profile");
}

async function saveProfilePic(formData) {
  "use server";
  const file = formData.get("image");
  if (!file || typeof file === "string") return;

  const prof = await get_with_token("auth/user/profile");
  const me = prof?.result?.[0];
  const userId = me?.id || "me";

  const supabase = await createClient();
  const fileName = `${Date.now()}-${file.name}`;
  const path = `profile_pics/${userId}/${fileName}`;

  const { data, error } = await supabase.storage.from("all_picture").upload(path, file);
  if (!error) {
    const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/${data.fullPath}`;
    await post_with_token("user/profile-pic/set", { profile_pic: url });
  } else {
    console.error("Trainer profile pic upload error:", error);
  }
}
