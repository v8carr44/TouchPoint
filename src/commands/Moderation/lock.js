import { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField, ChannelType } from 'discord.js';
import { createEmbed, successEmbed, infoEmbed, warningEmbed } from '../../utils/embeds.js';
import { logEvent } from '../../utils/moderation.js';
import { logger } from '../../utils/logger.js';
import { getColor } from '../../config/bot.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
   data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription("Lock and hide the channel.")
    .addIntegerOption(option =>
        option
            .setName("duration")
            .setDescription("Duration in minutes")
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName("reason")
            .setDescription("Reason for the lockdown")
            .setRequired(false)
    )
.setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  category: "moderation",

  async execute(interaction, config, client) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) {
      logger.warn(`Lock interaction defer failed`, {
        userId: interaction.user.id,
        guildId: interaction.guildId,
        commandName: 'lock'
      });
      return;
    }

const channel = interaction.channel;
const everyoneRole = interaction.guild.roles.everyone;

const duration = interaction.options.getInteger("duration");
const reason =
    interaction.options.getString("reason") ||
    "No reason provided";

    try {
      const currentPermissions = channel.permissionsFor(everyoneRole);
      if (currentPermissions.has(PermissionFlagsBits.SendMessages) === false) {
        return await replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: '${channel} is already locked.' });
      }

await channel.permissionOverwrites.edit(
    everyoneRole,
    {
        SendMessages: false,
        ViewChannel: false,
    },
    {
        reason: `${reason} | Locked by ${interaction.user.tag}`,
    }
);

      const lockEmbed = createEmbed(
        "🔒 Channel Locked (Action Log)",
        `${channel} has been locked down by ${interaction.user} for ${duration} minute(s)..`,
      )
.setColor(getColor('moderation'))
        .addFields(
          { name: "Channel", value: channel.toString(), inline: true },
          {
            name: "Moderator",
            value: `${interaction.user.tag} (${interaction.user.id})`,
            inline: true,
          },
        );

      await logEvent({
        client,
        guild: interaction.guild,
        event: {
          action: "Channel Locked",
          target: channel.toString(),
          executor: `${interaction.user.tag} (${interaction.user.id})`,
          metadata: {
            channelId: channel.id,
            category: channel.parent?.name || 'None',
            moderatorId: interaction.user.id
          }
        }
      });

      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          successEmbed(
            `🔒 **Channel Locked**`,
            `${channel} is now locked down. No one can speak here now.`,
          ),
        ],
      });
    } catch (error) {
      logger.error('Lock command error:', error);
      await replyUserError(interaction, { type: ErrorTypes.PERMISSION, message: 'An unexpected error occurred while trying to lock the channel. Check my permissions (I need \'Manage Channels\').' });
    }
  }
};
