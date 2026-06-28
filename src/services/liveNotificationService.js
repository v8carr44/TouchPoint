import streamConfig from "../config/streamNotifications.js";
import { logger, startupLog } from "../utils/logger.js";
import { startTwitchNotifier, stopTwitchNotifier } from "./twitchNotifier.js";
import { startYouTubeNotifier, stopYouTubeNotifier } from "./youtubeNotifier.js";

let serviceState = {
  started: false
};

function validateStreamConfig() {
  const errors = [];
  const warnings = [];

  if (!streamConfig.enabled) {
    warnings.push("Live notifications are disabled in streamNotifications.js.");
  }

  if (!streamConfig.announcementChannelId) {
    errors.push("Missing announcementChannelId in src/config/streamNotifications.js.");
  }

  if (streamConfig.twitch?.enabled !== false) {
    if (!streamConfig.twitch?.username) {
      warnings.push("Missing Twitch username.");
    }

    if (!streamConfig.twitch?.clientId) {
      warnings.push("Missing TWITCH_CLIENT_ID in .env.");
    }

    if (!streamConfig.twitch?.clientSecret) {
      warnings.push("Missing TWITCH_CLIENT_SECRET in .env.");
    }
  }

  if (streamConfig.youtube?.enabled !== false) {
    if (!streamConfig.youtube?.apiKey) {
      warnings.push("Missing YOUTUBE_API_KEY in .env.");
    }

    if (!streamConfig.youtube?.channelHandle && !streamConfig.youtube?.channelId) {
      warnings.push("Missing YouTube channel handle/channel ID.");
    }
  }

  return { errors, warnings };
}

export async function startLiveNotifications(client) {
  if (serviceState.started) {
    logger.warn("[Live Notifications] Already started. Skipping duplicate startup.");
    return serviceState;
  }

  const { errors, warnings } = validateStreamConfig();

  for (const warning of warnings) {
    logger.warn(`[Live Notifications] ${warning}`);
  }

  if (!streamConfig.enabled) {
    serviceState = {
      started: false,
      disabled: true,
      errors,
      warnings
    };

    startupLog("Live notifications disabled.");
    return serviceState;
  }

  if (errors.length > 0) {
    for (const error of errors) {
      logger.error(`[Live Notifications] ${error}`);
    }

    startupLog("Live notification service failed to start due to configuration errors.");

    return {
      started: false,
      twitchStarted: false,
      youtubeStarted: false,
      errors,
      warnings
    };
  }

  let twitchStarted = false;
  let youtubeStarted = false;

  try {
    const announcementChannel = await client.channels
      .fetch(streamConfig.announcementChannelId)
      .catch(() => null);

    if (!announcementChannel || !announcementChannel.isTextBased()) {
      logger.error(
        `[Live Notifications] Announcement channel ${streamConfig.announcementChannelId} was not found or is not text-based.`
      );

      return {
        started: false,
        twitchStarted: false,
        youtubeStarted: false,
        errors: ["Announcement channel not found or not text-based"],
        warnings
      };
    }

    if (
      streamConfig.twitch?.enabled !== false &&
      streamConfig.twitch?.username &&
      streamConfig.twitch?.clientId &&
      streamConfig.twitch?.clientSecret
    ) {
      await startTwitchNotifier(client);
      twitchStarted = true;
    } else {
      logger.warn("[Live Notifications] Twitch notifier skipped.");
    }

    if (
      streamConfig.youtube?.enabled !== false &&
      streamConfig.youtube?.apiKey &&
      (streamConfig.youtube?.channelHandle || streamConfig.youtube?.channelId)
    ) {
      await startYouTubeNotifier(client);
      youtubeStarted = true;
    } else {
      logger.warn("[Live Notifications] YouTube notifier skipped.");
    }

    serviceState = {
      started: true,
      twitchStarted,
      youtubeStarted,
      startedAt: new Date().toISOString(),
      errors,
      warnings
    };

    startupLog(
      `Live notifications started: Twitch ${twitchStarted ? "enabled" : "disabled"}, YouTube ${youtubeStarted ? "enabled" : "disabled"}`
    );

    return serviceState;
  } catch (error) {
    logger.error("[Live Notifications] Failed to start service:", error);

    serviceState = {
      started: false,
      twitchStarted,
      youtubeStarted,
      errors: [error.message],
      warnings
    };

    return serviceState;
  }
}

export async function stopLiveNotifications() {
  try {
    stopTwitchNotifier();
    stopYouTubeNotifier();

    serviceState = {
      started: false,
      twitchStarted: false,
      youtubeStarted: false,
      stoppedAt: new Date().toISOString()
    };

    logger.info("[Live Notifications] Service stopped.");
  } catch (error) {
    logger.error("[Live Notifications] Failed to stop service:", error);
  }
}

export function getLiveNotificationServiceState() {
  return serviceState;
}
