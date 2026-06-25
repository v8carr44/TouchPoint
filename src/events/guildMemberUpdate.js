import { Events } from 'discord.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { logger } from '../utils/logger.js';

const BOOSTER_ROLE_ID = '1519692726814376006';

export default {
  name: Events.GuildMemberUpdate,
  once: false,

  async execute(oldMember, newMember) {
    try {
      if (!newMember.guild) return;

      // User started boosting
      if (!oldMember.premiumSince && newMember.premiumSince) {
        if (!newMember.roles.cache.has(BOOSTER_ROLE_ID)) {
          await newMember.roles.add(BOOSTER_ROLE_ID);
        }

        logger.info(
          `${newMember.user.tag} started boosting and was given the booster role.`
        );
      }

      // User stopped boosting
      if (oldMember.premiumSince && !newMember.premiumSince) {
        if (newMember.roles.cache.has(BOOSTER_ROLE_ID)) {
          await newMember.roles.remove(BOOSTER_ROLE_ID);
        }

        logger.info(
          `${newMember.user.tag} stopped boosting and had the booster role removed.`
        );
      }

      // Existing nickname change logging
      if (oldMember.nickname !== newMember.nickname) {
        await logEvent({
          client: newMember.client,
          guildId: newMember.guild.id,
          eventType: EVENT_TYPES.MEMBER_NAME_CHANGE,
          data: {
            title: 'Nickname changed',
            lines: [
              `**User:** ${newMember.user.toString()} (${newMember.user.tag})`,
              `**ID:** \`${newMember.user.id}\``,
              `**Before:** ${oldMember.nickname || '*(no nickname)*'}`,
              `**After:** ${newMember.nickname || '*(no nickname)*'}`
            ],
            thumbnail: newMember.user.displayAvatarURL({ dynamic: true }),
            userId: newMember.user.id
          }
        });
      }

    } catch (error) {
      logger.error('Error in guildMemberUpdate event:', error);
    }
  }
};
