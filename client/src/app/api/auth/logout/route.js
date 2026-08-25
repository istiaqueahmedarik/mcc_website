import { clearAuthCookies } from "@/lib/auth-cookies";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearAuthCookies();
  return NextResponse.json({ success: true });
}
