import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const serverBase = (
  process.env.SERVER_URL ||
  process.env.NEXT_PUBLIC_SERVER_URL ||
  ""
).replace(/\/+$/, "");

export const dynamic = "force-dynamic";

async function forward(request, params, method) {
  const { path } = await params;
  const token = (await cookies()).get("token");
  const targetPath = Array.isArray(path) ? path.join("/") : "";
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token.value}`;
  }

  const body = method === "GET" ? undefined : await request.text();

  try {
    const res = await fetch(`${serverBase}/trainer-forms/${targetPath}`, {
      method,
      headers,
      body: body || undefined,
      cache: "no-store",
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reach trainer forms service" },
      { status: 500 },
    );
  }
}

export async function GET(request, { params }) {
  return forward(request, params, "GET");
}

export async function POST(request, { params }) {
  return forward(request, params, "POST");
}
