import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const serverBase = (
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  ""
).replace(/\/+$/, "");

function buildBackendUrl(request, path) {
  const targetPath = path.replace(/^\/+/, "");
  const search = new URL(request.url).search;
  return `${serverBase}/${targetPath}${search}`;
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

export async function forwardJsonToBackend(request, path, method = request.method) {
  if (!serverBase) {
    return NextResponse.json({ error: "Server URL is not configured" }, { status: 500 });
  }

  const token = (await cookies()).get("token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const headers = {
    "Content-Type": request.headers.get("content-type") || "application/json",
    Authorization: `Bearer ${token.value}`,
  };
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.text() : undefined;

  try {
    const response = await fetch(buildBackendUrl(request, path), {
      method,
      headers,
      body: body || undefined,
      cache: "no-store",
    });
    const data = await readJsonResponse(response);
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Failed to reach server" }, { status: 500 });
  }
}

export async function postJsonToBackend(path, body) {
  if (!serverBase) {
    return {
      status: 500,
      data: { error: "Server URL is not configured" },
    };
  }

  const token = (await cookies()).get("token");
  if (!token) {
    return {
      status: 401,
      data: { error: "Unauthorized" },
    };
  }

  try {
    const response = await fetch(`${serverBase}/${path.replace(/^\/+/, "")}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return {
      status: response.status,
      data: await readJsonResponse(response),
    };
  } catch {
    return {
      status: 500,
      data: { error: "Failed to reach server" },
    };
  }
}

export async function getJsonFromBackend(path) {
  if (!serverBase) {
    return {
      status: 500,
      data: { error: "Server URL is not configured" },
    };
  }

  const token = (await cookies()).get("token");
  if (!token) {
    return {
      status: 401,
      data: { error: "Unauthorized" },
    };
  }

  try {
    const response = await fetch(`${serverBase}/${path.replace(/^\/+/, "")}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      cache: "no-store",
    });
    return {
      status: response.status,
      data: await readJsonResponse(response),
    };
  } catch {
    return {
      status: 500,
      data: { error: "Failed to reach server" },
    };
  }
}
