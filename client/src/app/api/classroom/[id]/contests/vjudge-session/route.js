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

function extractVjudgeSession(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/(?:^|;\s*)JSESSIONID=([^;\s]+)/i);
  return (match?.[1] || text.replace(/^JSESSIONID=/i, "").trim()).slice(0, 1000);
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

  return NextResponse.json({
    success: true,
    connected: Boolean(session?.value),
  });
}

export async function POST(request) {
  if (!(await requireAuthCookie())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const jsessionid = extractVjudgeSession(body?.session || body?.jsessionid || body?.vjSession);

  if (!jsessionid) {
    return NextResponse.json({ error: "VJudge JSESSIONID is required" }, { status: 400 });
  }

  const response = NextResponse.json({
    success: true,
    connected: true,
  });
  response.cookies.set("vj_session", jsessionid, cookieOptions);
  response.cookies.set("vj_session_username", "", { ...cookieOptions, maxAge: 0 });
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
  });
  response.cookies.set("vj_session", "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set("vj_session_username", "", { ...cookieOptions, maxAge: 0 });
  response.cookies.set("vj_session_password", "", { ...cookieOptions, maxAge: 0 });
  return response;
}
