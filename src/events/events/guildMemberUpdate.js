const { Events } = require('discord.js');

// Replace with your Booster role ID
const BOOSTER_ROLE_ID = '1519692726814376006';

// Optional: Replace with a channel ID for boost messages.
// Leave as null to disable messages.
const BOOST_CHANNEL_ID = null;

module.exports = {
    name: Events.GuildMemberUpdate,

    async execute(oldMember, newMember) {
        try {

            // User started boosting
            if (!oldMember.premiumSince && newMember.premiumSince) {

                if (!newMember.roles.cache.has(BOOSTER_ROLE_ID)) {
                    await newMember.roles.add(BOOSTER_ROLE_ID);
                }

                console.log(
                    `[BOOST] ${newMember.user.tag} started boosting.`
                );

                if (BOOST_CHANNEL_ID) {
                    const channel = newMember.guild.channels.cache.get(BOOST_CHANNEL_ID);

                    if (channel) {
                        channel.send(
                            `🎉 Thank you ${newMember} for boosting the server! You have received the Booster role.`
                        ).catch(() => {});
                    }
                }
            }

            // User stopped boosting
            if (oldMember.premiumSince && !newMember.premiumSince) {

                if (newMember.roles.cache.has(BOOSTER_ROLE_ID)) {
                    await newMember.roles.remove(BOOSTER_ROLE_ID);
                }

                console.log(
                    `[BOOST] ${newMember.user.tag} stopped boosting.`
                );

                if (BOOST_CHANNEL_ID) {
                    const channel = newMember.guild.channels.cache.get(BOOST_CHANNEL_ID);

                    if (channel) {
                        channel.send(
                            `❌ ${newMember.user.tag} is no longer boosting the server and has lost the Booster role.`
                        ).catch(() => {});
                    }
                }
            }

        } catch (err) {
            console.error('[BOOST ROLE ERROR]', err);
        }
    }
};
