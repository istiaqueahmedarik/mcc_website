import { getJsonFromBackend, postJsonToBackend } from "../../_utils/backendProxy";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function safeFileName(name) {
  return String(name || "profile-picture").replace(/[^\w.-]+/g, "-");
}

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("image");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  const profile = await getJsonFromBackend("auth/user/profile");
  if (profile.data?.error) {
    return NextResponse.json(profile.data, { status: profile.status });
  }

  const me = profile.data?.result?.[0];
  const userId = me?.id || "me";
  const supabase = await createClient();
  const fileName = `${Date.now()}-${safeFileName(file.name)}`;
  const path = `profile_pics/${userId}/${fileName}`;

  const { data, error } = await supabase.storage.from("all_picture").upload(path, file);
  if (error) {
    return NextResponse.json({ error: "Failed to upload profile picture" }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return NextResponse.json({ error: "Supabase URL is not configured" }, { status: 500 });
  }

  const profilePic = `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${data.fullPath}`;
  const saved = await postJsonToBackend("user/profile-pic/set", { profile_pic: profilePic });

  if (saved.data?.error) {
    return NextResponse.json(saved.data, { status: saved.status });
  }

  return NextResponse.json({
    success: true,
    result: saved.data?.result,
    profile_pic: saved.data?.result?.profile_pic || profilePic,
  });
}
