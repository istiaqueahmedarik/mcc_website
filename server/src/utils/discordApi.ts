import {
  DISCORD_API_BASE,
  DISCORD_OAUTH_BASE,
  DISCORD_REQUIRED_BOT_PERMISSIONS,
  assertDiscordBotConfigured,
  assertDiscordOAuthConfigured,
  getDiscordBotToken,
  getDiscordClientId,
  getDiscordClientSecret,
  getDiscordConnectScopes,
  getDiscordRedirectUri,
} from './discordConfig';

export type DiscordTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

export type DiscordUserResponse = {
  id: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
};

export type DiscordGuildResponse = {
  id: string;
  name: string;
  owner?: boolean;
  permissions?: string;
  features?: string[];
};

function safeDiscordError(data: any, status: number) {
  return String(data?.message || data?.error_description || data?.error || `Discord request failed with status ${status}`)
    .trim()
    .slice(0, 240);
}

async function readDiscordJson(response: Response) {
  return response.json().catch(() => ({}));
}

export function buildDiscordAuthorizeUrl(input: {
  state: string;
  scopes: string[];
  redirectUri?: string;
}) {
  assertDiscordOAuthConfigured();
  const params = new URLSearchParams({
    client_id: getDiscordClientId(),
    redirect_uri: input.redirectUri || getDiscordRedirectUri(),
    response_type: 'code',
    scope: input.scopes.join(' '),
    state: input.state,
    prompt: 'consent',
  });
  return `${DISCORD_OAUTH_BASE}?${params.toString()}`;
}

export function buildDiscordConnectScopesForUser(user: any) {
  return getDiscordConnectScopes(Boolean(user?.trainer || user?.admin));
}

export async function exchangeDiscordCode(code: string, redirectUri: string): Promise<DiscordTokenResponse> {
  assertDiscordOAuthConfigured();
  const body = new URLSearchParams({
    client_id: getDiscordClientId(),
    client_secret: getDiscordClientSecret(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(8000),
  });
  const data: any = await readDiscordJson(response);
  if (!response.ok) throw new Error(safeDiscordError(data, response.status));
  return data;
}

export async function refreshDiscordToken(refreshToken: string): Promise<DiscordTokenResponse> {
  assertDiscordOAuthConfigured();
  const body = new URLSearchParams({
    client_id: getDiscordClientId(),
    client_secret: getDiscordClientSecret(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(8000),
  });
  const data: any = await readDiscordJson(response);
  if (!response.ok) throw new Error(safeDiscordError(data, response.status));
  return data;
}

export async function fetchDiscordCurrentUser(accessToken: string): Promise<DiscordUserResponse> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  });
  const data: any = await readDiscordJson(response);
  if (!response.ok) throw new Error(safeDiscordError(data, response.status));
  return data;
}

export async function fetchDiscordCurrentUserGuilds(accessToken: string): Promise<DiscordGuildResponse[]> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(8000),
  });
  const data: any = await readDiscordJson(response);
  if (!response.ok) throw new Error(safeDiscordError(data, response.status));
  return Array.isArray(data) ? data : [];
}

export async function addDiscordGuildMember(input: {
  guildId: string;
  discordUserId: string;
  accessToken: string;
}) {
  assertDiscordBotConfigured();
  const response = await fetch(`${DISCORD_API_BASE}/guilds/${input.guildId}/members/${input.discordUserId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${getDiscordBotToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: input.accessToken }),
    signal: AbortSignal.timeout(10000),
  });
  const data: any = await readDiscordJson(response);
  if (!response.ok && response.status !== 204) {
    const retryAfter = Number(response.headers.get('retry-after') || data?.retry_after || 0);
    const error = new Error(safeDiscordError(data, response.status)) as Error & {
      status?: number;
      retryAfterMs?: number;
    };
    error.status = response.status;
    if (Number.isFinite(retryAfter) && retryAfter > 0) error.retryAfterMs = retryAfter * 1000;
    throw error;
  }
  return { status: response.status, member: data || null };
}

export function hasDiscordManageGuildPermission(guild: DiscordGuildResponse) {
  if (guild.owner) return true;
  const permissions = BigInt(guild.permissions || '0');
  return (permissions & BigInt(0x20)) === BigInt(0x20);
}

export function requestedDiscordBotPermissions() {
  return DISCORD_REQUIRED_BOT_PERMISSIONS;
}
