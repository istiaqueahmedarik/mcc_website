import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const serverBase = (
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  ""
).replace(/\/+$/, "");

export const dynamic = "force-dynamic";

export async function POST() {
  const token = (await cookies()).get("token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${serverBase}/classroom/notifications/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to mark notifications read" },
      { status: 500 }
    );
  }
}
