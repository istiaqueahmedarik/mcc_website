import { Context } from 'hono';
import sql from '../db';
import {
  buildDiscordAuthorizeUrl,
  buildDiscordConnectScopesForUser,
  exchangeDiscordCode,
  fetchDiscordCurrentUser,
  fetchDiscordCurrentUserGuilds,
  hasDiscordManageGuildPermission,
  refreshDiscordToken,
} from '../utils/discordApi';
import {
  DISCORD_REQUIRED_BOT_PERMISSIONS,
  buildDiscordBotInstallUrl,
  getDiscordRedirectUri,
  isDiscordIntegrationEnabled,
  normalizeDiscordTimezone,
  safeDiscordReturnTo,
} from '../utils/discordConfig';
import { decryptDiscordToken, encryptDiscordToken } from '../utils/discordTokenCrypto';
import { enqueueDiscordDeliveryJob } from '../utils/discordDeliveryQueue';
import {
  enqueueDiscordReconcileForClassroom,
  enqueueDiscordReconcileForLinkedUser,
} from '../utils/discordProvisioningRequests';

type DiscordRuleType =
  | 'morning_checkin'
  | 'morning_digest'
  | 'end_of_day_checkin'
  | 'end_of_day_digest'
  | 'session_reminder'
  | 'submission_reminder'
  | 'missed_submission'
  | 'pending_review_digest'
  | 'website_reply_alert';

type ManageableDiscordGuildResult =
  | {
      ok: true;
      guild: { id: string; name: string | null };
    }
  | {
      ok: false;
      status: 400 | 403 | 428;
      error: string;
      code?: 'DISCORD_LINK_REQUIRED';
    };

const DISCORD_RULE_TYPES = new Set<DiscordRuleType>([
  'morning_checkin',
  'morning_digest',
  'end_of_day_checkin',
  'end_of_day_digest',
  'session_reminder',
  'submission_reminder',
  'missed_submission',
  'pending_review_digest',
  'website_reply_alert',
]);

function normalizeText(value: unknown, maxLength = 500) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function normalizeDiscordSnowflake(value: unknown) {
  const text = normalizeText(value, 40);
  const mention = text.match(/^<@!?([0-9]{5,32})>$/);
  const raw = mention?.[1] || text;
  return /^[0-9]{5,32}$/.test(raw) ? raw : '';
}

function normalizeRuleType(value: unknown): DiscordRuleType | null {
  const type = normalizeText(value, 80) as DiscordRuleType;
  return DISCORD_RULE_TYPES.has(type) ? type : null;
}

function addQueryParams(url: string, params: Record<string, string>) {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) parsed.searchParams.set(key, value);
  return parsed.toString();
}

async function getUserForDiscord(userId: string) {
  const rows = await sql`
    SELECT id, email, trainer, admin, created_at
    FROM public.users
    WHERE id = ${userId}
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function isDiscordConnectionActive(userId: string) {
  if (!isDiscordIntegrationEnabled()) return true;
  const rows = await sql`
    SELECT 1
    FROM mcc_private.discord_user_connections
    WHERE user_id = ${userId}
      AND status = 'active'
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function canUserManageClassroom(userId: string, classroomId: string) {
  const rows = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM public.users actor
      WHERE actor.id = ${userId}
        AND (
          actor.admin IS TRUE
          OR (
            actor.trainer IS TRUE
            AND (
              EXISTS (
                SELECT 1 FROM public.classrooms c
                WHERE c.id = ${classroomId}
                  AND c.created_by = ${userId}
              )
              OR EXISTS (
                SELECT 1 FROM public.classroom_substitutes s
                WHERE s.classroom_id = ${classroomId}
                  AND s.trainer_id = ${userId}
              )
            )
          )
        )
    ) AS can_manage
  `;
  return Boolean(rows[0]?.can_manage);
}

async function canUserAccessClassroom(userId: string, classroomId: string) {
  const rows = await sql`
    SELECT EXISTS (
      SELECT 1
      FROM public.classrooms classroom
      JOIN public.users actor ON actor.id = ${userId}
      LEFT JOIN public.classroom_students membership
        ON membership.classroom_id = classroom.id
       AND membership.student_id = ${userId}
       AND membership.enrollment_status = 'active'
      WHERE classroom.id = ${classroomId}
        AND (
          classroom.created_by = ${userId}
          OR actor.admin IS TRUE
          OR actor.trainer IS TRUE
          OR (
            membership.id IS NOT NULL
            AND actor.is_pre_enrolled IS NOT TRUE
          )
        )
    ) AS can_access
  `;
  return Boolean(rows[0]?.can_access);
}

async function getActiveConnection(userId: string) {
  const rows = await sql`
    SELECT *
    FROM mcc_private.discord_user_connections
    WHERE user_id = ${userId}
      AND status = 'active'
    LIMIT 1
  `;
  return rows[0] || null;
}

async function markConnectionReauthRequired(userId: string, reason: string) {
  await sql`
    UPDATE mcc_private.discord_user_connections
    SET status = 'reauth_required',
        reauth_reason = ${reason.slice(0, 240)},
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

async function getFreshDiscordAccessToken(userId: string) {
  const connection = await getActiveConnection(userId);
  if (!connection) return { error: 'Discord account is not linked.', status: 428 as const };
  if (!connection.encrypted_access_token || !connection.encrypted_refresh_token || !connection.token_expires_at) {
    return {
      error: 'Discord OAuth access is required for this action. Ask the user to connect Discord directly.',
      status: 428 as const,
    };
  }

  const expiresAt = new Date(connection.token_expires_at).getTime();
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 60_000) {
    return { accessToken: await decryptDiscordToken(connection.encrypted_access_token), connection };
  }

  try {
    const refreshToken = await decryptDiscordToken(connection.encrypted_refresh_token);
    const refreshed = await refreshDiscordToken(refreshToken);
    const encryptedAccess = await encryptDiscordToken(refreshed.access_token);
    const encryptedRefresh = await encryptDiscordToken(refreshed.refresh_token);
    const tokenExpiresAt = new Date(Date.now() + Math.max(1, Number(refreshed.expires_in || 1)) * 1000).toISOString();
    const scopes = String(refreshed.scope || '').split(/\s+/).filter(Boolean);
    const rows = await sql`
      UPDATE mcc_private.discord_user_connections
      SET encrypted_access_token = ${encryptedAccess},
          encrypted_refresh_token = ${encryptedRefresh},
          token_expires_at = ${tokenExpiresAt}::timestamptz,
          scopes = ${scopes},
          last_refresh_at = now(),
          updated_at = now()
      WHERE id = ${connection.id}
      RETURNING *
    `;
    return { accessToken: refreshed.access_token, connection: rows[0] || connection };
  } catch {
    await markConnectionReauthRequired(userId, 'Discord OAuth refresh failed.');
    return { error: 'Discord account needs to be reconnected.', status: 428 as const };
  }
}

