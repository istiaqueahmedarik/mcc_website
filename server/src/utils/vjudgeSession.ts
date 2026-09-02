import { getCookie } from 'hono/cookie';

export function normalizeVjudgeSession(value: unknown): string | undefined {
  const text = String(value ?? '').trim();
  if (!text) return undefined;
  const match = text.match(/(?:^|;\s*)JSESSIONID=([^;\s]+)/i);
  return (match?.[1] || text.replace(/^JSESSIONID=/i, '').trim()).slice(0, 1000) || undefined;
}

export function getVjudgeSession(c: any): string | undefined {
  return normalizeVjudgeSession(c.req.header('X-VJudge-Session'))
    ?? normalizeVjudgeSession(getCookie(c, 'vj_session'));
}
