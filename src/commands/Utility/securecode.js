import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import crypto from "crypto";

function generateSecureCode() {
  const banned = new Set([
    "0000", "1111", "2222", "3333", "4444",
    "5555", "6666", "7777", "8888", "9999",
    "1234", "4321", "1212", "6969", "0420",
    "1337", "2000", "2024", "2025", "2026"
  ]);

  let code;

  do {
    code = String(crypto.randomInt(0, 10000)).padStart(4, "0");
  } while (
    banned.has(code) ||
    /^(\d)\1{3}$/.test(code) ||
    code === [...code].sort().join("") ||
    code === [...code].sort().reverse().join("")
  );

  return code;
}

export default {
  data: new SlashCommandBuilder()
    .setName("securecode")
    .setDescription("Generate a strong 4-digit Rust code."),

  async execute(interaction) {
    const code = generateSecureCode();

    const embed = new EmbedBuilder()
      .setColor(0x00ff88)
      .setTitle("🔐 Secure Rust Code Generated")
      .setDescription(`Your secure 4-digit code is:\n\n# ${code}`)
      .setFooter({
        text: "Avoid common codes like 1234, 0000, 6969, and birth years."
      });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }
};
