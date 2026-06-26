import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Remove a role from a member.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to remove the role from')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role to remove')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  category: 'moderation',

  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction);
    if (!deferSuccess) return;

    try {
      const member = interaction.options.getMember('user');
      const role = interaction.options.getRole('role');

      if (!member) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [warningEmbed('Error', 'Member not found.')]
        });
      }

      if (!member.roles.cache.has(role.id)) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [warningEmbed('Error', `${member} doesn't have ${role}.`)]
        });
      }

      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [warningEmbed('Error', 'That role is above my highest role.')]
        });
      }

      await member.roles.remove(role);

      return InteractionHelper.safeEditReply(interaction, {
        embeds: [
          successEmbed(
            '✅ Role Removed',
            `Successfully removed ${role} from ${member}.`
          )
        ]
      });

    } catch (error) {
      logger.error('Remove role command error:', error);

      return InteractionHelper.safeEditReply(interaction, {
        embeds: [
          warningEmbed('Error', 'Failed to remove the role.')
        ]
      });
    }
  }
};
