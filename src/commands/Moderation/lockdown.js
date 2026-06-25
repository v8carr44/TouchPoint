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

    let lockedChannels = 0;
    let failedChannels = 0;

    try {
      const announcementChannel =
        interaction.guild.channels.cache.get(
          ANNOUNCEMENT_CHANNEL_ID
        );

      // Announcement
      if (
        announcementChannel &&
        announcementChannel.isTextBased()
      ) {
        await announcementChannel.send({
          content:
            `@everyone\n\n` +
            `🔒 **SERVER LOCKDOWN ACTIVATED**\n\n` +
            `Duration: **${duration} minute(s)**\n` +
            `Reason: **${reason}**\n\n` +
            `Please wait for staff instructions.`
        });
      }

      for (const channel of interaction.guild.channels.cache.values()) {
        if (channel.id === ANNOUNCEMENT_CHANNEL_ID) continue;

        try {
          // Lock @everyone
          await channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
              SendMessages: false,
              AddReactions: false,
              SendMessagesInThreads: false,
              CreatePublicThreads: false,
              CreatePrivateThreads: false
            },
            {
              reason: `${reason} | Locked by ${interaction.user.tag}`
            }
          );

          // Lock all non-staff roles
          for (const role of interaction.guild.roles.cache.values()) {

            if (role.id === interaction.guild.roles.everyone.id) {
              continue;
            }

            if (
              role.permissions.has(PermissionFlagsBits.Administrator) ||
              role.permissions.has(PermissionFlagsBits.ManageGuild)
            ) {
              continue;
            }

            await channel.permissionOverwrites.edit(
              role,
              {
                SendMessages: false,
                AddReactions: false,
                SendMessagesInThreads: false,
                CreatePublicThreads: false,
                CreatePrivateThreads: false,
                ViewChannel: false
              },
              {
                reason: `${reason} | Locked by ${interaction.user.tag}`
              }
            );
          }

          lockedChannels++;

        } catch (err) {
          failedChannels++;
          logger.error(
            `Failed to lock ${channel.name}:`,
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
                interaction.guild.roles.everyone,
                {
                  SendMessages: null,
                  AddReactions: null,
                  SendMessagesInThreads: null,
                  CreatePublicThreads: null,
                  CreatePrivateThreads: null,
                  ViewChannel: null
                }
              );

              for (const role of interaction.guild.roles.cache.values()) {

                if (role.id === interaction.guild.roles.everyone.id) {
                  continue;
                }

                if (
                  role.permissions.has(PermissionFlagsBits.Administrator) ||
                  role.permissions.has(PermissionFlagsBits.ManageGuild)
                ) {
                  continue;
                }

                await channel.permissionOverwrites.edit(
                  role,
                  {
                    SendMessages: null,
                    AddReactions: null,
                    SendMessagesInThreads: null,
                    CreatePublicThreads: null,
                    CreatePrivateThreads: null,
                    ViewChannel: null
                  }
                );
              }

              unlockedChannels++;

            } catch (err) {
              logger.error(
                `Failed to unlock ${channel.name}:`,
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
                `@everyone\n\n` +
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
