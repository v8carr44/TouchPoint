import { logger } from "./logger.js";

async function youtubeFetch(url) {
  const res = await fetch(url);
  const text = await res.text();

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(`YouTube API error ${res.status}: ${text}`);
  }

  return json;
}

function normalizeHandle(handle) {
  if (!handle) return "";
  return handle.startsWith("@") ? handle.slice(1) : handle;
}

export async function resolveYouTubeChannelId({ apiKey, channelHandle, channelId }) {
  if (channelId) return channelId;

  const handle = normalizeHandle(channelHandle);

  if (!handle) {
    throw new Error("Missing YouTube channel handle or channel ID.");
  }

  // YouTube API supports forHandle.
  const params = new URLSearchParams({
    part: "id,snippet",
    forHandle: handle,
    key: apiKey
  });

  const data = await youtubeFetch(
    `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`
  );

  const channel = data?.items?.[0];

  if (!channel?.id) {
    throw new Error(`Could not resolve YouTube channel ID for @${handle}`);
  }

  return channel.id;
}

export async function getLatestYouTubeItems({ apiKey, channelId, maxResults = 5 }) {
  const params = new URLSearchParams({
    part: "snippet",
    channelId,
    maxResults: String(maxResults),
    order: "date",
    type: "video",
    key: apiKey
  });

  const data = await youtubeFetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
  );

  return data?.items || [];
}

export async function getYouTubeVideoDetails({ apiKey, videoIds }) {
  const ids = Array.isArray(videoIds) ? videoIds.filter(Boolean) : [videoIds].filter(Boolean);

  if (ids.length === 0) return [];

  const params = new URLSearchParams({
    part: "snippet,liveStreamingDetails,contentDetails",
    id: ids.join(","),
    key: apiKey
  });

  const data = await youtubeFetch(
    `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`
  );

  return data?.items || [];
}

export function getYouTubeVideoUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function getYouTubeLiveUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function isYouTubeLiveVideo(video) {
  const snippet = video?.snippet;
  const liveDetails = video?.liveStreamingDetails;

  return Boolean(
    liveDetails?.actualStartTime ||
    liveDetails?.scheduledStartTime ||
    snippet?.liveBroadcastContent === "live"
  );
}

export function isCurrentlyLive(video) {
  return Boolean(
    video?.snippet?.liveBroadcastContent === "live" ||
    (video?.liveStreamingDetails?.actualStartTime && !video?.liveStreamingDetails?.actualEndTime)
  );
}

export function getBestYouTubeThumbnail(video) {
  const thumbs = video?.snippet?.thumbnails || {};
  return (
    thumbs.maxres?.url ||
    thumbs.standard?.url ||
    thumbs.high?.url ||
    thumbs.medium?.url ||
    thumbs.default?.url ||
    null
  );
}

export function logYouTubeApiError(context, error) {
  logger.error(`[YouTube API] ${context}:`, error);
}
