import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import streamConfig from "../config/streamNotifications.js";
import { logger } from "../utils/logger.js";
import {
  buildTwitchUrl,
  formatTwitchThumbnail,
  getTwitchStream,
  logTwitchApiError
} from "../utils/twitchApi.js";
import {
  readNotificationCache,
  updateNotificationCache
} from "../utils/notificationCache.js";

let twitchInterval = null;
let twitchIsChecking = false;
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

function buildTwitchEmbed(stream) {
  const twitchUrl = buildTwitchUrl(streamConfig.twitch.username);
  const thumbnail = formatTwitchThumbnail(stream.thumbnail_url);

  const embed = new EmbedBuilder()
    .setColor(streamConfig.embeds?.twitchColor ?? 0x9146ff)
    .setTitle("🔴 LIVE NOW ON TWITCH")
    .setDescription(
      `<@${streamConfig.pingUserId}> is now live on Twitch!\n\n` +
      `**${stream.title || "Live Stream"}**`
    )
    .addFields(
      {
        name: "Streamer",
        value: `\`${stream.user_name || streamConfig.twitch.username}\``,
        inline: true
      },
      {
        name: "Category",
        value: stream.game_name ? `\`${stream.game_name}\`` : "`Unknown`",
        inline: true
      },
      {
        name: "Viewers",
        value: `\`${stream.viewer_count ?? 0}\``,
        inline: true
      }
    )
    .setURL(twitchUrl)
    .setTimestamp(new Date(stream.started_at || Date.now()))
    .setFooter({
      text: streamConfig.embeds?.footerText || "TouchPoint Live Notifications"
    });

  if (thumbnail) {
    embed.setImage(`${thumbnail}?cache=${Date.now()}`);
  }

  return embed;
}

function buildTwitchButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Watch on Twitch")
      .setStyle(ButtonStyle.Link)
      .setURL(buildTwitchUrl(streamConfig.twitch.username))
  );
}

async function announceTwitchLive(client, stream) {
  const channel = await client.channels
    .fetch(streamConfig.announcementChannelId)
    .catch(() => null);

  if (!channel || !channel.isTextBased()) {
    logger.error("[Twitch Notifier] Announcement channel missing or not text-based.");
    return false;
  }

  await channel.send({
    content: buildPingContent(),
    embeds: [buildTwitchEmbed(stream)],
    components: [buildTwitchButtons()],
    allowedMentions: {
      parse: streamConfig.pingEveryone ? ["everyone"] : [],
      users: streamConfig.pingUserId ? [streamConfig.pingUserId] : []
    }
  });

  return true;
}

async function checkTwitch(client) {
  if (twitchIsChecking) return;
  twitchIsChecking = true;

  try {
    const stream = await getTwitchStream({
      username: streamConfig.twitch.username,
      clientId: streamConfig.twitch.clientId,
      clientSecret: streamConfig.twitch.clientSecret
    });

    const cache = await readNotificationCache();

    if (!stream) {
      if (cache.twitch.wasLive) {
        await updateNotificationCache((current) => {
          current.twitch.wasLive = false;
          current.twitch.lastCheckedAt = new Date().toISOString();
          return current;
        });
      }

      twitchIsChecking = false;
      return;
    }

    const streamId = stream.id;
    const alreadyAnnounced = cache.twitch.lastStreamId === streamId;

    if (isFirstCheck && !streamConfig.twitch.announceIfAlreadyLiveOnStartup) {
      await updateNotificationCache((current) => {
        current.twitch.lastStreamId = streamId;
        current.twitch.wasLive = true;
        current.twitch.lastCheckedAt = new Date().toISOString();
        return current;
      });

      logger.info("[Twitch Notifier] Stream already live on startup. Marked without announcing.");
      twitchIsChecking = false;
      return;
    }

    if (!alreadyAnnounced) {
      const sent = await announceTwitchLive(client, stream);

      if (sent) {
        await updateNotificationCache((current) => {
          current.twitch.lastStreamId = streamId;
          current.twitch.wasLive = true;
          current.twitch.lastCheckedAt = new Date().toISOString();
          return current;
        });

        logger.info(`[Twitch Notifier] Announced Twitch live stream ${streamId}.`);
      }
    } else {
      await updateNotificationCache((current) => {
        current.twitch.wasLive = true;
        current.twitch.lastCheckedAt = new Date().toISOString();
        return current;
      });
    }
  } catch (error) {
    logTwitchApiError("checkTwitch failed", error);
  } finally {
    isFirstCheck = false;
    twitchIsChecking = false;
  }
}

export async function startTwitchNotifier(client) {
  if (twitchInterval) {
    logger.warn("[Twitch Notifier] Already running.");
    return;
  }

  await checkTwitch(client);

  twitchInterval = setInterval(
    () => checkTwitch(client),
    streamConfig.twitch.checkIntervalMs || 60_000
  );

  logger.info("[Twitch Notifier] Started.");
}

export function stopTwitchNotifier() {
  if (twitchInterval) {
    clearInterval(twitchInterval);
    twitchInterval = null;
  }

  logger.info("[Twitch Notifier] Stopped.");
}
