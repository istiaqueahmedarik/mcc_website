import { NextResponse } from "next/server";

const serverBase = (
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  ""
).replace(/\/+$/, "");

export const dynamic = "force-dynamic";

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function GET(request) {
  if (!serverBase) {
    return NextResponse.json({ error: "Server URL is not configured" }, { status: 500 });
  }

  const search = new URL(request.url).search;

  try {
    const response = await fetch(`${serverBase}/auth/discord/callback${search}`, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
    });

    const location = response.headers.get("location");
    if (location && response.status >= 300 && response.status < 400) {
      return NextResponse.redirect(location, response.status);
    }

    const data = await readJsonResponse(response);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Failed to complete Discord callback" }, { status: 500 });
  }
}
