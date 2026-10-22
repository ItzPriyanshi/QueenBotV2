const axios = require("axios");
const yts = require("yt-search");

const YOUTUBE_API = {
  BASE_URL: "https://meow-dl.onrender.com",
  ENDPOINT: "/yt"
};

module.exports = {
  config: {
    name: "sing",
    aliases: ["song", "music", "yt"],
    version: "5.0.0",
    author: "Priyanshi Kaur (Refactored)",
    role: 0,
    countDown: 5,
    category: "media",
    shortDescription: { en: "Download YouTube audio or video" },
    longDescription: { en: "Search and download YouTube audio or video with quality selection" },
    guide: {
      en: "{pn} <song name or URL> [audio|video] [quality]\n\n" +
          "Examples:\n" +
          "{pn} let me love you\n" +
          "{pn} let me love you video\n" +
          "{pn} let me love you video 720p\n" +
          "{pn} https://youtu.be/dQw4w9WgXcQ 1080p\n"
    }
  },
  onStart: async function ({ api, args, message, event }) {
    const inputArgs = Array.isArray(args) ? [...args] : [];
    let mediaType = "audio";
    let selectedQuality = null;
    let queryArgs = [];

    for (const arg of inputArgs) {
      const lower = arg.toLowerCase();
      if (["audio", "mp3", "m4a", "-a"].includes(lower)) {
        mediaType = "audio";
      } else if (["video", "mp4", "-v"].includes(lower)) {
        mediaType = "video";
      } else if (/^(1080p|720p|480p|360p|240p|144p)$/.test(lower)) {
        selectedQuality = lower;
        mediaType = "video";
      } else {
        queryArgs.push(arg);
      }
    }

    const query = queryArgs.join(" ").trim();
    if (!query) {
      return message.reply(
        "❌ Enter a song name or YouTube URL.\n\n" +
        "Examples:\n" +
        "• sing let me love you\n" +
        "• sing let me love you video 720p"
      );
    }

    let processingMessage;
    try {
      setReaction(api, "🔍", event?.messageID);
      processingMessage = await message.reply(
        isYouTubeURL(query) ? `⏳ Processing ${mediaType}...` : `🔎 Searching for "${query}"...`
      );

      const video = await resolveVideo(query);
      await editMessage(
        api,
        [
          `⬇️ Extracting ${mediaType}...`,
          `📀 ${video.title}`,
          `🔗 ${video.shortUrl}`
        ].join("\n"),
        processingMessage?.messageID
      );

      const mediaInfo = await fetchYouTubeMedia(video.url, mediaType, selectedQuality);
      const fileName = `${sanitizeFileName(mediaInfo.title)}.${mediaInfo.extension}`;
      
      await editMessage(
        api,
        [
          `📥 Downloading ${mediaType}...`,
          `📀 ${mediaInfo.title}`,
          `📦 Quality: ${mediaInfo.quality} | Size:${mediaInfo.size}`
        ].join("\n"),
        processingMessage?.messageID
      );

      const attachment = await getMediaStream(mediaInfo.mediaURL, fileName);

      await message.reply({
        body: [
          mediaType === "audio" ? `🎶 ${mediaInfo.title}` : `🎬 ${mediaInfo.title}`,
          `📺 ${mediaInfo.author}`,
          `📦 Quality: ${mediaInfo.quality} | Size:${mediaInfo.size}`,
          `🔗 ${video.shortUrl}`
        ].join("\n"),
        attachment
      });

      await unsendMessage(api, processingMessage?.messageID);
      setReaction(api, "✅", event?.messageID);
    } catch (error) {
      console.error("Sing command error:", {
        message: error?.message,
        status: error?.response?.status,
        code: error?.code
      });
      const errorMessage = `❌ ${formatError(error)}`;
      const edited = await editMessage(
        api,
        errorMessage,
        processingMessage?.messageID
      );
      if (!edited) {
        await message.reply(errorMessage);
      }
      setReaction(api, "❌", event?.messageID);
    }
  }
};

