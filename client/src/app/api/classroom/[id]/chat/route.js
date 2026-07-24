import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const serverBase = (
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  ""
).replace(/\/+$/, "");

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const token = (await cookies()).get("token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${serverBase}/classroom/${id}/chat/history`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      cache: "no-store",
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch chat history" },
      { status: 500 }
    );
  }
}
