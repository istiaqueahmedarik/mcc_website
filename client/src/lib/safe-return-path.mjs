const ALLOWED_RETURN_PATH = /^\/register\/[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function getSafeReturnPath(value, fallback = "/") {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  return ALLOWED_RETURN_PATH.test(path) ? path : fallback;
}