async function fetchYouTubeMedia(videoUrl, mediaType, requestedQuality) {
  const format = mediaType === "audio" ? "m4a" : "mp4";
  const requestUrl = `${YOUTUBE_API.BASE_URL}${YOUTUBE_API.ENDPOINT}?url=${encodeURIComponent(videoUrl)}&format=${format}`;
  
  try {
    const { data } = await axios.get(requestUrl);
    if (!data || (data.status !== "ok" && !data.success)) {
      throw new Error(data?.message || "The API could not process this video.");
    }
    
    if (mediaType === "audio") {
      if (!data.downloadLink) throw new Error("No audio download link found.");
      return {
        title: data.title || "YouTube Audio",
        author: data.channel || "Unknown Channel",
        mediaURL: data.downloadLink,
        extension: "m4a",
        quality: "Audio (m4a)",
        size: data.size || "Unknown"
      };
    } else {
      const mediaList = data.media;
      if (!mediaList || !Array.isArray(mediaList) || mediaList.length === 0) {
        throw new Error("No video qualities found for this URL.");
      }
      
      let selectedMedia = requestedQuality ? mediaList.find((m) => m.quality === requestedQuality) : mediaList.find((m) => m.quality === "720p");
      if (!selectedMedia) {
        selectedMedia = mediaList[0];
      }
      
      return {
        title: data.title || "YouTube Video",
        author: data.channel || "Unknown Channel",
        mediaURL: selectedMedia.url,
        extension: "mp4",
        quality: selectedMedia.quality,
        size: selectedMedia.size || "Unknown"
      };
    }
  } catch (error) {
    throw new Error(
      error.response?.data?.message || error.message || "Failed to fetch media links."
    );
  }
}

async function resolveVideo(query) {
  const directVideoID = extractYouTubeID(query);
  if (directVideoID) {
    return {
      videoID: directVideoID,
      url: `https://www.youtube.com/watch?v=${directVideoID}`,
      shortUrl: `https://youtu.be/${directVideoID}`,
      title: "YouTube Video",
    };
  }
  
  if (/^https?:\/\//i.test(query)) {
    throw new Error("Only valid YouTube URLs are supported.");
  }
  
  const searchResult = await yts(query);
  const video = searchResult?.videos?.[0];
  
  if (!video) {
    throw new Error(`No YouTube videos were found for "${query}".`);
  }
  
  return {
    videoID: video.videoId,
    url: video.url,
    shortUrl: `https://youtu.be/${video.videoId}`,
    title: video.title || "YouTube Video",
    author: video.author?.name || "Unknown Channel"
  };
}

function isYouTubeURL(value) {
  return Boolean(extractYouTubeID(value));
}

function extractYouTubeID(value) {
  if (typeof value !== "string") return null;
  const input = value.trim();
  
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  
  try {
    const parsed = new URL(input);
    const hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
    
    if (hostname === "youtu.be") {
      const videoID = parsed.pathname.split("/").filter(Boolean)[0];
      return isValidVideoID(videoID) ? videoID : null;
    }
    
    if (["youtube.com", "m.youtube.com", "music.youtube.com"].includes(hostname)) {
      const queryID = parsed.searchParams.get("v");
      if (isValidVideoID(queryID)) return queryID;
      
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0]) && isValidVideoID(parts[1])) {
        return parts[1];
      }
    }
  } catch {}
  
  return null;
}

function isValidVideoID(value) {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{11}$/.test(value);
}

async function getMediaStream(mediaURL, fileName) {
  if (!global.utils || typeof global.utils.getStreamFromURL !== "function") {
    throw new Error("global.utils.getStreamFromURL is unavailable in your bot environment.");
  }
  
  const stream = await global.utils.getStreamFromURL(mediaURL, fileName);
  if (!stream) {
    throw new Error("The media stream could not be downloaded.");
  }
  
  return stream;
}

function sanitizeFileName(value) {
  const fileName = String(value || "youtube_media")
    .replace(/[\\/:*?"<>|#%&{}$!'@+=`~]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return fileName || "youtube_media";
}

async function editMessage(api, text, messageID) {
  if (!messageID || typeof api?.editMessage !== "function") return false;
  try {
    await api.editMessage(text, messageID);
    return true;
  } catch {
    return false;
  }
}

async function unsendMessage(api, messageID) {
  if (!messageID || typeof api?.unsendMessage !== "function") return;
  try {
    await api.unsendMessage(messageID);
  } catch {}
}

function setReaction(api, reaction, messageID) {
  if (!messageID || typeof api?.setMessageReaction !== "function") return;
  try {
    api.setMessageReaction(reaction, messageID, () => {}, true);
  } catch {}
}

function formatError(error) {
  const errorMessage = error?.message || String(error) || "Unknown error";
  
  if (/timeout|timed out|econnaborted/i.test(errorMessage)) {
    return "The downloader request timed out. Please try again.";
  }
  if (/403|forbidden|access denied/i.test(errorMessage)) {
    return "The media URL expired or denied access.";
  }
  if (/404|not found/i.test(errorMessage)) {
    return "The video or media file was not found.";
  }
  if (/429|rate.?limit|too many requests/i.test(errorMessage)) {
    return "The API is rate-limited. Try again later.";
  }
  if (/500|502|503|504|unavailable/i.test(errorMessage)) {
    return "The external API service is temporarily unavailable.";
  }
  
  return errorMessage.slice(0, 400);
}
