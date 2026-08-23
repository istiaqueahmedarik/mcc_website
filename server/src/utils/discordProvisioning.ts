import {
  ChannelType,
  Client,
  Guild,
  OverwriteType,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';
import sql from '../db';
import { addDiscordGuildMember } from './discordApi';
import { DISCORD_STUDENT_CATEGORY_CHANNEL_LIMIT } from './discordConfig';
import { decryptDiscordToken } from './discordTokenCrypto';

function channelName(value: string, fallback: string) {
  const normalized = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return normalized || fallback;
}

function shortStudentId(value: unknown) {
  return String(value || '').trim().slice(0, 8).toLowerCase();
}

function classroomChannelNamespace(classroomName: string, classroomId: string, includeIdSuffix = false) {
  const nameSlug = channelName(classroomName, 'mcc-classroom').slice(0, 70).replace(/-+$/g, '') || 'mcc-classroom';
  if (!includeIdSuffix) return nameSlug;

  const idSlug = shortStudentId(classroomId) || 'classroom';
  const suffix = `-${idSlug}`;
  const availableNameLength = Math.max(1, 70 - suffix.length);
  return `${nameSlug.slice(0, availableNameLength).replace(/-+$/g, '')}${suffix}`;
}

function studentPrivateChannelName(student: any) {
  const studentIdSlug = channelName(student.mist_id || shortStudentId(student.student_id), 'student');
  const nameSlug = channelName(student.full_name, 'student');
  const maxLength = 80;
  const separator = '-';
  const suffix = studentIdSlug ? `${separator}${studentIdSlug}` : '';
  const availableNameLength = Math.max(1, maxLength - suffix.length);
  return `${nameSlug.slice(0, availableNameLength).replace(/-+$/g, '')}${suffix}`.slice(0, maxLength);
}

function staffChannelName(classroomNamespace: string) {
  return `mcc-${classroomNamespace}-staff`;
}

function studentCategoryName(classroomNamespace: string, shardIndex: number) {
  return `${classroomNamespace}-students-${String(shardIndex + 1).padStart(2, '0')}`;
}

async function getBindingContext(bindingId: string) {
  const rows = await sql`
    SELECT binding.id AS binding_id,
           binding.guild_id,
           binding.classroom_id,
           binding.staff_channel_id,
           classroom.name AS classroom_name,
           classroom.created_by
    FROM mcc_private.classroom_discord_bindings binding
    JOIN public.classrooms classroom ON classroom.id = binding.classroom_id
    WHERE binding.id = ${bindingId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function shouldSuffixClassroomNamespace(guildId: string, classroomId: string, classroomName: string) {
  const currentSlug = classroomChannelNamespace(classroomName, classroomId);
  const rows = await sql`
    SELECT classroom.id,
           classroom.name
    FROM mcc_private.classroom_discord_bindings binding
    JOIN public.classrooms classroom ON classroom.id = binding.classroom_id
    WHERE binding.guild_id = ${guildId}
  `;

  return rows.some((row: any) => (
    row.id !== classroomId
    && classroomChannelNamespace(row.name, row.id) === currentSlug
  ));
}

async function getTrainerDiscordIds(classroomId: string) {
  return sql`
    SELECT DISTINCT u.id AS user_id,
           connection.discord_user_id
    FROM public.classrooms classroom
    JOIN public.users u ON u.id = classroom.created_by
    JOIN mcc_private.discord_user_connections connection
      ON connection.user_id = u.id
     AND connection.status = 'active'
    WHERE classroom.id = ${classroomId}
    UNION
    SELECT DISTINCT u.id AS user_id,
           connection.discord_user_id
    FROM public.classroom_substitutes substitute
    JOIN public.users u ON u.id = substitute.trainer_id
    JOIN mcc_private.discord_user_connections connection
      ON connection.user_id = u.id
     AND connection.status = 'active'
    WHERE substitute.classroom_id = ${classroomId}
  `;
}

async function getActiveLinkedStudents(classroomId: string) {
  return sql`
    SELECT student.id AS student_id,
           student.full_name,
           student.mist_id,
           thread.id AS thread_id,
           connection.discord_user_id,
           connection.scopes,
           connection.encrypted_access_token
    FROM public.classroom_students membership
    JOIN public.users student ON student.id = membership.student_id
    JOIN public.classroom_student_threads thread
      ON thread.classroom_id = membership.classroom_id
     AND thread.student_id = membership.student_id
     AND thread.status = 'active'
    JOIN mcc_private.discord_user_connections connection
      ON connection.user_id = student.id
     AND connection.status = 'active'
    WHERE membership.classroom_id = ${classroomId}
      AND membership.enrollment_status = 'active'
      AND student.admin IS NOT TRUE
      AND student.trainer IS NOT TRUE
      AND student.is_pre_enrolled IS NOT TRUE
    ORDER BY student.full_name asc
  `;
}

function privateOverwrites(guild: Guild, userIds: string[]) {
  return [
    {
      id: guild.roles.everyone.id,
      type: OverwriteType.Role,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    ...[...new Set(userIds.filter(Boolean))].map((id) => ({
      id,
      type: OverwriteType.Member,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    })),
  ];
}

async function ensureStaffChannel(input: {
  guild: Guild;
  binding: any;
  classroomNamespace: string;
  trainerDiscordIds: string[];
  botUserId: string;
}) {
  const expectedName = staffChannelName(input.classroomNamespace);
  const overwrites = privateOverwrites(input.guild, [input.botUserId, ...input.trainerDiscordIds]);
  if (input.binding.staff_channel_id) {
    const existing = await input.guild.channels.fetch(input.binding.staff_channel_id).catch(() => null);
    if (existing?.type === ChannelType.GuildText) {
      const textChannel = existing as TextChannel;
      if (textChannel.name !== expectedName) {
        await textChannel.setName(expectedName, 'MCC classroom staff channel naming reconciliation');
      }
      await textChannel.permissionOverwrites.set(
        overwrites,
        'MCC classroom staff channel permission reconciliation',
      );
      return textChannel;
    }
  }

  const channel = await input.guild.channels.create({
    name: expectedName,
    type: ChannelType.GuildText,
    reason: 'MCC classroom staff channel provisioning',
    permissionOverwrites: overwrites,
  });
  await sql`
    UPDATE mcc_private.classroom_discord_bindings
    SET staff_channel_id = ${channel.id},
        updated_at = now()
    WHERE id = ${input.binding.binding_id}
  `;
  await sql`
    INSERT INTO mcc_private.classroom_discord_channels (
      binding_id,
      classroom_id,
      channel_id,
      kind,
      status
    )
    VALUES (
      ${input.binding.binding_id},
      ${input.binding.classroom_id},
      ${channel.id},
      'staff_private',
      'active'
    )
    ON CONFLICT (channel_id) DO UPDATE SET
      status = 'active',
      updated_at = now()
  `;
  return channel;
}

async function reconcileStudentCategoryNames(guild: Guild, bindingId: string, classroomNamespace: string) {
  const rows = await sql`
    SELECT category_id,
           shard_index
    FROM mcc_private.classroom_discord_categories
    WHERE binding_id = ${bindingId}
      AND kind = 'students'
    ORDER BY shard_index asc
  `;

  for (const row of rows) {
    const existing = await guild.channels.fetch(row.category_id).catch(() => null);
    if (existing?.type === ChannelType.GuildCategory) {
      const expectedName = studentCategoryName(classroomNamespace, Number(row.shard_index || 0));
      if (existing.name !== expectedName) {
        await existing.setName(expectedName, 'MCC classroom student category naming reconciliation').catch(() => null);
      }
    }
  }
}

async function ensureStudentCategory(
  guild: Guild,
  bindingId: string,
  classroomNamespace: string,
) {
  const rows = await sql`
    SELECT category.id,
           category.category_id,
           category.shard_index,
           COUNT(channel.id) FILTER (WHERE channel.status = 'active') AS active_channels
    FROM mcc_private.classroom_discord_categories category
    LEFT JOIN mcc_private.classroom_discord_channels channel
      ON channel.category_id = category.id
     AND channel.kind = 'student_private'
    WHERE category.binding_id = ${bindingId}
      AND category.kind = 'students'
    GROUP BY category.id
    ORDER BY category.shard_index asc
  `;
  const reusable = rows.find((row: any) => Number(row.active_channels || 0) < DISCORD_STUDENT_CATEGORY_CHANNEL_LIMIT);
  if (reusable) {
    const existing = await guild.channels.fetch(reusable.category_id).catch(() => null);
    if (existing?.type === ChannelType.GuildCategory) {
      const expectedName = studentCategoryName(classroomNamespace, Number(reusable.shard_index || 0));
      if (existing.name !== expectedName) {
        await existing.setName(expectedName, 'MCC classroom student category naming reconciliation').catch(() => null);
      }
      return reusable;
    }
  }

  const shardIndex = rows.length;
  const category = await guild.channels.create({
    name: studentCategoryName(classroomNamespace, shardIndex),
    type: ChannelType.GuildCategory,
    reason: 'MCC classroom student channel category',
  });
  const inserted = await sql`
    INSERT INTO mcc_private.classroom_discord_categories (
      binding_id,
      category_id,
      kind,
      shard_index,
      max_student_channels
    )
    VALUES (
      ${bindingId},
      ${category.id},
      'students',
      ${shardIndex},
      ${DISCORD_STUDENT_CATEGORY_CHANNEL_LIMIT}
    )
    RETURNING *
  `;
  return inserted[0];
}

async function tryAddStudentToGuild(guildId: string, student: any) {
  const scopes = Array.isArray(student.scopes) ? student.scopes : [];
  if (!student.encrypted_access_token || !scopes.includes('guilds.join')) return false;
  try {
    const accessToken = await decryptDiscordToken(student.encrypted_access_token);
    await addDiscordGuildMember({
      guildId,
      discordUserId: student.discord_user_id,
      accessToken,
    });
    return true;
  } catch {
    return false;
  }
}

export async function provisionClassroomDiscord(client: Client, bindingId: string) {
  const binding = await getBindingContext(bindingId);
  if (!binding) throw new Error('Discord binding not found.');
  const guild = await client.guilds.fetch(binding.guild_id);
  const botUserId = client.user?.id;
  if (!botUserId) throw new Error('Discord client is not ready.');

  const includeClassroomIdSuffix = await shouldSuffixClassroomNamespace(
    binding.guild_id,
    binding.classroom_id,
    binding.classroom_name,
  );
  const classroomNamespace = classroomChannelNamespace(
    binding.classroom_name,
    binding.classroom_id,
    includeClassroomIdSuffix,
  );
  const trainerRows = await getTrainerDiscordIds(binding.classroom_id);
  const trainerDiscordIds = trainerRows.map((row: any) => row.discord_user_id).filter(Boolean);
  await ensureStaffChannel({ guild, binding, classroomNamespace, trainerDiscordIds, botUserId });
  await reconcileStudentCategoryNames(guild, binding.binding_id, classroomNamespace);

  const students = await getActiveLinkedStudents(binding.classroom_id);
  for (const student of students) {
    const expectedChannelName = studentPrivateChannelName(student);
    const overwrites = privateOverwrites(guild, [
      botUserId,
      ...trainerDiscordIds,
      student.discord_user_id,
    ]);
    const existing = await sql`
      SELECT id, channel_id
      FROM mcc_private.classroom_discord_channels
      WHERE binding_id = ${binding.binding_id}
        AND student_id = ${student.student_id}
        AND status = 'active'
      LIMIT 1
    `;
    if (existing.length > 0) {
      const existingChannel = await guild.channels.fetch(existing[0].channel_id).catch(() => null);
      if (existingChannel?.type === ChannelType.GuildText) {
        if ((existingChannel as TextChannel).name !== expectedChannelName) {
          await (existingChannel as TextChannel).setName(
            expectedChannelName,
            'MCC classroom private student channel naming reconciliation',
          ).catch(() => null);
        }
        await (existingChannel as TextChannel).permissionOverwrites.set(
          overwrites,
          'MCC classroom private student channel reconciliation',
        );
        await sql`
          UPDATE mcc_private.classroom_discord_channels
          SET thread_id = ${student.thread_id},
              status = 'active',
              last_reconciled_at = now(),
              updated_at = now()
          WHERE id = ${existing[0].id}
        `;
        continue;
      }
    }

    await tryAddStudentToGuild(binding.guild_id, student);
    const category = await ensureStudentCategory(
      guild,
      binding.binding_id,
      classroomNamespace,
    );
    const channel = await guild.channels.create({
      name: expectedChannelName,
      type: ChannelType.GuildText,
      parent: category.category_id,
      reason: 'MCC classroom private student channel',
      permissionOverwrites: overwrites,
    });

    await sql`
      INSERT INTO mcc_private.classroom_discord_channels (
        binding_id,
        classroom_id,
        thread_id,
        student_id,
        category_id,
        channel_id,
        kind,
        status,
        last_reconciled_at
      )
      VALUES (
        ${binding.binding_id},
        ${binding.classroom_id},
        ${student.thread_id},
        ${student.student_id},
        ${category.id},
        ${channel.id},
        'student_private',
        'active',
        now()
      )
      ON CONFLICT (binding_id, student_id) DO UPDATE SET
        thread_id = EXCLUDED.thread_id,
        category_id = EXCLUDED.category_id,
        channel_id = EXCLUDED.channel_id,
        status = 'active',
        archived_at = null,
        archive_until = null,
        last_reconciled_at = now(),
        updated_at = now()
    `;
  }

  await sql`
    UPDATE mcc_private.classroom_discord_bindings
    SET provisioning_state = 'ready',
        action_required_reason = null,
        last_reconciled_at = now(),
        updated_at = now()
    WHERE id = ${binding.binding_id}
  `;
  await sql`
    UPDATE mcc_private.discord_guild_installations
    SET status = 'installed',
        health = 'healthy',
        last_seen_at = now(),
        updated_at = now()
    WHERE guild_id = ${binding.guild_id}
  `;
}
