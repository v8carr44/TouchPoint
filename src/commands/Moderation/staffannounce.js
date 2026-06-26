import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

const STAFF_ANNOUNCEMENT_CHANNEL_ID = '1520031495740199052';

export default {
  data: new SlashCommandBuilder()
    .setName('staffannounce')
    .setDescription('Send an announcement to the staff announcements channel.')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('The staff announcement message')
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
        STAFF_ANNOUNCEMENT_CHANNEL_ID
      );

      if (!channel || !channel.isTextBased()) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            warningEmbed(
              'Error',
              'The staff announcements channel could not be found.'
            )
          ]
        });
      }

      await channel.send({
        content:
`@everyone

# 📢 Staff Announcement

${message}

━━━━━━━━━━━━━━━━━━━━━━
**Sent by:** ${interaction.user}
**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
      });

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          successEmbed(
            '📢 Staff Announcement Sent',
            `Your announcement has been sent to ${channel}.`
          )
        ]
      });

    } catch (error) {
      logger.error('Staff announce command error:', error);

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          warningEmbed(
            'Error',
            'Failed to send the staff announcement.'
          )
        ]
      });
    }
  }
};
