import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  (await cookies()).delete("token");
  return NextResponse.json({ success: true });
}
