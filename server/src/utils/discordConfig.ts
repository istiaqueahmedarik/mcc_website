export const DISCORD_API_BASE = 'https://discord.com/api/v10';
export const DISCORD_OAUTH_BASE = 'https://discord.com/oauth2/authorize';
export const DISCORD_REQUIRED_BOT_PERMISSIONS = '2416036881';
export const DISCORD_STUDENT_CATEGORY_CHANNEL_LIMIT = 45;
export const DISCORD_DEFAULT_TIMEZONE = 'Asia/Dhaka';

export type DiscordEnforcementMode = 'off' | 'new_users' | 'all';

export function isDiscordIntegrationEnabled() {
  const value = String(process.env.DISCORD_INTEGRATION_ENABLED || '').trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export function getDiscordEnforcementMode(): DiscordEnforcementMode {
  const value = String(process.env.DISCORD_LINK_ENFORCEMENT_MODE || 'off').trim().toLowerCase();
  return value === 'new_users' || value === 'all' ? value : 'off';
}

export function getDiscordClientId() {
  return String(process.env.DISCORD_CLIENT_ID || '').trim();
}

export function getDiscordClientSecret() {
  return String(process.env.DISCORD_CLIENT_SECRET || '').trim();
}

export function getDiscordBotToken() {
  return String(process.env.DISCORD_BOT_TOKEN || '').trim();
}

export function getDiscordDevGuildId() {
  const value = String(process.env.DISCORD_DEV_GUILD_ID || process.env.DISCORD_TEST_GUILD_ID || '').trim();
  return /^[0-9]{5,32}$/.test(value) ? value : '';
}

export function getPublicServerBaseUrl() {
  return (
    process.env.SERVER_PUBLIC_URL ||
    process.env.SERVER_URL ||
    process.env.NEXT_PUBLIC_SERVER_URL ||
    'http://localhost:5000'
  ).replace(/\/+$/, '');
}

export function getAppBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    'http://localhost:3000'
  ).replace(/\/+$/, '');
}

export function getDiscordRedirectUri() {
  return (
    process.env.DISCORD_REDIRECT_URI ||
    `${getPublicServerBaseUrl()}/auth/discord/callback`
  ).trim();
}

export function getDiscordConnectScopes(includeTrainerGuilds = false) {
  const scopes = ['identify', 'guilds.join'];
  if (includeTrainerGuilds) scopes.push('guilds');
  return scopes;
}

export function getDiscordBotInstallScopes() {
  return ['bot', 'applications.commands'];
}

export function isValidIanaTimezone(value: unknown): value is string {
  const timezone = String(value || '').trim();
  if (!timezone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function normalizeDiscordTimezone(value: unknown) {
  const timezone = String(value || '').trim();
  return isValidIanaTimezone(timezone) ? timezone : DISCORD_DEFAULT_TIMEZONE;
}

export function safeDiscordReturnTo(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return `${getAppBaseUrl()}/trainer/dashboard`;
  if (raw.startsWith('/')) return `${getAppBaseUrl()}${raw}`;
  try {
    const parsed = new URL(raw);
    const app = new URL(getAppBaseUrl());
    if (parsed.origin === app.origin) return parsed.toString();
  } catch {
    // fall through to default
  }
  return `${getAppBaseUrl()}/trainer/dashboard`;
}

export function buildDiscordBotInstallUrl(guildId?: string | null) {
  const clientId = getDiscordClientId();
  if (!clientId) return '';
  const params = new URLSearchParams({
    client_id: clientId,
    scope: getDiscordBotInstallScopes().join(' '),
    permissions: DISCORD_REQUIRED_BOT_PERMISSIONS,
  });
  if (guildId) {
    params.set('guild_id', guildId);
    params.set('disable_guild_select', 'true');
  }
  return `${DISCORD_OAUTH_BASE}?${params.toString()}`;
}

export function assertDiscordOAuthConfigured() {
  if (!getDiscordClientId() || !getDiscordClientSecret()) {
    throw new Error('Discord OAuth is not configured on the server.');
  }
}

export function assertDiscordBotConfigured() {
  if (!getDiscordBotToken() || !getDiscordClientId()) {
    throw new Error('Discord bot is not configured on the server.');
  }
}
