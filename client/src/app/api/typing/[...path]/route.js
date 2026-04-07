const upstreamBase = (process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL || "http://localhost:5000").replace(/\/+$/, "");

function buildUpstreamUrl(request, params) {
  const segments = Array.isArray(params?.path) ? params.path : [];
  const upstreamPath = segments.join("/");
  const incomingUrl = new URL(request.url);
  const search = incomingUrl.search || "";
  return `${upstreamBase}/typing/${upstreamPath}${search}`;
}

async function proxyToTypingApi(request, context) {
  const targetUrl = buildUpstreamUrl(request, context?.params);

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const authorization = request.headers.get("authorization");

  if (contentType) headers.set("content-type", contentType);
  if (authorization) headers.set("authorization", authorization);

  const method = request.method;
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.text() : undefined;

  const upstreamResponse = await fetch(targetUrl, {
    method,
    headers,
    body,
    cache: "no-store",
  });

  const responseBody = await upstreamResponse.text();
  const responseHeaders = new Headers();
  const upstreamResponseType = upstreamResponse.headers.get("content-type");

  if (upstreamResponseType) {
    responseHeaders.set("content-type", upstreamResponseType);
  }

  return new Response(responseBody, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export async function GET(request, context) {
  return proxyToTypingApi(request, context);
}

export async function POST(request, context) {
  return proxyToTypingApi(request, context);
}

export async function PUT(request, context) {
  return proxyToTypingApi(request, context);
}

export async function PATCH(request, context) {
  return proxyToTypingApi(request, context);
}

export async function DELETE(request, context) {
  return proxyToTypingApi(request, context);
}
