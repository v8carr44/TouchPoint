import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

const ANNOUNCEMENT_CHANNEL_ID = '1519348096566300803';

export default {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement to the announcements channel.')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('The announcement message')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  category: 'moderation',

  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) return;

    try {
      const message = interaction.options.getString('message');

      const channel = interaction.guild.channels.cache.get(
        ANNOUNCEMENT_CHANNEL_ID
      );

      if (!channel || !channel.isTextBased()) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            warningEmbed(
              'Error',
              'The announcements channel could not be found.'
            )
          ]
        });
      }

      await channel.send({
        content:
`@everyone

# 📢 Announcement from Ownership

${message}

- ${interaction.user}`
      });

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          successEmbed(
            '📢 Announcement Sent',
            `Your announcement has been sent to ${channel}.`
          )
        ]
      });

    } catch (error) {
      logger.error('Announce command error:', error);

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          warningEmbed(
            'Error',
            'Failed to send the announcement.'
          )
        ]
      });
    }
  }
};
