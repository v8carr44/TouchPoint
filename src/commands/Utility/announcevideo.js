import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import streamConfig from "../../config/streamNotifications.js";
import { logger } from "../../utils/logger.js";
import { InteractionHelper } from "../../utils/interactionHelper.js";
import { successEmbed, warningEmbed } from "../../utils/embeds.js";
import {
  getYouTubeVideoDetails,
  getYouTubeVideoUrl,
  getBestYouTubeThumbnail
} from "../../utils/youtubeApi.js";

function extractYouTubeVideoId(url) {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
    /youtube\.com\/live\/([^?&]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function buildPingContent() {
  const parts = [];

  if (streamConfig.pingEveryone) {
    parts.push("@everyone");
  }

  if (streamConfig.pingRoleId) {
    parts.push(`<@&${streamConfig.pingRoleId}>`);
  }

  if (streamConfig.pingUserId) {
    parts.push(`<@${streamConfig.pingUserId}>`);
  }

  return parts.join(" ");
}

function buildVideoEmbed(video) {
  const videoId = video.id;
  const title = video?.snippet?.title || "New YouTube Video";
  const description = video?.snippet?.description || "";
  const channelTitle = video?.snippet?.channelTitle || "YouTube";
  const thumbnail = getBestYouTubeThumbnail(video);
  const url = getYouTubeVideoUrl(videoId);

  const embed = new EmbedBuilder()
    .setColor(streamConfig.embeds?.youtubeColor ?? 0xff0000)
    .setTitle("📺 NEW YOUTUBE VIDEO")
    .setDescription(
      `<@${streamConfig.pingUserId}> uploaded a new video!\n\n` +
      `**${title}**\n\n` +
      `${description.slice(0, 250) || "Click below to watch now!"}`
    )
    .addFields({
      name: "Channel",
      value: `\`${channelTitle}\``,
      inline: true
    })
    .setURL(url)
    .setTimestamp(new Date(video?.snippet?.publishedAt || Date.now()))
    .setFooter({
      text: streamConfig.embeds?.footerText || "TouchPoint Live Notifications"
    });

  if (thumbnail) {
    embed.setImage(thumbnail);
  }

  return embed;
}

function buildVideoButton(videoId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Watch on YouTube")
      .setStyle(ButtonStyle.Link)
      .setURL(getYouTubeVideoUrl(videoId))
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName("announcevideo")
    .setDescription("Force announce a YouTube video.")
    .addStringOption(option =>
      option
        .setName("url")
        .setDescription("The YouTube video link")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  category: "utility",

  async execute(interaction) {
    const deferSuccess = await InteractionHelper.safeDefer(interaction, {
      ephemeral: true
    });

    if (!deferSuccess) return;

    try {
      const url = interaction.options.getString("url");
      const videoId = extractYouTubeVideoId(url);

      if (!videoId) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            warningEmbed(
              "Invalid YouTube Link",
              "Please provide a valid YouTube video, Shorts, or livestream link."
            )
          ]
        });
      }

      if (!streamConfig.youtube?.apiKey) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            warningEmbed(
              "Missing API Key",
              "YOUTUBE_API_KEY is missing from your `.env` file."
            )
          ]
        });
      }

      const videos = await getYouTubeVideoDetails({
        apiKey: streamConfig.youtube.apiKey,
        videoIds: [videoId]
      });

      const video = videos?.[0];

      if (!video) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            warningEmbed(
              "Video Not Found",
              "I couldn't find that YouTube video. Check the link and try again."
            )
          ]
        });
      }

      const announcementChannel = await interaction.client.channels
        .fetch(streamConfig.announcementChannelId)
        .catch(() => null);

      if (!announcementChannel || !announcementChannel.isTextBased()) {
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            warningEmbed(
              "Channel Not Found",
              "The announcement channel could not be found or is not text-based."
            )
          ]
        });
      }

      await announcementChannel.send({
        content: buildPingContent(),
        embeds: [buildVideoEmbed(video)],
        components: [buildVideoButton(video.id)],
        allowedMentions: {
          parse: streamConfig.pingEveryone ? ["everyone"] : [],
          roles: streamConfig.pingRoleId ? [streamConfig.pingRoleId] : [],
          users: streamConfig.pingUserId ? [streamConfig.pingUserId] : []
        }
      });

      return InteractionHelper.safeEditReply(interaction, {
        embeds: [
          successEmbed(
            "📺 Video Announced",
            `The video announcement was sent to ${announcementChannel}.`
          )
        ]
      });

    } catch (error) {
      logger.error("Announce video command error:", error);

      return InteractionHelper.safeEditReply(interaction, {
        embeds: [
          warningEmbed(
            "Error",
            "Failed to force announce the YouTube video."
          )
        ]
      });
    }
  }
};
