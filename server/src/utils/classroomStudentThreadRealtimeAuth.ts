import { Buffer } from 'buffer';

const TOKEN_REUSE_WINDOW_MS = 2 * 60 * 1000;
const TOKEN_REQUEST_TIMEOUT_MS = 5000;
const SHADOW_PROVIDER = 'mcc_realtime';

type CachedRealtimeToken = {
  accessToken: string;
  expiresAtMs: number;
};

export type StudentThreadRealtimeAccess = {
  access_token: string;
  token_expires_at: string;
};

const tokenCache = new Map<string, CachedRealtimeToken>();
const tokenRequests = new Map<string, Promise<StudentThreadRealtimeAccess>>();

function getSupabaseAuthConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  if (!url || !serviceKey || !publishableKey) {
    throw new Error('Supabase Realtime authentication is not configured on the server.');
  }

  return { url, serviceKey, publishableKey };
}

function shadowEmail(userId: string) {
  return `mcc-realtime-${userId}@mcc.invalid`;
}

function safeRemoteError(data: any, status: number) {
  const message = String(data?.msg || data?.message || data?.error_description || data?.error || '').trim();
  return message.slice(0, 240) || `Supabase Auth request failed with status ${status}`;
}

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

function adminHeaders(serviceKey: string) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
}

async function fetchShadowUser(userId: string, config: ReturnType<typeof getSupabaseAuthConfig>) {
  const response = await fetch(`${config.url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    headers: adminHeaders(config.serviceKey),
    signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
  });
  const data = await readJson(response);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(safeRemoteError(data, response.status));
  return data;
}

function assertOwnedShadowUser(user: any, userId: string) {
  const ownedMarker = user?.app_metadata?.mcc_realtime_identity === true;
  const legacyOwnedMarker = user?.app_metadata?.mcc_user_id === userId
    && user?.email === shadowEmail(userId);
  if (!user || user.id !== userId || (!ownedMarker && !legacyOwnedMarker)) {
    throw new Error('Supabase Realtime identity conflicts with an existing Auth user.');
  }
  if (user.role !== 'anon') {
    throw new Error('Supabase Realtime identity has an unsafe database role.');
  }
}

async function ensureShadowUser(userId: string, config: ReturnType<typeof getSupabaseAuthConfig>) {
  const existing = await fetchShadowUser(userId, config);
  if (existing) {
    assertOwnedShadowUser(existing, userId);
    return existing;
  }

  const response = await fetch(`${config.url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(config.serviceKey),
    signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      id: userId,
      email: shadowEmail(userId),
      password: `${crypto.randomUUID()}${crypto.randomUUID()}`,
      email_confirm: true,
      role: 'anon',
      app_metadata: {
        mcc_realtime_identity: true,
        identity_type: SHADOW_PROVIDER,
        mcc_user_id: userId,
      },
    }),
  });
  const data = await readJson(response);

  if (!response.ok) {
    // A concurrent request may have created the same deterministic user.
    const racedUser = await fetchShadowUser(userId, config);
    if (racedUser) {
      assertOwnedShadowUser(racedUser, userId);
      return racedUser;
    }
    throw new Error(safeRemoteError(data, response.status));
  }

  assertOwnedShadowUser(data, userId);
  return data;
}

function decodeTokenClaims(token: string) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function mintRealtimeAccess(userId: string): Promise<StudentThreadRealtimeAccess> {
  const config = getSupabaseAuthConfig();
  const user = await ensureShadowUser(userId, config);

  const linkResponse = await fetch(`${config.url}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: adminHeaders(config.serviceKey),
    signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    body: JSON.stringify({ type: 'magiclink', email: user.email }),
  });
  const linkData = await readJson(linkResponse);
  if (!linkResponse.ok || !linkData?.hashed_token) {
    throw new Error(safeRemoteError(linkData, linkResponse.status));
  }

  const verifyResponse = await fetch(`${config.url}/auth/v1/verify`, {
    method: 'POST',
    headers: {
      apikey: config.publishableKey,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
    body: JSON.stringify({ type: 'magiclink', token_hash: linkData.hashed_token }),
  });
  const verifyData = await readJson(verifyResponse);
  const accessToken = String(verifyData?.access_token || '');
  const claims = decodeTokenClaims(accessToken);

  if (
    !verifyResponse.ok ||
    !accessToken ||
    claims?.sub !== userId ||
    claims?.role !== 'anon' ||
    !Number.isFinite(Number(claims?.exp))
  ) {
    throw new Error(
      verifyResponse.ok
        ? 'Supabase Realtime issued an invalid access token.'
        : safeRemoteError(verifyData, verifyResponse.status)
    );
  }

  const expiresAtMs = Number(claims.exp) * 1000;
  tokenCache.set(userId, { accessToken, expiresAtMs });

  return {
    access_token: accessToken,
    token_expires_at: new Date(expiresAtMs).toISOString(),
  };
}

export async function issueStudentThreadRealtimeAccessToken(
  userId: string
): Promise<StudentThreadRealtimeAccess> {
  const now = Date.now();
  const cached = tokenCache.get(userId);
  if (cached && cached.expiresAtMs - now > TOKEN_REUSE_WINDOW_MS) {
    return {
      access_token: cached.accessToken,
      token_expires_at: new Date(cached.expiresAtMs).toISOString(),
    };
  }

  tokenCache.delete(userId);
  const inFlight = tokenRequests.get(userId);
  if (inFlight) return inFlight;

  const request = mintRealtimeAccess(userId).finally(() => {
    tokenRequests.delete(userId);
    if (tokenCache.size > 5000) {
      const currentTime = Date.now();
      for (const [cachedUserId, token] of tokenCache) {
        if (token.expiresAtMs <= currentTime) tokenCache.delete(cachedUserId);
      }
    }
  });
  tokenRequests.set(userId, request);
  return request;
}
