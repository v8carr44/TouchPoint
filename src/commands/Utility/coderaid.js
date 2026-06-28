import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType
} from "discord.js";

const activeRaids = new Map();

function padCode(num) {
  return String(num).padStart(4, "0");
}

function splitCodes(players) {
  const codes = Array.from({ length: 10000 }, (_, i) => padCode(i));
  const chunks = new Map();

  players.forEach(player => chunks.set(player.id, []));

  codes.forEach((code, index) => {
    const player = players[index % players.length];
    chunks.get(player.id).push(code);
  });

  return chunks;
}

export default {
  data: new SlashCommandBuilder()
    .setName("coderaid")
    .setDescription("Start a Rust code raid with up to 8 teammates.")
    .addUserOption(option =>
      option.setName("member1").setDescription("Team member 1").setRequired(true)
    )
    .addUserOption(option =>
      option.setName("member2").setDescription("Team member 2").setRequired(false)
    )
    .addUserOption(option =>
      option.setName("member3").setDescription("Team member 3").setRequired(false)
    )
    .addUserOption(option =>
      option.setName("member4").setDescription("Team member 4").setRequired(false)
    )
    .addUserOption(option =>
      option.setName("member5").setDescription("Team member 5").setRequired(false)
    )
    .addUserOption(option =>
      option.setName("member6").setDescription("Team member 6").setRequired(false)
    )
    .addUserOption(option =>
      option.setName("member7").setDescription("Team member 7").setRequired(false)
    ),

  async execute(interaction) {
    const members = [interaction.user];

    for (let i = 1; i <= 7; i++) {
      const user = interaction.options.getUser(`member${i}`);
      if (user && !members.find(m => m.id === user.id)) members.push(user);
    }

    if (members.length > 8) {
      return interaction.reply({
        content: "You can only have up to 8 people in a code raid.",
        ephemeral: true
      });
    }

    const codeChunks = splitCodes(members);
    const progress = new Map();

    members.forEach(user => progress.set(user.id, 0));

    activeRaids.set(interaction.channel.id, {
      owner: interaction.user.id,
      members,
      codeChunks,
      progress,
      paused: new Set(),
      ended: false
    });

    const embed = new EmbedBuilder()
      .setColor(0xff5500)
      .setTitle("🔐 Rust Code Raid Started")
      .setDescription(
        `Code raid started with **${members.length}** member(s).\n\n` +
        members.map(user => `• ${user}`).join("\n")
      )
      .addFields({
        name: "Instructions",
        value:
          "Press **New Code** to get your next code.\n" +
          "Press **Break** to pause your codes.\n" +
          "Press **Found Code** when the code is found.\n" +
          "Press **Cancel Raid** to stop the raid."
      });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("coderaid_new")
        .setLabel("New Code")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId("coderaid_break")
        .setLabel("Break")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId("coderaid_found")
        .setLabel("Found Code")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId("coderaid_cancel")
        .setLabel("Cancel Raid")
        .setStyle(ButtonStyle.Danger)
    );

    const msg = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 1000 * 60 * 60 * 6
    });

    collector.on("collect", async button => {
      const raid = activeRaids.get(interaction.channel.id);

      if (!raid || raid.ended) {
        return button.reply({
          content: "This code raid has ended.",
          ephemeral: true
        });
      }

      const isMember = raid.members.some(m => m.id === button.user.id);

      if (!isMember) {
        return button.reply({
          content: "You are not part of this code raid.",
          ephemeral: true
        });
      }

      if (button.customId === "coderaid_new") {
        if (raid.paused.has(button.user.id)) {
          return button.reply({
            content: "You are currently on break.",
            ephemeral: true
          });
        }

        const codes = raid.codeChunks.get(button.user.id);
        const index = raid.progress.get(button.user.id);

        if (!codes || index >= codes.length) {
          return button.reply({
            content: "You have no more codes assigned.",
            ephemeral: true
          });
        }

        const code = codes[index];
        raid.progress.set(button.user.id, index + 1);

        return button.reply({
          content: `Your next code is: **${code}**`,
          ephemeral: true
        });
      }

      if (button.customId === "coderaid_break") {
        raid.paused.add(button.user.id);

        const remainingCodes = raid.codeChunks
          .get(button.user.id)
          .slice(raid.progress.get(button.user.id));

        raid.codeChunks.set(button.user.id, []);
        raid.progress.set(button.user.id, 0);

        const activeMembers = raid.members.filter(
          m => !raid.paused.has(m.id) && m.id !== button.user.id
        );

        remainingCodes.forEach((code, index) => {
          if (activeMembers.length === 0) return;
          const target = activeMembers[index % activeMembers.length];
          raid.codeChunks.get(target.id).push(code);
        });

        return button.reply({
          content: "You are now on break. Your remaining codes were sent to active teammates.",
          ephemeral: true
        });
      }

      if (button.customId === "coderaid_found") {
        raid.ended = true;
        activeRaids.delete(interaction.channel.id);
        collector.stop();

        return button.reply({
          content: `@everyone\n\n✅ **CODE FOUND!**\n${button.user} found the code!`,
          allowedMentions: { parse: ["everyone"] }
        });
      }

      if (button.customId === "coderaid_cancel") {
        if (button.user.id !== raid.owner) {
          return button.reply({
            content: "Only the raid starter can cancel the raid.",
            ephemeral: true
          });
        }

        raid.ended = true;
        activeRaids.delete(interaction.channel.id);
        collector.stop();

        return button.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff0000)
              .setTitle("❌ Code Raid Cancelled")
              .setDescription(`Cancelled by ${button.user}.`)
          ],
          components: []
        });
      }
    });
  }
};
