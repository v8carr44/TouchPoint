const { PermissionsBitField } = require('discord.js');

module.exports = async (client, interaction) => {
    // Permission check
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return client.errNormal({
            error: "You don't have permission to manage messages!",
            type: 'editreply'
        }, interaction);
    }

    const user = interaction.options.getUser('user');

    if (!user) {
        return client.errNormal({
            error: "You must provide a user to purge messages from!",
            type: 'editreply'
        }, interaction);
    }

    try {
        // Fetch last 100 messages in channel
        const messages = await interaction.channel.messages.fetch({ limit: 100 });

        // Filter messages from that user
        const userMessages = messages.filter(m => m.author.id === user.id);

        if (userMessages.size === 0) {
            return client.errNormal({
                error: "No messages found from that user in the last 100 messages.",
                type: 'editreply'
            }, interaction);
        }

        // Bulk delete (Discord only allows <14 day messages)
        await interaction.channel.bulkDelete(userMessages, true);

        return client.succNormal({
            text: `Deleted ${userMessages.size} messages from ${user.username}.`,
            fields: [
                {
                    name: "👤 User",
                    value: `${user.tag}`,
                    inline: true
                }
            ],
            type: 'editreply'
        }, interaction);

    } catch (err) {
        console.error(err);

        return client.errNormal({
            error: "Failed to delete messages (they may be older than 14 days).",
            type: 'editreply'
        }, interaction);
    }
};
