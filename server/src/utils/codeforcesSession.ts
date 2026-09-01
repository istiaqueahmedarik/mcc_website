import { getCookie } from 'hono/cookie';

function normalizeSession(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  const match = text.match(/(?:^|;\s*)JSESSIONID=([^;\s]+)/i);
  return (match?.[1] || text.replace(/^JSESSIONID=/i, '').trim()) || undefined;
}

export function getCodeforcesSession(c: any): string | undefined {
  return normalizeSession(c.req.header('X-Codeforces-Session'))
    ?? normalizeSession(getCookie(c, 'cf_session'));
}

export { normalizeSession as normalizeCodeforcesSession };
