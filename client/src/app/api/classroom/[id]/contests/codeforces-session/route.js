import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};

export const dynamic = "force-dynamic";

function extractSession(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/(?:^|;\s*)JSESSIONID=([^;\s]+)/i);
  return (match?.[1] || text.replace(/^JSESSIONID=/i, "").trim()).slice(0, 1000);
}

async function requireAuthCookie() {
  const token = (await cookies()).get("token");
  return Boolean(token?.value);
}

async function validateCodeforcesSession(session) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch("https://codeforces.com/edu/courses?locale=en&mobile=true", {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        Cookie: `JSESSIONID=${session}`,
        "User-Agent": "MCC Classroom EDU Session Validator",
      },
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const html = (await response.text()).slice(0, 1024 * 1024);
    return /href=["']\/profile\//i.test(html) && !/href=["']\/enter(?:[?"'])/i.test(html);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  if (!(await requireAuthCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = (await cookies()).get("cf_session");
  return NextResponse.json({ success: true, connected: Boolean(session?.value) });
}

export async function POST(request) {
  if (!(await requireAuthCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const session = extractSession(body?.session || body?.jsessionid);
  if (!session) {
    return NextResponse.json({ error: "Codeforces JSESSIONID is required" }, { status: 400 });
  }
  if (!(await validateCodeforcesSession(session))) {
    return NextResponse.json(
      { error: "Codeforces rejected this JSESSIONID. Sign in again and copy the current cookie." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ success: true, connected: true });
  response.cookies.set("cf_session", session, cookieOptions);
  return response;
}

export async function DELETE() {
  if (!(await requireAuthCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const response = NextResponse.json({ success: true, connected: false });
  response.cookies.set("cf_session", "", { ...cookieOptions, maxAge: 0 });
  return response;
}