export const beginDiscordAuthorize = async (c: Context) => {
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!isDiscordIntegrationEnabled()) {
    return c.json({ enabled: false, error: 'Discord integration is disabled.' }, 404);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const user = await getUserForDiscord(userId);
    if (!user) return c.json({ error: 'User not found' }, 404);

    const scopes = buildDiscordConnectScopesForUser(user);
    const state = `${crypto.randomUUID()}${crypto.randomUUID().replace(/-/g, '')}`;
    const redirectUri = getDiscordRedirectUri();
    const returnTo = safeDiscordReturnTo(body?.returnTo);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO mcc_private.discord_oauth_states (
        state,
        user_id,
        flow,
        scopes,
        redirect_uri,
        return_to,
        expires_at
      )
      VALUES (
        ${state},
        ${userId},
        'connect',
        ${scopes},
        ${redirectUri},
        ${returnTo},
        ${expiresAt}::timestamptz
      )
    `;

    return c.json({
      enabled: true,
      authorizeUrl: buildDiscordAuthorizeUrl({ state, scopes, redirectUri }),
      expiresAt,
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Could not start Discord authorization.' }, 500);
  }
};

export const handleDiscordCallback = async (c: Context) => {
  const state = normalizeText(c.req.query('state'), 200);
  const code = normalizeText(c.req.query('code'), 2000);
  const error = normalizeText(c.req.query('error'), 200);
  const fallbackReturnTo = safeDiscordReturnTo('');
  let callbackReturnTo = fallbackReturnTo;

  try {
    const stateRows = await sql`
      SELECT *
      FROM mcc_private.discord_oauth_states
      WHERE state = ${state}
        AND consumed_at IS NULL
        AND expires_at > now()
      LIMIT 1
    `;
    const stateRow = stateRows[0];
    const returnTo = stateRow?.return_to || fallbackReturnTo;
    callbackReturnTo = returnTo;

    if (!stateRow) return c.redirect(addQueryParams(fallbackReturnTo, { discord: 'error', reason: 'state' }));
    if (error) return c.redirect(addQueryParams(returnTo, { discord: 'error', reason: error }));
    if (!code) return c.redirect(addQueryParams(returnTo, { discord: 'error', reason: 'missing_code' }));
    if (!stateRow.user_id) return c.redirect(addQueryParams(returnTo, { discord: 'error', reason: 'unsupported_flow' }));

    const tokens = await exchangeDiscordCode(code, stateRow.redirect_uri);
    const discordUser = await fetchDiscordCurrentUser(tokens.access_token);
    const discordUserId = normalizeDiscordSnowflake(discordUser.id);
    if (!discordUserId) return c.redirect(addQueryParams(returnTo, { discord: 'error', reason: 'invalid_user' }));

    const existing = await sql`
      SELECT user_id
      FROM mcc_private.discord_user_connections
      WHERE discord_user_id = ${discordUserId}
        AND user_id <> ${stateRow.user_id}
        AND status <> 'revoked'
      LIMIT 1
    `;
    if (existing.length > 0) {
      return c.redirect(addQueryParams(returnTo, { discord: 'error', reason: 'account_in_use' }));
    }

    const encryptedAccess = await encryptDiscordToken(tokens.access_token);
    const encryptedRefresh = await encryptDiscordToken(tokens.refresh_token);
    const scopes = String(tokens.scope || '').split(/\s+/).filter(Boolean);
    const tokenExpiresAt = new Date(Date.now() + Math.max(1, Number(tokens.expires_in || 1)) * 1000).toISOString();

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO mcc_private.discord_user_connections (
          user_id,
          discord_user_id,
          username,
          global_name,
          avatar,
          scopes,
          encrypted_access_token,
          encrypted_refresh_token,
          token_expires_at,
          status,
          connection_source,
          verified_at,
          verified_by_user_id,
          connected_at,
          updated_at
        )
        VALUES (
          ${stateRow.user_id},
          ${discordUserId},
          ${discordUser.username || null},
          ${discordUser.global_name || null},
          ${discordUser.avatar || null},
          ${scopes},
          ${encryptedAccess},
          ${encryptedRefresh},
          ${tokenExpiresAt}::timestamptz,
          'active',
          'oauth',
          now(),
          ${stateRow.user_id},
          now(),
          now()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          discord_user_id = EXCLUDED.discord_user_id,
          username = EXCLUDED.username,
          global_name = EXCLUDED.global_name,
          avatar = EXCLUDED.avatar,
          scopes = EXCLUDED.scopes,
          encrypted_access_token = EXCLUDED.encrypted_access_token,
          encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
          token_expires_at = EXCLUDED.token_expires_at,
          status = 'active',
          connection_source = 'oauth',
          verified_at = now(),
          verified_by_user_id = EXCLUDED.verified_by_user_id,
          reauth_reason = null,
          revoked_at = null,
          updated_at = now()
      `;
      await enqueueDiscordReconcileForLinkedUser({
        tx,
        userId: stateRow.user_id,
        reason: 'oauth_linked',
      });
      await tx`
        UPDATE mcc_private.discord_oauth_states
        SET consumed_at = now()
        WHERE id = ${stateRow.id}
      `;
    });

    return c.redirect(addQueryParams(returnTo, { discord: 'connected' }));
  } catch (callbackError: any) {
    console.warn('[discord-oauth] callback failed', {
      code: String(callbackError?.status || callbackError?.code || callbackError?.name || 'unknown').slice(0, 80),
    });
    return c.redirect(addQueryParams(callbackReturnTo, { discord: 'error', reason: 'callback_failed' }));
  }
};

