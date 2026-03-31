import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BUCKET = "icpc_journey_images";

function sanitizeFileName(name = "") {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Supabase env is not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const uploaded = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
      const fullPath = `icpc/${fileName}`;
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fullPath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (error) {
        return NextResponse.json({ error: error.message || "Upload failed" }, { status: 400 });
      }

      uploaded.push(`${supabaseUrl}/storage/v1/object/public/${BUCKET}/${fullPath}`);
    }

    return NextResponse.json({ urls: uploaded });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to upload images" },
      { status: 500 }
    );
  }
}
