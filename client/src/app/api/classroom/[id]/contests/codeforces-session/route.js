import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const codeforcesUserAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";

function extractSession(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/(?:^|;\s*)JSESSIONID=([^;\s]+)/i);
  const session = (match?.[1] || text.replace(/^JSESSIONID=/i, "").trim()).slice(0, 1000);
  return /^[A-Za-z0-9._-]+$/.test(session) ? session : "";
}

async function requireAuthCookie() {
  const token = (await cookies()).get("token");
  return Boolean(token?.value);
}

async function validateCodeforcesSession(session) {
  return new Promise((resolve) => {
    const child = spawn("curl", [
      "--silent",
      "--show-error",
      "--location",
      "--max-time",
      "30",
      "--write-out",
      "\n%{http_code}",
      "--config",
      "-",
      "https://codeforces.com/edu/courses",
    ], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "";
    let outputBytes = 0;
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    child.stdout.on("data", (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes > 1024 * 1024 + 32) {
        child.kill();
        finish(false);
        return;
      }
      output += chunk.toString("utf8");
    });
    child.stderr.resume();
    child.on("error", () => finish(false));
    child.on("close", (exitCode) => {
      if (exitCode !== 0) return finish(false);
      const separator = output.lastIndexOf("\n");
      const status = Number(output.slice(separator + 1));
      const html = separator >= 0 ? output.slice(0, separator) : "";
      finish(status >= 200 && status < 300
        && /href=["']\/profile\//i.test(html)
        && !/href=["']\/enter(?:[?"'])/i.test(html));
    });
    child.stdin.end([
      "header = \"Accept: text/html,application/xhtml+xml\"",
      "header = \"Accept-Language: en-US,en;q=0.9\"",
      `header = \"Cookie: JSESSIONID=${session}\"`,
      `user-agent = \"${codeforcesUserAgent}\"`,
      "",
    ].join("\n"));
  });
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
      { error: "Codeforces could not verify this JSESSIONID. Confirm you are signed in, wait briefly if Codeforces is blocking requests, then try again." },
      { status: 503 },
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
