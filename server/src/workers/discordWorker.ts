import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  ModalBuilder,
  Partials,
  REST,
  Routes,
  TextBasedChannel,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {
  assertDiscordBotConfigured,
  getDiscordBotToken,
  getDiscordClientId,
  getDiscordDevGuildId,
  isDiscordIntegrationEnabled,
} from '../utils/discordConfig';
import {
  claimDiscordDeliveryJobs,
  markDiscordDeliveryJobDelivered,
  markDiscordDeliveryJobFailed,
  type DiscordDeliveryJob,
} from '../utils/discordDeliveryQueue';
import {
  discordBridgeErrorCode,
  handleDiscordMessageCreate,
  handleDiscordMessageDelete,
  handleDiscordMessageUpdate,
} from '../utils/discordThreadBridge';
import { provisionClassroomDiscord } from '../utils/discordProvisioning';
import {
  autocompleteDiscordAssignOption,
  executeDiscordMccCommand,
  prepareDiscordAssignModal,
  prepareDiscordCheckinModal,
  prepareDiscordReviewModal,
  prepareDiscordSubmitModal,
  submitDiscordAssign,
  submitDiscordCheckin,
  submitDiscordReview,
  submitDiscordSolution,
} from '../utils/discordCommandHandlers';

const workerId = `discord-worker:${crypto.randomUUID()}`;
const QUEUE_INTERVAL_MS = 5000;

const mccSubcommands = [
  'today',
  'schedule',
  'problems',
  'resources',
  'status',
  'checkin',
  'submit',
  'pending',
  'review',
  'assign',
  'reminders',
  'roster',
  'reconcile',
  'help',
];

function buildMccSubcommandOption(name: string) {
  if (name === 'assign') {
    return {
      type: ApplicationCommandOptionType.Subcommand,
      name,
      description: 'Assign a live problem to a student or team.',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'class_ref',
          description: 'Class/session to attach this problem to.',
          required: true,
          autocomplete: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'target_ref',
          description: 'Student or team to receive the problem.',
          required: true,
          autocomplete: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'platform',
          description: 'Problem platform.',
          required: true,
          choices: [
            { name: 'Codeforces', value: 'codeforces' },
            { name: 'CodeChef', value: 'codechef' },
            { name: 'AtCoder', value: 'atcoder' },
            { name: 'Custom', value: 'custom' },
          ],
        },
      ],
    };
  }

  return {
    type: ApplicationCommandOptionType.Subcommand,
    name,
    description: `MCC ${name}`,
  };
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(getDiscordBotToken());
  const commandBody = [
    {
      name: 'mcc',
      description: 'Use MCC classroom tools from Discord.',
      dm_permission: false,
      options: mccSubcommands.map(buildMccSubcommandOption),
    },
  ];
  const devGuildId = getDiscordDevGuildId();
  const route = devGuildId
    ? Routes.applicationGuildCommands(getDiscordClientId(), devGuildId)
    : Routes.applicationCommands(getDiscordClientId());
  await rest.put(route, { body: commandBody });
}

function messageAttachments(message: any) {
  return [...message.attachments.values()].map((attachment: any) => ({
    id: attachment.id,
    name: attachment.name || `discord-${attachment.id}`,
    contentType: attachment.contentType || null,
    size: Number(attachment.size || 0),
    url: attachment.url,
  }));
}

async function maybeReply(channel: TextBasedChannel | null, content: string) {
  if (!channel?.isSendable()) return;
  await channel.send({ content, allowedMentions: { parse: [] } }).catch(() => null);
}

function buildCheckinModal(input: { customId: string; title: string }) {
  const modal = new ModalBuilder()
    .setCustomId(input.customId)
    .setTitle(input.title);

  const goals = new TextInputBuilder()
    .setCustomId('goals')
    .setLabel('Goals for this period')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000)
    .setPlaceholder('What are you planning to work on?');

  const completedWork = new TextInputBuilder()
    .setCustomId('completed_work')
    .setLabel('Completed work')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('What did you finish?');

  const blockers = new TextInputBuilder()
    .setCustomId('blockers')
    .setLabel('Blockers')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('What is stuck or confusing?');

  const nextSteps = new TextInputBuilder()
    .setCustomId('next_steps')
    .setLabel('Next steps')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('What will you do next?');

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(goals),
    new ActionRowBuilder<TextInputBuilder>().addComponents(completedWork),
    new ActionRowBuilder<TextInputBuilder>().addComponents(blockers),
    new ActionRowBuilder<TextInputBuilder>().addComponents(nextSteps),
  );
  return modal;
}

