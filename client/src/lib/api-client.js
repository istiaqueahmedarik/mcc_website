"use client";

export class ApiClientError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

async function parseApiResponse(response) {
  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok || data?.error) {
    throw new ApiClientError(
      data?.error || response.statusText || "Request failed",
      response.status,
      data,
    );
  }

  return data;
}

export async function apiRequest(path, options = {}) {
  const { method = "GET", body, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  const isFormData = body instanceof FormData;

  if (body !== undefined && !isFormData && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api/${path.replace(/^\/+/, "")}`, {
    method,
    headers: requestHeaders,
    body: body === undefined || isFormData ? body : JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
    ...rest,
  });

  return parseApiResponse(response);
}

export function apiGet(path, options = {}) {
  return apiRequest(path, { ...options, method: "GET" });
}

export function apiPost(path, body, options = {}) {
  return apiRequest(path, { ...options, method: "POST", body });
}

export function apiPut(path, body, options = {}) {
  return apiRequest(path, { ...options, method: "PUT", body });
}

export function apiDelete(path, options = {}) {
  return apiRequest(path, { ...options, method: "DELETE" });
}
