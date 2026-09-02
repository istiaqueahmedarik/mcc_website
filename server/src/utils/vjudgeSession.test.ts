import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { getVjudgeSession, normalizeVjudgeSession } from './vjudgeSession';

function createApp() {
  const app = new Hono();
  app.get('/', (c) => c.json({ session: getVjudgeSession(c) ?? null }));
  return app;
}

describe('getVjudgeSession', () => {
  test('uses the forwarded session header', async () => {
    const response = await createApp().request('/', {
      headers: { 'X-VJudge-Session': 'header-session' },
    });

    expect(await response.json()).toEqual({ session: 'header-session' });
  });

  test('falls back to the browser cookie for direct Hono routing', async () => {
    const response = await createApp().request('/', {
      headers: { Cookie: 'vj_session=cookie-session' },
    });

    expect(await response.json()).toEqual({ session: 'cookie-session' });
  });

  test('prefers the explicitly forwarded header over the cookie', async () => {
    const response = await createApp().request('/', {
      headers: {
        Cookie: 'vj_session=cookie-session',
        'X-VJudge-Session': 'header-session',
      },
    });

    expect(await response.json()).toEqual({ session: 'header-session' });
  });
});

describe('normalizeVjudgeSession', () => {
  test('extracts JSESSIONID from a pasted cookie string', () => {
    expect(normalizeVjudgeSession('foo=bar; JSESSIONID=session-token; baz=1')).toBe('session-token');
  });

  test('accepts a raw session token', () => {
    expect(normalizeVjudgeSession('session-token')).toBe('session-token');
  });
});