function buildSubmitModal(input: { customId: string; title: string }) {
  const modal = new ModalBuilder()
    .setCustomId(input.customId)
    .setTitle(input.title);

  const reference = new TextInputBuilder()
    .setCustomId('reference')
    .setLabel('Problem Ref from /mcc problems')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('live:1234abcd or topic:1234abcd:5678ef90');

  const solutionLink = new TextInputBuilder()
    .setCustomId('solution_link')
    .setLabel('Solution link')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(1200)
    .setPlaceholder('https://...');

  const solutionCode = new TextInputBuilder()
    .setCustomId('solution_code')
    .setLabel('Code')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(4000)
    .setPlaceholder('Paste code here, or leave blank if the link has your solution.');

  const submissionNotes = new TextInputBuilder()
    .setCustomId('submission_notes')
    .setLabel('Notes for trainer')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Optional context, tradeoffs, or where you got stuck.');

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(reference),
    new ActionRowBuilder<TextInputBuilder>().addComponents(solutionLink),
    new ActionRowBuilder<TextInputBuilder>().addComponents(solutionCode),
    new ActionRowBuilder<TextInputBuilder>().addComponents(submissionNotes),
  );
  return modal;
}

function buildReviewModal(input: { customId: string; title: string }) {
  const modal = new ModalBuilder()
    .setCustomId(input.customId)
    .setTitle(input.title);

  const reference = new TextInputBuilder()
    .setCustomId('reference')
    .setLabel('Review Ref from /mcc pending')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100)
    .setPlaceholder('live:1234abcd or topic:5678ef90');

  const action = new TextInputBuilder()
    .setCustomId('action')
    .setLabel('Action')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(40)
    .setPlaceholder('approve or needs_revision');

  const feedback = new TextInputBuilder()
    .setCustomId('feedback')
    .setLabel('Feedback for student')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(1000)
    .setPlaceholder('Optional notes. These appear in the website thread.');

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(reference),
    new ActionRowBuilder<TextInputBuilder>().addComponents(action),
    new ActionRowBuilder<TextInputBuilder>().addComponents(feedback),
  );
  return modal;
}

function buildAssignModal(input: { customId: string; title: string }) {
  const modal = new ModalBuilder()
    .setCustomId(input.customId)
    .setTitle(input.title);

  const problemLink = new TextInputBuilder()
    .setCustomId('problem_link')
    .setLabel('Problem link')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(1200)
    .setPlaceholder('https://codeforces.com/problemset/problem/4/A');

  const dueAt = new TextInputBuilder()
    .setCustomId('due_at')
    .setLabel('Due date/time')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(120)
    .setPlaceholder('Optional: 2026-08-15T20:00:00+06:00');

  const timerMinutes = new TextInputBuilder()
    .setCustomId('timer_minutes')
    .setLabel('Timer minutes')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(20)
    .setPlaceholder('Optional: 90');

  const difficulty = new TextInputBuilder()
    .setCustomId('difficulty')
    .setLabel('Difficulty')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(80)
    .setPlaceholder('Optional: 1200, Medium, Div2 A');

  const tags = new TextInputBuilder()
    .setCustomId('tags')
    .setLabel('Tags')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(240)
    .setPlaceholder('Optional: dp, greedy, implementation');

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(problemLink),
    new ActionRowBuilder<TextInputBuilder>().addComponents(dueAt),
    new ActionRowBuilder<TextInputBuilder>().addComponents(timerMinutes),
    new ActionRowBuilder<TextInputBuilder>().addComponents(difficulty),
    new ActionRowBuilder<TextInputBuilder>().addComponents(tags),
  );
  return modal;
}

function parseAssignCustomId(customId: string) {
  const parts = customId.split(':');
  if (
    parts.length !== 8
    || parts[0] !== 'mcc'
    || parts[1] !== 'assign'
    || parts[3] !== 'class'
    || !['student', 'team'].includes(parts[5])
  ) {
    return null;
  }
  return {
    sourceInteractionId: parts[2],
    classRef: `class:${parts[4]}`,
    targetRef: `${parts[5]}:${parts[6]}`,
    platform: parts[7],
  };
}

async function processJob(client: Client, job: DiscordDeliveryJob) {
  if (job.kind === 'provision_classroom' || job.kind === 'reconcile_classroom') {
    const bindingId = job.binding_id || job.payload?.bindingId;
    if (!bindingId) throw new Error('Discord binding is missing from job.');
    await provisionClassroomDiscord(client, bindingId);
    return;
  }

  if (job.kind === 'send_notification') {
    const channelId = String(job.payload?.channelId || '');
    const content = String(job.payload?.content || '').slice(0, 1900);
    if (!channelId || !content) throw new Error('Notification job is missing channelId or content.');
    const channel = await client.channels.fetch(channelId);
    await maybeReply(channel as TextBasedChannel, content);
    return;
  }

  throw new Error(`Unsupported Discord job kind: ${job.kind}`);
}

