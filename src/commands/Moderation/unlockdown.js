import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const ANNOUNCEMENT_CHANNEL_ID = '1519348096566300803';

export default {
  data: new SlashCommandBuilder()
    .setName('hardunlock')
    .setDescription('Restores all hidden channels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const everyone = interaction.guild.roles.everyone;

      let unlocked = 0;

      for (const channel of interaction.guild.channels.cache.values()) {
        if (!channel.permissionOverwrites) continue;
        if (channel.id === ANNOUNCEMENT_CHANNEL_ID) continue;

        try {
          await channel.permissionOverwrites.edit(everyone, {
            ViewChannel: null
          });

          unlocked++;
        } catch (err) {
          logger.error(`Unlock failed: ${channel.name}`, err);
        }
      }

      await interaction.editReply({
        embeds: [
          successEmbed(
            '🟢 Hard Unlock Complete',
            `Restored ${unlocked} channels`
          )
        ]
      });

    } catch (err) {
      logger.error('Hard unlock error:', err);

      if (interaction.deferred) {
        await interaction.editReply('Failed to unlock server.');
      }
    }
  }
};
