export default {
  // Discord
  guildId: "", // Leave blank to work in every server the bot is in

  announcementChannelId: "1519348096566300803",

  pingEveryone: true,

  pingUserId: "487935188798537759",

  // Twitch
  twitch: {
    username: "v8carr4_pro",

    clientId: process.env.TWITCH_CLIENT_ID,

    clientSecret: process.env.TWITCH_CLIENT_SECRET,

    checkInterval: 60000 // 60 seconds
  },

  // YouTube
  youtube: {
    channelHandle: "@The-V8-Productions",

    apiKey: process.env.YOUTUBE_API_KEY,

    checkInterval: 3600000 // 1 Hour
  },

  embeds: {

    color: 0x9146FF,

    footer: {
      text: "Touchpoint Live Notifications"
    }

  },

  notifications: {

    announceStreams: true,

    announceVideos: true,

    announceShorts: true,

    announcePremieres: true

  }

};