async function processQueue(client: Client) {
  const jobs = await claimDiscordDeliveryJobs(workerId, 5);
  for (const job of jobs) {
    try {
      await processJob(client, job);
      await markDiscordDeliveryJobDelivered(job.id);
    } catch (error: any) {
      await markDiscordDeliveryJobFailed({
        jobId: job.id,
        errorCode: discordBridgeErrorCode(error),
        retryAfterMs: error?.retryAfterMs,
      });
    }
  }
}

export async function startDiscordWorker() {
  if (!isDiscordIntegrationEnabled()) {
    console.log('[discord-worker] Discord integration disabled; worker exiting.');
    return;
  }
  assertDiscordBotConfigured();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
    allowedMentions: { parse: [] },
  });

  client.once(Events.ClientReady, async () => {
    console.log(`[discord-worker] Ready as ${client.user?.tag || client.user?.id || 'bot'}`);
    await registerCommands().catch((error) => {
      console.error('[discord-worker] slash command registration failed', {
        code: discordBridgeErrorCode(error),
      });
    });
    await processQueue(client).catch((error) => {
      console.error('[discord-worker] initial queue processing failed', {
        code: discordBridgeErrorCode(error),
      });
    });
    setInterval(() => {
      void processQueue(client).catch((error) => {
        console.error('[discord-worker] queue processing failed', {
          code: discordBridgeErrorCode(error),
        });
      });
    }, QUEUE_INTERVAL_MS);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (!message.guildId || message.author.bot || message.webhookId) return;
    const result = await handleDiscordMessageCreate({
      guildId: message.guildId,
      channelId: message.channelId,
      discordMessageId: message.id,
      discordUserId: message.author.id,
      content: message.content || '',
      attachments: messageAttachments(message),
    }).catch((error) => ({ error: error?.message || 'Could not sync Discord message.', status: 500 }));

    if ('error' in result && Number(result.status || 500) < 500) {
      await message.reply({
        content: result.error,
        allowedMentions: { parse: [] },
      }).catch(() => null);
    }
  });

  client.on(Events.MessageUpdate, async (_oldMessage, newMessage) => {
    const message = newMessage.partial ? await newMessage.fetch().catch(() => null) : newMessage;
    if (!message?.guildId || message.author?.bot || message.webhookId) return;
    await handleDiscordMessageUpdate({
      guildId: message.guildId,
      channelId: message.channelId,
      discordMessageId: message.id,
      discordUserId: message.author?.id || '',
      content: message.content || '',
      attachments: messageAttachments(message),
    }).catch(() => null);
  });

  client.on(Events.MessageDelete, async (message) => {
    if (!message.guildId) return;
    await handleDiscordMessageDelete({
      guildId: message.guildId,
      channelId: message.channelId,
      discordMessageId: message.id,
      discordUserId: message.author?.id || '',
    }).catch(() => null);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isModalSubmit() && interaction.customId.startsWith('mcc:checkin:')) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);
      const result = await submitDiscordCheckin({
        guildId: interaction.guildId || '',
        channelId: interaction.channelId || '',
        interactionId: interaction.id,
        discordUserId: interaction.user.id,
        commandName: 'mcc',
        subcommand: 'checkin',
      }, {
        goals: interaction.fields.getTextInputValue('goals'),
        completedWork: interaction.fields.getTextInputValue('completed_work'),
        blockers: interaction.fields.getTextInputValue('blockers'),
        nextSteps: interaction.fields.getTextInputValue('next_steps'),
      });
      await interaction.editReply({
        content: result.content,
        allowedMentions: { parse: [] },
      }).catch(() => null);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('mcc:submit:')) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);
      const result = await submitDiscordSolution({
        guildId: interaction.guildId || '',
        channelId: interaction.channelId || '',
        interactionId: interaction.id,
        discordUserId: interaction.user.id,
        commandName: 'mcc',
        subcommand: 'submit',
      }, {
        reference: interaction.fields.getTextInputValue('reference'),
        solutionLink: interaction.fields.getTextInputValue('solution_link'),
        solutionCode: interaction.fields.getTextInputValue('solution_code'),
        submissionNotes: interaction.fields.getTextInputValue('submission_notes'),
      });
      await interaction.editReply({
        content: result.content,
        allowedMentions: { parse: [] },
      }).catch(() => null);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('mcc:review:')) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);
      const result = await submitDiscordReview({
        guildId: interaction.guildId || '',
        channelId: interaction.channelId || '',
        interactionId: interaction.id,
        discordUserId: interaction.user.id,
        commandName: 'mcc',
        subcommand: 'review',
      }, {
        reference: interaction.fields.getTextInputValue('reference'),
        action: interaction.fields.getTextInputValue('action'),
        feedback: interaction.fields.getTextInputValue('feedback'),
      });
      await interaction.editReply({
        content: result.content,
        allowedMentions: { parse: [] },
      }).catch(() => null);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('mcc:assign:')) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);
      const selection = parseAssignCustomId(interaction.customId);
      if (!selection) {
        await interaction.editReply({
          content: 'That assign modal expired or could not be read. Run `/mcc assign` again.',
          allowedMentions: { parse: [] },
        }).catch(() => null);
        return;
      }

      const result = await submitDiscordAssign({
        guildId: interaction.guildId || '',
        channelId: interaction.channelId || '',
        interactionId: interaction.id,
        discordUserId: interaction.user.id,
        commandName: 'mcc',
        subcommand: 'assign',
      }, {
        problemLink: interaction.fields.getTextInputValue('problem_link'),
        dueAt: interaction.fields.getTextInputValue('due_at'),
        timerMinutes: interaction.fields.getTextInputValue('timer_minutes'),
        difficulty: interaction.fields.getTextInputValue('difficulty'),
        tags: interaction.fields.getTextInputValue('tags'),
      }, selection);
      await interaction.editReply({
        content: result.content,
        allowedMentions: { parse: [] },
      }).catch(() => null);
      return;
    }

    if (interaction.isAutocomplete() && interaction.commandName === 'mcc') {
      const subcommand = interaction.options.getSubcommand(false) || 'help';
      if (subcommand !== 'assign') {
        await interaction.respond([]).catch(() => null);
        return;
      }
      const focused = interaction.options.getFocused(true);
      const choices = await autocompleteDiscordAssignOption({
        guildId: interaction.guildId || '',
        channelId: interaction.channelId || '',
        interactionId: interaction.id,
        discordUserId: interaction.user.id,
        commandName: interaction.commandName,
        subcommand,
      }, {
        name: focused.name,
        value: String(focused.value || ''),
      }).catch(() => []);
      await interaction.respond(choices.slice(0, 25)).catch(() => null);
      return;
    }

    if (!interaction.isChatInputCommand() || interaction.commandName !== 'mcc') return;
    const subcommand = interaction.options.getSubcommand(false) || 'help';
    if (subcommand === 'checkin') {
      const prepared = await prepareDiscordCheckinModal({
        guildId: interaction.guildId || '',
        channelId: interaction.channelId || '',
        interactionId: interaction.id,
        discordUserId: interaction.user.id,
        commandName: interaction.commandName,
        subcommand,
      });
      if (prepared.ok) {
        await interaction.showModal(buildCheckinModal(prepared));
      } else {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [] },
          content: prepared.content,
        }).catch(() => null);
      }
      return;
    }

    if (subcommand === 'submit') {
      const prepared = await prepareDiscordSubmitModal({
        guildId: interaction.guildId || '',
        channelId: interaction.channelId || '',
        interactionId: interaction.id,
        discordUserId: interaction.user.id,
        commandName: interaction.commandName,
        subcommand,
      });
      if (prepared.ok) {
        await interaction.showModal(buildSubmitModal(prepared));
      } else {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [] },
          content: prepared.content,
        }).catch(() => null);
      }
      return;
    }

    if (subcommand === 'review') {
      const prepared = await prepareDiscordReviewModal({
        guildId: interaction.guildId || '',
        channelId: interaction.channelId || '',
        interactionId: interaction.id,
        discordUserId: interaction.user.id,
        commandName: interaction.commandName,
        subcommand,
      });
      if (prepared.ok) {
        await interaction.showModal(buildReviewModal(prepared));
      } else {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [] },
          content: prepared.content,
        }).catch(() => null);
      }
      return;
    }

    if (subcommand === 'assign') {
      const prepared = await prepareDiscordAssignModal({
        guildId: interaction.guildId || '',
        channelId: interaction.channelId || '',
        interactionId: interaction.id,
        discordUserId: interaction.user.id,
        commandName: interaction.commandName,
        subcommand,
      }, {
        classRef: interaction.options.getString('class_ref'),
        targetRef: interaction.options.getString('target_ref'),
        platform: interaction.options.getString('platform'),
      });
      if (prepared.ok) {
        await interaction.showModal(buildAssignModal(prepared));
      } else {
        await interaction.reply({
          flags: MessageFlags.Ephemeral,
          allowedMentions: { parse: [] },
          content: prepared.content,
        }).catch(() => null);
      }
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);
    const result = await executeDiscordMccCommand({
      guildId: interaction.guildId || '',
      channelId: interaction.channelId || '',
      interactionId: interaction.id,
      discordUserId: interaction.user.id,
      commandName: interaction.commandName,
      subcommand,
    });
    await interaction.editReply({
      content: result.content,
      allowedMentions: { parse: [] },
    }).catch(() => null);
  });

  await client.login(getDiscordBotToken());
}

if (import.meta.main) {
  void startDiscordWorker().catch((error) => {
    console.error('[discord-worker] failed to start', {
      code: discordBridgeErrorCode(error),
    });
    process.exit(1);
  });
}
