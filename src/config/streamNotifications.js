export default {
  enabled: true,

  // Discord
  announcementChannelId: "1519348096566300803",
  pingRoleId: "1520762179983380490",
  pingUserId: "487935188798537759",

  // Twitch
  twitch: {
    enabled: true,
    username: "v8carr4_pro",
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    checkIntervalMs: 60_000,
    announceIfAlreadyLiveOnStartup: true
  },

  // YouTube
  youtube: {
    enabled: true,
    channelHandle: "@The-V8-Productions",
    channelId: process.env.YOUTUBE_CHANNEL_ID || "",
    apiKey: process.env.YOUTUBE_API_KEY,
    checkIntervalMs: 120_000,
    announceUploads: true,
    announceLivestreams: true,
    announceIfAlreadyLiveOnStartup: true
  },

  embeds: {
    twitchColor: 0x9146ff,
    youtubeColor: 0xff0000,
    footerText: "TouchPoint Live Notifications"
  }
};