export const getDiscordStatus = async (c: Context) => {
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  if (!isDiscordIntegrationEnabled()) {
    return c.json({ enabled: false, linked: false, status: 'disabled' });
  }

  try {
    const rows = await sql`
      SELECT discord_user_id,
             username,
             global_name,
             avatar,
             scopes,
             status,
             reauth_reason,
             connection_source,
             verified_at,
             verified_by_user_id,
             token_expires_at,
             connected_at,
             updated_at
      FROM mcc_private.discord_user_connections
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const connection = rows[0];
    return c.json({
      enabled: true,
      linked: Boolean(connection?.status === 'active'),
        status: connection?.status || 'unlinked',
        connection: connection ? {
          discordUserId: connection.discord_user_id,
          username: connection.username,
          globalName: connection.global_name,
          avatar: connection.avatar,
          scopes: connection.scopes || [],
          source: connection.connection_source || 'oauth',
          verifiedAt: connection.verified_at,
          verifiedByUserId: connection.verified_by_user_id,
          connectedAt: connection.connected_at,
          updatedAt: connection.updated_at,
          reauthReason: connection.reauth_reason,
      } : null,
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Could not load Discord status.' }, 500);
  }
};

export const listEligibleDiscordGuilds = async (c: Context) => {
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!isDiscordIntegrationEnabled()) return c.json({ enabled: false, guilds: [] });

  try {
    const user = await getUserForDiscord(userId);
    if (!user?.trainer && !user?.admin) return c.json({ error: 'Trainers only' }, 403);
    const tokenResult = await getFreshDiscordAccessToken(userId);
    if ('error' in tokenResult) return c.json({ error: tokenResult.error, code: 'DISCORD_LINK_REQUIRED' }, tokenResult.status);
    const scopes = tokenResult.connection?.scopes || [];
    if (!scopes.includes('guilds')) {
      await markConnectionReauthRequired(userId, 'Trainer guild selection requires the Discord guilds scope.');
      return c.json({ error: 'Reconnect Discord to grant server selection access.', code: 'DISCORD_LINK_REQUIRED' }, 428);
    }

    const guilds = await fetchDiscordCurrentUserGuilds(tokenResult.accessToken);
    const eligible = guilds
      .filter(hasDiscordManageGuildPermission)
      .map((guild) => ({
        id: guild.id,
        name: guild.name,
        owner: Boolean(guild.owner),
        botInviteUrl: buildDiscordBotInstallUrl(guild.id),
      }));

    return c.json({
      enabled: true,
      guilds: eligible,
      requiredBotPermissions: DISCORD_REQUIRED_BOT_PERMISSIONS,
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Could not load Discord servers.' }, 500);
  }
};

export async function getManageableDiscordGuildForUser(
  userId: string,
  requestedGuildId: unknown,
): Promise<ManageableDiscordGuildResult> {
  const guildId = normalizeDiscordSnowflake(requestedGuildId);
  if (!guildId) {
    return { ok: false as const, status: 400 as const, error: 'Choose a valid Discord server.' };
  }

  const tokenResult = await getFreshDiscordAccessToken(userId);
  if ('error' in tokenResult) {
    return {
      ok: false as const,
      status: 428 as const,
      error: tokenResult.error || 'Discord account needs to be reconnected.',
      code: 'DISCORD_LINK_REQUIRED',
    };
  }

  const scopes = tokenResult.connection?.scopes || [];
  if (!scopes.includes('guilds')) {
    await markConnectionReauthRequired(userId, 'Trainer guild selection requires the Discord guilds scope.');
    return {
      ok: false as const,
      status: 428 as const,
      error: 'Reconnect Discord to grant server selection access.',
      code: 'DISCORD_LINK_REQUIRED',
    };
  }

  const guilds = await fetchDiscordCurrentUserGuilds(tokenResult.accessToken);
  const guild = guilds.find((candidate) => candidate.id === guildId && hasDiscordManageGuildPermission(candidate));
  if (!guild) {
    return {
      ok: false as const,
      status: 403 as const,
      error: 'You need Manage Server permission for that Discord server.',
    };
  }

  return {
    ok: true as const,
    guild: {
      id: guild.id,
      name: normalizeText(guild.name, 200) || null,
    },
  };
}

const defaultRules: Array<{
  rule_type: DiscordRuleType;
  enabled: boolean;
  local_time?: string | null;
  offset_minutes?: number | null;
}> = [
  { rule_type: 'morning_checkin', enabled: true, local_time: '09:00' },
  { rule_type: 'morning_digest', enabled: true, local_time: '09:00' },
  { rule_type: 'end_of_day_checkin', enabled: true, local_time: '21:00' },
  { rule_type: 'end_of_day_digest', enabled: true, local_time: '21:00' },
  { rule_type: 'session_reminder', enabled: true, offset_minutes: -60 },
  { rule_type: 'submission_reminder', enabled: true, offset_minutes: -60 },
  { rule_type: 'missed_submission', enabled: true, offset_minutes: 5 },
  { rule_type: 'pending_review_digest', enabled: true, local_time: '21:00' },
  { rule_type: 'website_reply_alert', enabled: false },
];

export async function createClassroomDiscordBindingForNewClassroom(input: {
  tx: any;
  classroomId: string;
  trainerId: string;
  guildId: string;
  guildName?: string | null;
  timezone: string;
  reminderPreset?: string | null;
}) {
  const guildId = normalizeDiscordSnowflake(input.guildId);
  if (!guildId) throw new Error('Discord server is required.');
  const timezone = normalizeDiscordTimezone(input.timezone);

  const installation = await upsertDiscordGuildInstallationInTx(input.tx, {
    guildId,
    guildName: input.guildName,
    trainerId: input.trainerId,
  });

  const bindingRows = await input.tx`
    INSERT INTO mcc_private.classroom_discord_bindings (
      classroom_id,
      guild_installation_id,
      guild_id,
      created_by_user_id,
      timezone,
      provisioning_state,
      privacy_acknowledged_at
    )
    VALUES (
      ${input.classroomId},
      ${installation.id},
      ${guildId},
      ${input.trainerId},
      ${timezone},
      'provisioning',
      now()
    )
    RETURNING *
  `;
  const binding = bindingRows[0];

  await input.tx`
    INSERT INTO mcc_private.discord_notification_rules ${input.tx(
      defaultRules.map((rule) => ({
        classroom_id: input.classroomId,
        binding_id: binding.id,
        rule_type: rule.rule_type,
        enabled: rule.enabled,
        local_time: rule.local_time || null,
        offset_minutes: rule.offset_minutes ?? null,
        timezone,
        metadata: { preset: input.reminderPreset || 'default' },
      }))
    )}
    ON CONFLICT (classroom_id, rule_type) DO UPDATE SET
      binding_id = EXCLUDED.binding_id,
      timezone = EXCLUDED.timezone,
      updated_at = now()
  `;

  await enqueueDiscordDeliveryJob({
    tx: input.tx,
    classroomId: input.classroomId,
    bindingId: binding.id,
    userId: input.trainerId,
    kind: 'provision_classroom',
    idempotencyKey: `provision:${input.classroomId}`,
    payload: { classroomId: input.classroomId, bindingId: binding.id },
  });

  return binding;
}

async function upsertDiscordGuildInstallationInTx(tx: any, input: {
  guildId: string;
  guildName?: string | null;
  trainerId: string;
}) {
  const installationRows = await tx`
    INSERT INTO mcc_private.discord_guild_installations (
      guild_id,
      guild_name,
      installed_by_user_id,
      status,
      health,
      updated_at
    )
    VALUES (
      ${input.guildId},
      ${input.guildName || null},
      ${input.trainerId},
      'pending_bot_install',
      'unknown',
      now()
    )
    ON CONFLICT (guild_id) DO UPDATE SET
      guild_name = COALESCE(EXCLUDED.guild_name, mcc_private.discord_guild_installations.guild_name),
      installed_by_user_id = COALESCE(mcc_private.discord_guild_installations.installed_by_user_id, EXCLUDED.installed_by_user_id),
      updated_at = now()
    RETURNING *
  `;
  return installationRows[0];
}

export const changeClassroomDiscordChannels = async (c: Context) => {
  const classroomId = c.req.param('id');
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!isDiscordIntegrationEnabled()) {
    return c.json({ enabled: false, error: 'Discord integration is disabled.' }, 404);
  }
  if (!(await canUserManageClassroom(userId, classroomId))) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const body = await c.req.json().catch(() => ({}));
    const guildAccess = await getManageableDiscordGuildForUser(userId, body?.guildId);
    if (!guildAccess.ok) {
      return c.json({ error: guildAccess.error, code: guildAccess.code }, guildAccess.status);
    }

    let movedBinding: any = null;
    let previousGuildId: string | null = null;

    await sql.begin(async (tx) => {
      await tx`SET LOCAL lock_timeout = '5s'`;
      const installation = await upsertDiscordGuildInstallationInTx(tx, {
        guildId: guildAccess.guild.id,
        guildName: guildAccess.guild.name,
        trainerId: userId,
      });
      const bindingRows = await tx`
        SELECT id,
               guild_id
        FROM mcc_private.classroom_discord_bindings
        WHERE classroom_id = ${classroomId}
        LIMIT 1
        FOR UPDATE
      `;
      if (bindingRows.length === 0) {
        const error: any = new Error('Discord is not configured for this classroom.');
        error.status = 404;
        throw error;
      }

      const binding = bindingRows[0];
      previousGuildId = binding.guild_id;

      await tx`
        UPDATE mcc_private.classroom_discord_channels
        SET status = 'archived',
            archived_at = COALESCE(archived_at, now()),
            updated_at = now()
        WHERE binding_id = ${binding.id}
          AND status = 'active'
      `;
      await tx`
        DELETE FROM mcc_private.classroom_discord_categories
        WHERE binding_id = ${binding.id}
      `;
      const rows = await tx`
        UPDATE mcc_private.classroom_discord_bindings
        SET guild_installation_id = ${installation.id},
            guild_id = ${guildAccess.guild.id},
            staff_channel_id = null,
            provisioning_state = 'provisioning',
            action_required_reason = null,
            privacy_acknowledged_at = CASE WHEN ${Boolean(body?.privacyAcknowledged)} THEN now() ELSE privacy_acknowledged_at END,
            updated_at = now()
        WHERE id = ${binding.id}
        RETURNING *
      `;
      movedBinding = rows[0];

      await enqueueDiscordDeliveryJob({
        tx,
        classroomId,
        bindingId: binding.id,
        userId,
        kind: 'provision_classroom',
        idempotencyKey: `provision:${classroomId}:channels:${crypto.randomUUID()}`,
        payload: {
          classroomId,
          bindingId: binding.id,
          previousGuildId,
          guildId: guildAccess.guild.id,
          reason: previousGuildId === guildAccess.guild.id ? 'recreate_channels' : 'change_guild',
        },
      });
    });

    return c.json({
      success: true,
      discord: {
        classroomId,
        previousGuildId,
        guildId: movedBinding.guild_id,
        provisioningState: movedBinding.provisioning_state,
      },
    });
  } catch (error: any) {
    if (error?.status === 404) {
      return c.json({ error: error.message || 'Discord is not configured for this classroom.' }, 404);
    }
    return c.json({ error: error.message || 'Could not change Discord channels.' }, 500);
  }
};

export const getClassroomDiscordStatus = async (c: Context) => {
  const classroomId = c.req.param('id');
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await canUserAccessClassroom(userId, classroomId))) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const rows = await sql`
      SELECT binding.*,
             installation.guild_name,
             installation.status AS installation_status,
             installation.health AS installation_health,
             COUNT(channel.id) FILTER (WHERE channel.kind = 'student_private' AND channel.status = 'active') AS student_channel_count,
             COUNT(channel.id) FILTER (WHERE channel.status = 'action_required') AS channel_error_count
      FROM mcc_private.classroom_discord_bindings binding
      JOIN mcc_private.discord_guild_installations installation ON installation.id = binding.guild_installation_id
      LEFT JOIN mcc_private.classroom_discord_channels channel ON channel.binding_id = binding.id
      WHERE binding.classroom_id = ${classroomId}
      GROUP BY binding.id, installation.guild_name, installation.status, installation.health
      LIMIT 1
    `;
    const binding = rows[0] || null;
    return c.json({
      enabled: isDiscordIntegrationEnabled(),
      status: binding ? {
        classroomId,
        guildId: binding.guild_id,
        guildName: binding.guild_name,
        timezone: binding.timezone,
        provisioningState: binding.provisioning_state,
        actionRequiredReason: binding.action_required_reason,
        installationStatus: binding.installation_status,
        installationHealth: binding.installation_health,
        staffChannelId: binding.staff_channel_id,
        studentChannelCount: Number(binding.student_channel_count || 0),
        channelErrorCount: Number(binding.channel_error_count || 0),
        lastReconciledAt: binding.last_reconciled_at,
      } : null,
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Could not load Discord classroom status.' }, 500);
  }
};

export const bindExistingClassroomDiscord = async (c: Context) => {
  const classroomId = c.req.param('id');
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!isDiscordIntegrationEnabled()) {
    return c.json({ enabled: false, error: 'Discord integration is disabled.' }, 404);
  }
  if (!(await canUserManageClassroom(userId, classroomId))) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const body = await c.req.json().catch(() => ({}));
    const guildAccess = await getManageableDiscordGuildForUser(userId, body?.guildId);
    if (!guildAccess.ok) {
      return c.json({ error: guildAccess.error, code: guildAccess.code }, guildAccess.status);
    }

    const timezone = normalizeDiscordTimezone(body?.timezone);
    const reminderPreset = normalizeText(body?.reminderPreset, 40) || 'default';
    let binding: any = null;

    await sql.begin(async (tx) => {
      const existing = await tx`
        SELECT id
        FROM mcc_private.classroom_discord_bindings
        WHERE classroom_id = ${classroomId}
        LIMIT 1
      `;
      if (existing.length > 0) {
        const error: any = new Error('Discord is already configured for this classroom.');
        error.status = 409;
        throw error;
      }

      binding = await createClassroomDiscordBindingForNewClassroom({
        tx,
        classroomId,
        trainerId: userId,
        guildId: guildAccess.guild.id,
        guildName: guildAccess.guild.name,
        timezone,
        reminderPreset,
      });
    });

    return c.json({
      success: true,
      discord: {
        classroomId,
        guildId: binding.guild_id,
        timezone: binding.timezone,
        provisioningState: binding.provisioning_state,
      },
    });
  } catch (error: any) {
    if (error?.status === 409) {
      return c.json({ error: error.message || 'Discord is already configured for this classroom.' }, 409);
    }
    if (error?.code === '23505') {
      return c.json({ error: 'Discord is already configured for this classroom.' }, 409);
    }
    return c.json({ error: error.message || 'Could not connect Discord.' }, 500);
  }
};

export const updateClassroomDiscordSettings = async (c: Context) => {
  const classroomId = c.req.param('id');
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await canUserManageClassroom(userId, classroomId))) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const body = await c.req.json().catch(() => ({}));
    const timezone = normalizeDiscordTimezone(body?.timezone);
    const rows = await sql`
      UPDATE mcc_private.classroom_discord_bindings
      SET timezone = ${timezone},
          privacy_acknowledged_at = CASE WHEN ${Boolean(body?.privacyAcknowledged)} THEN now() ELSE privacy_acknowledged_at END,
          updated_at = now()
      WHERE classroom_id = ${classroomId}
      RETURNING *
    `;
    if (rows.length === 0) return c.json({ error: 'Discord is not configured for this classroom.' }, 404);
    await sql`
      UPDATE mcc_private.discord_notification_rules
      SET timezone = ${timezone},
          updated_at = now()
      WHERE classroom_id = ${classroomId}
    `;
    return c.json({ success: true, discord: rows[0] });
  } catch (error: any) {
    return c.json({ error: error.message || 'Could not update Discord settings.' }, 500);
  }
};

export const reconcileClassroomDiscord = async (c: Context) => {
  const classroomId = c.req.param('id');
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await canUserManageClassroom(userId, classroomId))) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const rows = await sql`
      SELECT id
      FROM mcc_private.classroom_discord_bindings
      WHERE classroom_id = ${classroomId}
      LIMIT 1
    `;
    if (rows.length === 0) return c.json({ error: 'Discord is not configured for this classroom.' }, 404);
    const job = await enqueueDiscordDeliveryJob({
      classroomId,
      bindingId: rows[0].id,
      userId,
      kind: 'reconcile_classroom',
      idempotencyKey: `reconcile:${classroomId}:${crypto.randomUUID()}`,
      payload: { classroomId, bindingId: rows[0].id, requestedBy: userId },
    });
    return c.json({ success: true, jobId: job.id });
  } catch (error: any) {
    return c.json({ error: error.message || 'Could not queue Discord repair.' }, 500);
  }
};

export const getClassroomDiscordRules = async (c: Context) => {
  const classroomId = c.req.param('id');
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await canUserAccessClassroom(userId, classroomId))) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const rules = await sql`
      SELECT rule_type,
             enabled,
             local_time,
             offset_minutes,
             timezone,
             metadata,
             updated_at
      FROM mcc_private.discord_notification_rules
      WHERE classroom_id = ${classroomId}
      ORDER BY rule_type asc
    `;
    return c.json({ success: true, rules });
  } catch (error: any) {
    return c.json({ error: error.message || 'Could not load Discord rules.' }, 500);
  }
};

export const getClassroomDiscordRoster = async (c: Context) => {
  const classroomId = c.req.param('id');
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await canUserManageClassroom(userId, classroomId))) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const rows = await sql`
      SELECT membership.student_id,
             membership.enrollment_status,
             membership.pre_enrollment_email,
             membership.pre_enrollment_identifier,
             actor.full_name,
             actor.email,
             actor.mist_id,
             actor.is_pre_enrolled,
             connection.discord_user_id,
             connection.username AS discord_username,
             connection.global_name AS discord_global_name,
             connection.status AS discord_connection_status,
             connection.reauth_reason,
             connection.connection_source,
             connection.verified_at,
             connection.verified_by_user_id,
             verifier.full_name AS verified_by_name,
             connection.manual_note,
             channel.channel_id,
             channel.status AS discord_channel_status,
             channel.archived_at,
             channel.last_reconciled_at
      FROM public.classroom_students membership
      JOIN public.users actor ON actor.id = membership.student_id
      LEFT JOIN mcc_private.discord_user_connections connection
        ON connection.user_id = membership.student_id
       AND connection.status <> 'revoked'
      LEFT JOIN public.users verifier ON verifier.id = connection.verified_by_user_id
      LEFT JOIN mcc_private.classroom_discord_channels channel
        ON channel.classroom_id = membership.classroom_id
       AND channel.student_id = membership.student_id
       AND channel.kind = 'student_private'
      WHERE membership.classroom_id = ${classroomId}
      ORDER BY
        CASE membership.enrollment_status
          WHEN 'active' THEN 0
          WHEN 'link_pending' THEN 1
          ELSE 2
        END,
        actor.full_name NULLS LAST,
        actor.email NULLS LAST
    `;

    return c.json({
      success: true,
      roster: rows.map((row: any) => ({
        studentId: row.student_id,
        name: row.full_name || row.email || row.pre_enrollment_email || 'Student',
        email: row.is_pre_enrolled ? row.pre_enrollment_email : row.email,
        mistId: row.mist_id,
        enrollmentStatus: row.enrollment_status,
        isPlaceholder: Boolean(row.is_pre_enrolled),
        preEnrollmentIdentifier: row.pre_enrollment_identifier,
        discord: row.discord_user_id ? {
          discordUserId: row.discord_user_id,
          username: row.discord_username,
          globalName: row.discord_global_name,
          status: row.discord_connection_status,
          reauthReason: row.reauth_reason,
          source: row.connection_source || 'oauth',
          verifiedAt: row.verified_at,
          verifiedByUserId: row.verified_by_user_id,
          verifiedByName: row.verified_by_name,
          manualNote: row.manual_note,
        } : null,
        channel: row.channel_id ? {
          channelId: row.channel_id,
          status: row.discord_channel_status,
          archivedAt: row.archived_at,
          lastReconciledAt: row.last_reconciled_at,
        } : null,
      })),
    });
  } catch (error: any) {
    return c.json({ error: error.message || 'Could not load Discord roster.' }, 500);
  }
};

export const trustClassroomStudentDiscordConnection = async (c: Context) => {
  const classroomId = c.req.param('id');
  const studentId = c.req.param('studentId');
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await canUserManageClassroom(userId, classroomId))) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const body = await c.req.json().catch(() => ({}));
    const discordUserId = normalizeDiscordSnowflake(
      body?.discordUserId || body?.discordId || body?.discordUsername || body?.username || body?.mention
    );
    if (!discordUserId) {
      return c.json({
        error: 'Discord user ID or @mention is required. Display usernames are not stable enough for authorization.',
      }, 400);
    }

    const username = normalizeText(body?.username || body?.discordUsername || body?.discordName, 80) || null;
    const globalName = normalizeText(body?.globalName || body?.displayName, 80) || null;
    const note = normalizeText(body?.note || body?.manualNote, 300) || null;

    const studentRows = await sql`
      SELECT membership.student_id,
             student.full_name,
             student.email
      FROM public.classroom_students membership
      JOIN public.users student ON student.id = membership.student_id
      WHERE membership.classroom_id = ${classroomId}
        AND membership.student_id = ${studentId}
        AND membership.enrollment_status = 'active'
        AND student.admin IS NOT TRUE
        AND student.trainer IS NOT TRUE
        AND student.is_pre_enrolled IS NOT TRUE
      LIMIT 1
    `;
    if (studentRows.length === 0) {
      return c.json({ error: 'Only active real classroom students can receive a trusted Discord link.' }, 404);
    }

    const duplicateRows = await sql`
      SELECT user_id
      FROM mcc_private.discord_user_connections
      WHERE discord_user_id = ${discordUserId}
        AND user_id <> ${studentId}
        AND status <> 'revoked'
      LIMIT 1
    `;
    if (duplicateRows.length > 0) {
      return c.json({ error: 'That Discord account is already linked to another MCC user.' }, 409);
    }

    let connection: any = null;
    await sql.begin(async (tx) => {
      const rows = await tx`
        INSERT INTO mcc_private.discord_user_connections (
          user_id,
          discord_user_id,
          username,
          global_name,
          avatar,
          scopes,
          encrypted_access_token,
          encrypted_refresh_token,
          token_expires_at,
          status,
          connection_source,
          verified_at,
          verified_by_user_id,
          manual_note,
          connected_at,
          updated_at
        )
        VALUES (
          ${studentId},
          ${discordUserId},
          ${username},
          ${globalName},
          null,
          ARRAY[]::text[],
          null,
          null,
          null,
          'active',
          'trusted_manual',
          now(),
          ${userId},
          ${note},
          now(),
          now()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          discord_user_id = EXCLUDED.discord_user_id,
          username = EXCLUDED.username,
          global_name = EXCLUDED.global_name,
          avatar = null,
          scopes = ARRAY[]::text[],
          encrypted_access_token = null,
          encrypted_refresh_token = null,
          token_expires_at = null,
          status = 'active',
          connection_source = 'trusted_manual',
          verified_at = now(),
          verified_by_user_id = ${userId},
          manual_note = EXCLUDED.manual_note,
          reauth_reason = null,
          revoked_at = null,
          updated_at = now()
        RETURNING *
      `;
      connection = rows[0] || null;
      await enqueueDiscordReconcileForClassroom({
        tx,
        classroomId,
        userId,
        reason: 'trusted_manual_link',
        payload: { studentId },
      });
    });

    return c.json({
      success: true,
      connection: {
        discordUserId: connection.discord_user_id,
        username: connection.username,
        globalName: connection.global_name,
        status: connection.status,
        source: connection.connection_source,
        verifiedAt: connection.verified_at,
        verifiedByUserId: connection.verified_by_user_id,
        manualNote: connection.manual_note,
      },
    });
  } catch (error: any) {
    if (error?.code === '23505') {
      return c.json({ error: 'That Discord account is already linked to another MCC user.' }, 409);
    }
    return c.json({ error: error.message || 'Could not trust this Discord account.' }, 500);
  }
};

export const updateClassroomDiscordRules = async (c: Context) => {
  const classroomId = c.req.param('id');
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await canUserManageClassroom(userId, classroomId))) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const body = await c.req.json().catch(() => ({}));
    const rules = Array.isArray(body?.rules) ? body.rules : [];
    const bindingRows = await sql`
      SELECT id, timezone
      FROM mcc_private.classroom_discord_bindings
      WHERE classroom_id = ${classroomId}
      LIMIT 1
    `;
    if (bindingRows.length === 0) return c.json({ error: 'Discord is not configured for this classroom.' }, 404);

    for (const rule of rules) {
      const ruleType = normalizeRuleType(rule?.ruleType || rule?.rule_type);
      if (!ruleType) continue;
      const timezone = normalizeDiscordTimezone(rule?.timezone || bindingRows[0].timezone);
      const localTime = normalizeText(rule?.localTime || rule?.local_time, 20) || null;
      const rawOffset = Number(rule?.offsetMinutes ?? rule?.offset_minutes);
      const offsetMinutes = Number.isFinite(rawOffset) ? Math.max(-10080, Math.min(10080, Math.trunc(rawOffset))) : null;
      await sql`
        INSERT INTO mcc_private.discord_notification_rules (
          classroom_id,
          binding_id,
          rule_type,
          enabled,
          local_time,
          offset_minutes,
          timezone,
          metadata
        )
        VALUES (
          ${classroomId},
          ${bindingRows[0].id},
          ${ruleType},
          ${Boolean(rule?.enabled)},
          ${localTime}::time,
          ${offsetMinutes},
          ${timezone},
          ${sql.json(rule?.metadata && typeof rule.metadata === 'object' ? rule.metadata : {})}
        )
        ON CONFLICT (classroom_id, rule_type) DO UPDATE SET
          enabled = EXCLUDED.enabled,
          local_time = EXCLUDED.local_time,
          offset_minutes = EXCLUDED.offset_minutes,
          timezone = EXCLUDED.timezone,
          metadata = EXCLUDED.metadata,
          updated_at = now()
      `;
    }

    return getClassroomDiscordRules(c);
  } catch (error: any) {
    return c.json({ error: error.message || 'Could not update Discord rules.' }, 500);
  }
};

export const getClassroomDailyCheckins = async (c: Context) => {
  const classroomId = c.req.param('id');
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await canUserAccessClassroom(userId, classroomId))) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const isManager = await canUserManageClassroom(userId, classroomId);
    const rows = isManager
      ? await sql`
          SELECT checkin.*, u.full_name AS student_name, u.email AS student_email
          FROM mcc_private.classroom_daily_checkins checkin
          JOIN public.users u ON u.id = checkin.student_id
          WHERE checkin.classroom_id = ${classroomId}
          ORDER BY checkin.checkin_date desc, checkin.submitted_at desc
          LIMIT 200
        `
      : await sql`
          SELECT checkin.*, u.full_name AS student_name, u.email AS student_email
          FROM mcc_private.classroom_daily_checkins checkin
          JOIN public.users u ON u.id = checkin.student_id
          WHERE checkin.classroom_id = ${classroomId}
            AND checkin.student_id = ${userId}
          ORDER BY checkin.checkin_date desc, checkin.submitted_at desc
          LIMIT 80
        `;
    return c.json({ success: true, checkins: rows });
  } catch (error: any) {
    return c.json({ error: error.message || 'Could not load check-ins.' }, 500);
  }
};

export const createClassroomDailyCheckin = async (c: Context) => {
  const classroomId = c.req.param('id');
  const payload = c.get('jwtPayload') || {};
  const userId = payload.id;
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);
  if (!(await canUserAccessClassroom(userId, classroomId))) return c.json({ error: 'Unauthorized' }, 403);

  try {
    const body = await c.req.json().catch(() => ({}));
    const isManager = await canUserManageClassroom(userId, classroomId);
    const requestedStudentId = normalizeText(body?.studentId || body?.student_id, 80);
    const studentId = isManager && requestedStudentId ? requestedStudentId : userId;
    const period = normalizeText(body?.period, 40) === 'end_of_day' ? 'end_of_day' : 'morning';
    const checkinDate = normalizeText(body?.checkinDate || body?.checkin_date, 40)
      || new Date().toISOString().slice(0, 10);
    const rows = await sql`
      INSERT INTO mcc_private.classroom_daily_checkins (
        classroom_id,
        student_id,
        source,
        period,
        checkin_date,
        goals,
        completed_work,
        blockers,
        next_steps
      )
      VALUES (
        ${classroomId},
        ${studentId},
        'web',
        ${period},
        ${checkinDate}::date,
        ${normalizeText(body?.goals, 2000) || null},
        ${normalizeText(body?.completedWork || body?.completed_work, 2000) || null},
        ${normalizeText(body?.blockers, 2000) || null},
        ${normalizeText(body?.nextSteps || body?.next_steps, 2000) || null}
      )
      ON CONFLICT (classroom_id, student_id, checkin_date, period) DO UPDATE SET
        goals = EXCLUDED.goals,
        completed_work = EXCLUDED.completed_work,
        blockers = EXCLUDED.blockers,
        next_steps = EXCLUDED.next_steps,
        source = 'web',
        submitted_at = now(),
        updated_at = now()
      RETURNING *
    `;
    return c.json({ success: true, checkin: rows[0] });
  } catch (error: any) {
    return c.json({ error: error.message || 'Could not save check-in.' }, 500);
  }
};
