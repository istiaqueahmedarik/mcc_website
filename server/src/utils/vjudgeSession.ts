import { getCookie } from 'hono/cookie';

function normalizeSession(value: unknown): string | undefined {
  const session = String(value ?? '').trim();
  return session || undefined;
}

export function getVjudgeSession(c: any): string | undefined {
  return normalizeSession(c.req.header('X-VJudge-Session'))
    ?? normalizeSession(getCookie(c, 'vj_session'));
}
