import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const serverBase = (
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  ""
).replace(/\/+$/, "");

export const dynamic = "force-dynamic";

function buildBackendPath(id, params) {
  const path = Array.isArray(params?.path)
    ? params.path.map((segment) => encodeURIComponent(segment)).join("/")
    : "";
  return `classroom/${encodeURIComponent(id)}/contests/${path}`;
}

function shouldForwardVjudgeSession(params, method) {
  if (method !== "POST" || !Array.isArray(params?.path)) return false;
  const path = params.path;
  return path.includes("items") && path[path.length - 1] === "fetch";
}

function shouldForwardCodeforcesSession(params, method) {
  return shouldForwardVjudgeSession(params, method);
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

async function forward(request, context, method) {
  if (!serverBase) {
    return NextResponse.json({ error: "Server URL is not configured" }, { status: 500 });
  }

  const params = await context.params;
  const token = (await cookies()).get("token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headers = {
    "Content-Type": request.headers.get("content-type") || "application/json",
    Authorization: `Bearer ${token.value}`,
  };

  if (shouldForwardVjudgeSession(params, method)) {
    const session = (await cookies()).get("vj_session");
    if (session?.value) {
      headers["X-VJudge-Session"] = session.value;
    }
  }

  if (shouldForwardCodeforcesSession(params, method)) {
    const session = (await cookies()).get("cf_session");
    if (session?.value) {
      headers["X-Codeforces-Session"] = session.value;
    }
  }

  const body = ["GET", "HEAD"].includes(method) ? undefined : await request.text();
  const targetUrl = `${serverBase}/${buildBackendPath(params.id, params)}${new URL(request.url).search}`;

  try {
    const response = await fetch(targetUrl, {
      method,
      headers,
      body: body || undefined,
      cache: "no-store",
    });
    const data = await readJsonResponse(response);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach classroom contest service" }, { status: 500 });
  }
}

export async function GET(request, context) {
  return forward(request, context, "GET");
}

export async function POST(request, context) {
  return forward(request, context, "POST");
}

export async function PUT(request, context) {
  return forward(request, context, "PUT");
}

export async function PATCH(request, context) {
  return forward(request, context, "PATCH");
}

export async function DELETE(request, context) {
  return forward(request, context, "DELETE");
}
