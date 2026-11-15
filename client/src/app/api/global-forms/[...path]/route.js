import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const serverBase = (
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  ""
).replace(/\/+$/, "");

export const dynamic = "force-dynamic";

function backendUrl(request, path) {
  const encoded = Array.isArray(path)
    ? path.map((segment) => encodeURIComponent(segment)).join("/")
    : "";
  return `${serverBase}/global-forms/${encoded}${new URL(request.url).search}`;
}

async function forward(request, context, method) {
  if (!serverBase) {
    return NextResponse.json({ error: "Server URL is not configured" }, { status: 500 });
  }

  const { path } = await context.params;
  const token = (await cookies()).get("token")?.value;
  const headers = new Headers();
  headers.set("Accept", request.headers.get("accept") || "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!["GET", "HEAD"].includes(method)) {
    headers.set("Content-Type", request.headers.get("content-type") || "application/json");
  }

  try {
    const response = await fetch(backendUrl(request, path), {
      method,
      headers,
      body: ["GET", "HEAD"].includes(method) ? undefined : (await request.text()) || undefined,
      cache: "no-store",
      signal: request.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const text = await response.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error?.name === "AbortError") return new Response(null, { status: 499 });
    return NextResponse.json({ error: "Failed to reach global forms service" }, { status: 502 });
  }
}

export function GET(request, context) {
  return forward(request, context, "GET");
}

export function POST(request, context) {
  return forward(request, context, "POST");
}

export function PUT(request, context) {
  return forward(request, context, "PUT");
}
