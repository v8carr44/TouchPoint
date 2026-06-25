import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const ANNOUNCEMENT_CHANNEL_ID = '1519348096566300803';

export default {
  data: new SlashCommandBuilder()
    .setName('hardlockdown')
    .setDescription('Hides all channels from everyone.')
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Minutes')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const duration = interaction.options.getInteger('duration');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      const everyone = interaction.guild.roles.everyone;

      const announcement = interaction.guild.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID);

      // ANNOUNCEMENT
      if (announcement?.isTextBased()) {
        await announcement.send({
          content:
            `@everyone 🔴 **HARD LOCKDOWN ACTIVATED**\n\n` +
            `Server hidden for **${duration} minute(s)**\n` +
            `Reason: **${reason}**`
        });
      }

      let locked = 0;

      // HARD LOCK (HIDE ALL CHANNELS)
      for (const channel of interaction.guild.channels.cache.values()) {
        if (!channel.permissionOverwrites) continue;
        if (channel.id === ANNOUNCEMENT_CHANNEL_ID) continue;

        try {
          await channel.permissionOverwrites.edit(everyone, {
            ViewChannel: false
          });

          locked++;
        } catch (err) {
          logger.error(`Hard lock failed: ${channel.name}`, err);
        }
      }

      await interaction.editReply({
        embeds: [
          successEmbed(
            '🔴 Hard Lockdown Enabled',
            `Hidden ${locked} channels for ${duration} minute(s)`
          )
        ]
      });

      // AUTO UNLOCK
      setTimeout(async () => {
        try {
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

          if (announcement?.isTextBased()) {
            await announcement.send(
              `🟢 **HARD LOCKDOWN ENDED**\nUnlocked ${unlocked} channels.`
            );
          }

        } catch (err) {
          logger.error('Auto unlock error:', err);
        }
      }, duration * 60000);

    } catch (err) {
      logger.error('Hard lockdown error:', err);

      if (interaction.deferred) {
        await interaction.editReply('Failed to execute hard lockdown.');
      }
    }
  }
};
