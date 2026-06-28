import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import streamConfig from "../config/streamNotifications.js";
import { logger } from "../utils/logger.js";
import {
  getBestYouTubeThumbnail,
  getLatestYouTubeItems,
  getYouTubeVideoDetails,
  getYouTubeVideoUrl,
  isCurrentlyLive,
  isYouTubeLiveVideo,
  logYouTubeApiError,
  resolveYouTubeChannelId
} from "../utils/youtubeApi.js";
import {
  hasYouTubeVideoBeenAnnounced,
  markYouTubeVideoAnnounced,
  readNotificationCache,
  updateNotificationCache
} from "../utils/notificationCache.js";

let youtubeInterval = null;
let youtubeIsChecking = false;
let resolvedChannelId = null;
let isFirstCheck = true;

function buildPingContent() {
  const parts = [];

  if (streamConfig.pingEveryone) {
    parts.push("@everyone");
  }

  if (streamConfig.pingUserId) {
    parts.push(`<@${streamConfig.pingUserId}>`);
  }

  return parts.join(" ");
}

function buildYouTubeEmbed(video, type) {
  const videoId = video.id;
  const url = getYouTubeVideoUrl(videoId);
  const thumbnail = getBestYouTubeThumbnail(video);
  const title = video?.snippet?.title || "New YouTube Video";

  const isLive = type === "live";

  const embed = new EmbedBuilder()
    .setColor(streamConfig.embeds?.youtubeColor ?? 0xff0000)
    .setTitle(isLive ? "🔴 LIVE NOW ON YOUTUBE" : "📺 NEW YOUTUBE VIDEO")
    .setDescription(
      isLive
        ? `<@${streamConfig.pingUserId}> is now live on YouTube!\n\n**${title}**`
        : `<@${streamConfig.pingUserId}> uploaded a new YouTube video!\n\n**${title}**`
    )
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

function buildYouTubeButtons(videoId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Watch on YouTube")
      .setStyle(ButtonStyle.Link)
      .setURL(getYouTubeVideoUrl(videoId))
  );
}

async function announceYouTube(client, video, type) {
  const channel = await client.channels
    .fetch(streamConfig.announcementChannelId)
    .catch(() => null);

  if (!channel || !channel.isTextBased()) {
    logger.error("[YouTube Notifier] Announcement channel missing or not text-based.");
    return false;
  }

  await channel.send({
    content: buildPingContent(),
    embeds: [buildYouTubeEmbed(video, type)],
    components: [buildYouTubeButtons(video.id)],
    allowedMentions: {
      parse: streamConfig.pingEveryone ? ["everyone"] : [],
      users: streamConfig.pingUserId ? [streamConfig.pingUserId] : []
    }
  });

  return true;
}

async function resolveChannelIdOnce() {
  if (resolvedChannelId) return resolvedChannelId;

  const cache = await readNotificationCache();

  if (cache.youtube.channelId) {
    resolvedChannelId = cache.youtube.channelId;
    return resolvedChannelId;
  }

  resolvedChannelId = await resolveYouTubeChannelId({
    apiKey: streamConfig.youtube.apiKey,
    channelHandle: streamConfig.youtube.channelHandle,
    channelId: streamConfig.youtube.channelId
  });

  await updateNotificationCache((current) => {
    current.youtube.channelId = resolvedChannelId;
    return current;
  });

  return resolvedChannelId;
}

async function checkYouTube(client) {
  if (youtubeIsChecking) return;
  youtubeIsChecking = true;

  try {
    const channelId = await resolveChannelIdOnce();

    const searchItems = await getLatestYouTubeItems({
      apiKey: streamConfig.youtube.apiKey,
      channelId,
      maxResults: 5
    });

    const videoIds = searchItems
      .map((item) => item?.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      youtubeIsChecking = false;
      return;
    }

    const videos = await getYouTubeVideoDetails({
      apiKey: streamConfig.youtube.apiKey,
      videoIds
    });

    // Newest first
    videos.sort((a, b) => {
      return new Date(b?.snippet?.publishedAt || 0) - new Date(a?.snippet?.publishedAt || 0);
    });

    if (isFirstCheck && !streamConfig.youtube.announceIfAlreadyLiveOnStartup) {
      for (const video of videos) {
        await markYouTubeVideoAnnounced(video.id);
      }

      logger.info("[YouTube Notifier] Latest videos marked on startup without announcing.");
      youtubeIsChecking = false;
      return;
    }

    for (const video of videos) {
      const videoId = video.id;

      if (await hasYouTubeVideoBeenAnnounced(videoId)) {
        continue;
      }

      const live = isYouTubeLiveVideo(video);
      const currentlyLive = isCurrentlyLive(video);

      if (live && !streamConfig.youtube.announceLivestreams) {
        await markYouTubeVideoAnnounced(videoId);
        continue;
      }

      if (!live && !streamConfig.youtube.announceUploads) {
        await markYouTubeVideoAnnounced(videoId);
        continue;
      }

      const type = currentlyLive || live ? "live" : "upload";

      const sent = await announceYouTube(client, video, type);

      if (sent) {
        await markYouTubeVideoAnnounced(videoId);
        logger.info(`[YouTube Notifier] Announced YouTube ${type}: ${videoId}`);
      }
    }

    await updateNotificationCache((current) => {
      current.youtube.lastCheckedAt = new Date().toISOString();
      return current;
    });
  } catch (error) {
    logYouTubeApiError("checkYouTube failed", error);
  } finally {
    isFirstCheck = false;
    youtubeIsChecking = false;
  }
}

export async function startYouTubeNotifier(client) {
  if (youtubeInterval) {
    logger.warn("[YouTube Notifier] Already running.");
    return;
  }

  await checkYouTube(client);

  youtubeInterval = setInterval(
    () => checkYouTube(client),
    streamConfig.youtube.checkIntervalMs || 120_000
  );

  logger.info("[YouTube Notifier] Started.");
}

export function stopYouTubeNotifier() {
  if (youtubeInterval) {
    clearInterval(youtubeInterval);
    youtubeInterval = null;
  }

  logger.info("[YouTube Notifier] Stopped.");
}
