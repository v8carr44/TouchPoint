import { logger } from "./logger.js";

let tokenCache = {
  accessToken: null,
  expiresAt: 0
};

async function twitchFetch(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();

  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw new Error(`Twitch API error ${res.status}: ${text}`);
  }

  return json;
}

export async function getTwitchAppAccessToken(clientId, clientSecret) {
  const now = Date.now();

  if (tokenCache.accessToken && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials"
  });

  const data = await twitchFetch(
    `https://id.twitch.tv/oauth2/token?${params.toString()}`,
    { method: "POST" }
  );

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in || 3600) * 1000)
  };

  return tokenCache.accessToken;
}

export async function getTwitchUser({ username, clientId, clientSecret }) {
  const token = await getTwitchAppAccessToken(clientId, clientSecret);

  const params = new URLSearchParams({
    login: username
  });

  const data = await twitchFetch(
    `https://api.twitch.tv/helix/users?${params.toString()}`,
    {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`
      }
    }
  );

  return data?.data?.[0] || null;
}

export async function getTwitchStream({ username, clientId, clientSecret }) {
  const token = await getTwitchAppAccessToken(clientId, clientSecret);

  const params = new URLSearchParams({
    user_login: username
  });

  const data = await twitchFetch(
    `https://api.twitch.tv/helix/streams?${params.toString()}`,
    {
      headers: {
        "Client-ID": clientId,
        Authorization: `Bearer ${token}`
      }
    }
  );

  return data?.data?.[0] || null;
}

export function formatTwitchThumbnail(url, width = 1280, height = 720) {
  if (!url) return null;

  return url
    .replace("{width}", String(width))
    .replace("{height}", String(height));
}

export function buildTwitchUrl(username) {
  return `https://twitch.tv/${username}`;
}

export function logTwitchApiError(context, error) {
  logger.error(`[Twitch API] ${context}:`, error);
}
