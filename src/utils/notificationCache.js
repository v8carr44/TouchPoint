import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// utils/ -> src/ -> data/
const CACHE_PATH = path.join(__dirname, "..", "data", "liveNotifications.json");

const defaultCache = {
  twitch: {
    lastStreamId: null,
    wasLive: false,
    lastCheckedAt: null
  },
  youtube: {
    channelId: null,
    announcedVideoIds: [],
    lastLiveVideoId: null,
    lastCheckedAt: null
  }
};

async function ensureCacheFile() {
  try {
    await fs.mkdir(path.dirname(CACHE_PATH), { recursive: true });

    try {
      await fs.access(CACHE_PATH);
    } catch {
      await fs.writeFile(CACHE_PATH, JSON.stringify(defaultCache, null, 2), "utf8");
    }
  } catch (error) {
    logger.error("[Live Notifications] Failed to ensure cache file:", error);
  }
}

export async function readNotificationCache() {
  await ensureCacheFile();

  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    return {
      ...defaultCache,
      ...parsed,
      twitch: {
        ...defaultCache.twitch,
        ...(parsed.twitch || {})
      },
      youtube: {
        ...defaultCache.youtube,
        ...(parsed.youtube || {})
      }
    };
  } catch (error) {
    logger.error("[Live Notifications] Failed to read cache, using default cache:", error);
    return structuredClone(defaultCache);
  }
}

export async function writeNotificationCache(cache) {
  await ensureCacheFile();

  try {
    await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
  } catch (error) {
    logger.error("[Live Notifications] Failed to write cache:", error);
  }
}

export async function updateNotificationCache(updater) {
  const cache = await readNotificationCache();
  const updated = await updater(cache);
  await writeNotificationCache(updated || cache);
  return updated || cache;
}

export async function markYouTubeVideoAnnounced(videoId) {
  if (!videoId) return;

  await updateNotificationCache((cache) => {
    const list = Array.isArray(cache.youtube.announcedVideoIds)
      ? cache.youtube.announcedVideoIds
      : [];

    if (!list.includes(videoId)) {
      list.unshift(videoId);
    }

    cache.youtube.announcedVideoIds = list.slice(0, 100);
    cache.youtube.lastCheckedAt = new Date().toISOString();

    return cache;
  });
}

export async function hasYouTubeVideoBeenAnnounced(videoId) {
  if (!videoId) return true;

  const cache = await readNotificationCache();
  return Array.isArray(cache.youtube.announcedVideoIds)
    && cache.youtube.announcedVideoIds.includes(videoId);
}
