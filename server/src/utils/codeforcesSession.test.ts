import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { getCodeforcesSession, normalizeCodeforcesSession } from './codeforcesSession';

function createApp() {
  const app = new Hono();
  app.get('/', (c) => c.json({ session: getCodeforcesSession(c) ?? null }));
  return app;
}

describe('Codeforces session transport', () => {
  test('extracts JSESSIONID from a pasted cookie', () => {
    expect(normalizeCodeforcesSession('foo=bar; JSESSIONID=session-token; baz=1')).toBe('session-token');
  });

  test('uses the forwarded session header', async () => {
    const response = await createApp().request('/', {
      headers: { 'X-Codeforces-Session': 'header-session' },
    });
    expect(await response.json()).toEqual({ session: 'header-session' });
  });

  test('falls back to the browser cookie for direct Hono routing', async () => {
    const response = await createApp().request('/', {
      headers: { Cookie: 'cf_session=cookie-session' },
    });
    expect(await response.json()).toEqual({ session: 'cookie-session' });
  });

  test('prefers the forwarded header over the cookie', async () => {
    const response = await createApp().request('/', {
      headers: {
        Cookie: 'cf_session=cookie-session',
        'X-Codeforces-Session': 'header-session',
      },
    });
    expect(await response.json()).toEqual({ session: 'header-session' });
  });
});
