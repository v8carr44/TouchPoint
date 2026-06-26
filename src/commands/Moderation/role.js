import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed, warningEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Give a role to a member.')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to give the role to')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option
        .setName('role')
        .setDescription('Role to give')
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

      if (member.roles.cache.has(role.id)) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [warningEmbed('Error', `${member} already has ${role}.`)]
        });
      }

      if (role.position >= interaction.guild.members.me.roles.highest.position) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [warningEmbed('Error', 'That role is above my highest role.')]
        });
      }

      await member.roles.add(role);

      return InteractionHelper.safeEditReply(interaction, {
        embeds: [
          successEmbed(
            '✅ Role Added',
            `Successfully gave ${role} to ${member}.`
          )
        ]
      });

    } catch (error) {
      logger.error('Role command error:', error);

      return InteractionHelper.safeEditReply(interaction, {
        embeds: [
          warningEmbed('Error', 'Failed to add the role.')
        ]
      });
    }
  }
};
