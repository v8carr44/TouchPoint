import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const ANNOUNCEMENT_CHANNEL_ID = '1519348096566300803';

export default {
  data: new SlashCommandBuilder()
    .setName('unlockdown')
    .setDescription('Remove the server lockdown.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  category: 'moderation',

  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) return;

    let unlockedChannels = 0;
    let failedChannels = 0;

    try {

      for (const channel of interaction.guild.channels.cache.values()) {

        if (channel.id === ANNOUNCEMENT_CHANNEL_ID) continue;

        try {

          // Remove @everyone lockdown permissions
          await channel.permissionOverwrites.edit(
            interaction.guild.roles.everyone,
            {
              SendMessages: null,
              AddReactions: null,
              SendMessagesInThreads: null,
              CreatePublicThreads: null,
              CreatePrivateThreads: null,
              ViewChannel: null
            },
            {
              reason: `Server lockdown removed by ${interaction.user.tag}`
            }
          );

          // Remove lockdown permissions from all non-staff roles
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
              },
              {
                reason: `Server lockdown removed by ${interaction.user.tag}`
              }
            );
          }

          unlockedChannels++;

        } catch (err) {
          failedChannels++;

          logger.error(
            `Failed to unlock channel ${channel.name}:`,
            err
          );
        }
      }

      const announcementChannel =
        interaction.guild.channels.cache.get(
          ANNOUNCEMENT_CHANNEL_ID
        );

      if (
        announcementChannel &&
        announcementChannel.isTextBased()
      ) {
        await announcementChannel.send({
          content:
            `@everyone\n\n` +
            `🔓 **SERVER LOCKDOWN ENDED**\n\n` +
            `The lockdown has been manually removed by ${interaction.user}.\n\n` +
            `You may now resume normal server activity.`
        });
      }

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          successEmbed(
            '🔓 Server Lockdown Removed',
            `Unlocked **${unlockedChannels}** channels.\nFailed: **${failedChannels}**`
          )
        ]
      });

    } catch (error) {
      logger.error('Unlockdown command error:', error);

      await InteractionHelper.safeEditReply(interaction, {
        content: 'Failed to remove the server lockdown.'
      });
    }
  }
};
