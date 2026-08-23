import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const serverBase = (
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  ""
).replace(/\/+$/, "");

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};

export const dynamic = "force-dynamic";

function extractVjudgeSession(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/JSESSIONID=([^;\s]+)/i);
  return match ? match[1] : text.replace(/^JSESSIONID=/i, "").trim();
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function requireAuthCookie() {
  const token = (await cookies()).get("token");
  return Boolean(token?.value);
}

export async function GET() {
  if (!(await requireAuthCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = await cookies();
  const session = store.get("vj_session");
  const username = store.get("vj_session_username");

  return NextResponse.json({
    success: true,
    connected: Boolean(session?.value),
    username: username?.value || "",
  });
}

export async function POST(request) {
  if (!(await requireAuthCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!serverBase) {
    return NextResponse.json({ error: "Server URL is not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  let jsessionid = extractVjudgeSession(body?.session || body?.jsessionid || body?.vjSession);
  const username = String(body?.username || "").trim();

  if (!jsessionid) {
    const password = String(body?.password || "");
    if (!username || !password) {
      return NextResponse.json({ error: "Username/password or a VJudge session token is required" }, { status: 400 });
    }

    try {
      const response = await fetch(`${serverBase}/vjudge/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        cache: "no-store",
      });
      const data = await readJsonResponse(response);
      if (!response.ok || data?.error || !data?.jsessionid) {
        return NextResponse.json(
          { error: data?.error || "Failed to connect VJudge session" },
          { status: response.status || 400 },
        );
      }
      jsessionid = data.jsessionid;
    } catch {
      return NextResponse.json({ error: "Failed to reach VJudge login service" }, { status: 500 });
    }
  }

  const response = NextResponse.json({
    success: true,
    connected: true,
    username,
  });
  response.cookies.set("vj_session", jsessionid, cookieOptions);
  response.cookies.set("vj_session_username", username, cookieOptions);
  response.cookies.set("vj_session_password", "", { ...cookieOptions, maxAge: 0 });
  return response;
}

export async function DELETE() {
  if (!(await requireAuthCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({
    success: true,
    connected: false,
    username: "",
  });
  response.cookies.set("vj_session", "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set("vj_session_username", "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set("vj_session_password", "", { ...cookieOptions, maxAge: 0 });
  return response;
}
