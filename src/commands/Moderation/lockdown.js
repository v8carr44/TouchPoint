import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const ANNOUNCEMENT_CHANNEL_ID = '1519348096566300803';

export default {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock the entire server.')
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Lockdown duration in minutes')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the lockdown')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  category: 'moderation',

  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) return;

    const duration = interaction.options.getInteger('duration');
    const reason =
      interaction.options.getString('reason') ||
      'No reason provided';

    const everyoneRole = interaction.guild.roles.everyone;

    let lockedChannels = 0;
    let failedChannels = 0;

    try {
      const announcementChannel =
        interaction.guild.channels.cache.get(
          ANNOUNCEMENT_CHANNEL_ID
        );

      // Send lockdown announcement
      if (
        announcementChannel &&
        announcementChannel.isTextBased()
      ) {
        await announcementChannel.send({
          content:
            `@everyone\n\n` +
            `🔒 **SERVER LOCKDOWN ACTIVATED**\n\n` +
            `The server is entering lockdown for **${duration} minute(s)**.\n\n` +
            `**Reason:** ${reason}\n\n` +
            `Please wait for staff instructions.`
        });
      }

      // Lock all channels except announcement channel
      for (const channel of interaction.guild.channels.cache.values()) {
        if (channel.id === ANNOUNCEMENT_CHANNEL_ID) continue;

        try {
          await channel.permissionOverwrites.edit(
            everyoneRole,
            {
              SendMessages: false,
              AddReactions: false,
              CreatePublicThreads: false,
              CreatePrivateThreads: false,
              SendMessagesInThreads: false
            },
            {
              reason: `${reason} | Locked by ${interaction.user.tag}`
            }
          );

          lockedChannels++;
        } catch (err) {
          failedChannels++;
          logger.error(
            `Failed to lock channel ${channel.name}:`,
            err
          );
        }
      }

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          successEmbed(
            '🔒 Server Lockdown Activated',
            `Locked **${lockedChannels}** channels.\nFailed: **${failedChannels}**\nDuration: **${duration} minute(s)**`
          )
        ]
      });

      // Auto unlock
      setTimeout(async () => {
        try {
          let unlockedChannels = 0;

          for (const channel of interaction.guild.channels.cache.values()) {
            if (channel.id === ANNOUNCEMENT_CHANNEL_ID) continue;

            try {
              await channel.permissionOverwrites.edit(
                everyoneRole,
                {
                  SendMessages: null,
                  AddReactions: null,
                  CreatePublicThreads: null,
                  CreatePrivateThreads: null,
                  SendMessagesInThreads: null
                }
              );

              unlockedChannels++;
            } catch (err) {
              logger.error(
                `Failed to unlock channel ${channel.name}:`,
                err
              );
            }
          }

          if (
            announcementChannel &&
            announcementChannel.isTextBased()
          ) {
            await announcementChannel.send({
              content:
                `🔓 **SERVER LOCKDOWN ENDED**\n\n` +
                `The lockdown has expired.\n` +
                `Unlocked **${unlockedChannels}** channels.`
            });
          }
        } catch (error) {
          logger.error(
            'Automatic lockdown release failed:',
            error
          );
        }
      }, duration * 60 * 1000);

    } catch (error) {
      logger.error('Lockdown command error:', error);

      await InteractionHelper.safeEditReply(interaction, {
        content: 'Failed to perform server lockdown.'
      });
    }
  }
};
