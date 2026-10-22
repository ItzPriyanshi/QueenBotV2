const fs = require("fs");
const path = require("path");

const PriyaPrefix = ["queen", "ai", ".ai"];
const settingsFile = path.join(__dirname, "ai_model.json");
const historyFile = path.join(__dirname, "ai_history.json");
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = "YOUR_GROQ_API_KEY";

const AVAILABLE_MODELS = [
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b"
];
const DEFAULT_MODEL = AVAILABLE_MODELS[0];
const MAX_HISTORY_MESSAGES = 20;

function ensureFile(file, defaultValue) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2), "utf8");
  }
}

function readJsonFile(file, defaultValue) {
  ensureFile(file, defaultValue);
  try {
    const content = fs.readFileSync(file, "utf8");
    return JSON.parse(content || JSON.stringify(defaultValue));
  } catch {
    fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2), "utf8");
    return defaultValue;
  }
}

function writeJsonFile(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function loadModel() {
  const settings = readJsonFile(settingsFile, { model: DEFAULT_MODEL });
  if (!AVAILABLE_MODELS.includes(settings.model)) {
    settings.model = DEFAULT_MODEL;
    writeJsonFile(settingsFile, settings);
  }
  return settings;
}

function saveModel(model) {
  writeJsonFile(settingsFile, { model });
}

function loadHistory(uid) {
  const all = readJsonFile(historyFile, {});
  if (!Array.isArray(all[uid])) {
    all[uid] = [];
  }
  return all;
}

function saveHistory(uid, history) {
  const all = readJsonFile(historyFile, {});
  all[uid] = history
    .filter(
      item =>
        item &&
        ["system", "user", "assistant"].includes(item.role) &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .slice(-MAX_HISTORY_MESSAGES);
  writeJsonFile(historyFile, all);
}

function resetHistory(uid) {
  const all = readJsonFile(historyFile, {});
  all[uid] = [];
  writeJsonFile(historyFile, all);
}

function normalizeCommand(body) {
  if (typeof body !== "string") {
    return { usedPrefix: null, prompt: "" };
  }
  const trimmed = body.trim();
  const lower = trimmed.toLowerCase();
  
  const usedPrefix = PriyaPrefix.find(prefix => {
    const normalizedPrefix = prefix.toLowerCase();
    return lower === normalizedPrefix || lower.startsWith(`${normalizedPrefix} `);
  });
  
  if (!usedPrefix) {
    return { usedPrefix: null, prompt: "" };
  }
  
  return { usedPrefix, prompt: trimmed.slice(usedPrefix.length).trim() };
}

function formatError(error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (/401|invalid.*api|authentication|unauthorized/i.test(errorMessage)) {
    return "The Groq API key is invalid or expired.";
  }
  if (/403|forbidden|permission/i.test(errorMessage)) {
    return "The Groq account does not have permission to use this model.";
  }
  if (/429|rate.?limit|quota|too many requests/i.test(errorMessage)) {
    return "Groq's free-tier limit has been reached. Please try again later.";
  }
  if (/model.*not found|does not exist|decommissioned|not available/i.test(errorMessage)) {
    return "The selected Groq model is unavailable. Use ai -set:1 to select the default model.";
  }
  if (/timed out|abort/i.test(errorMessage)) {
    return "The Groq request timed out. Please try again.";
  }
  
  return errorMessage;
}

function registerReply(messageID, author) {
  if (
    global.GoatBot &&
    global.GoatBot.onReply &&
    typeof global.GoatBot.onReply.set === "function"
  ) {
    global.GoatBot.onReply.set(messageID, {
      commandName: "ai",
      messageID,
      author: String(author)
    });
  }
}

async function callGroqChat({ model, messages }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 60000);
  
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_completion_tokens: 2048,
        stream: false
      }),
      signal: controller.signal
    });
    
    const data = await response.json().catch(() => null);
    
    if (!response.ok) {
      const errorMessage = data?.error?.message || data?.message || `Groq API returned HTTP ${response.status}`;
      throw new Error(errorMessage);
    }
    
    const content = data?.choices?.[0]?.message?.content;
    
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Groq returned an empty response.");
    }
    
    return content.trim();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Groq API request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function generateReply(uid, prompt) {
  const { model } = loadModel();
  const all = loadHistory(uid);
  const history = all[uid] || [];
  
  history.push({ role: "user", content: prompt });
  const messages = history.slice(-MAX_HISTORY_MESSAGES);
  const replyText = await callGroqChat({ model, messages });
  
  history.push({ role: "assistant", content: replyText });
  saveHistory(uid, history);
  
  return { replyText, model };
}

module.exports = {
  config: {
    name: "ai",
    version: "4.1.0",
    author: "Priyanshi Kaur",
    role: 0,
    countDown: 5,
    category: "AI",
    shortDescription: "Ask anything using Queen AI powered by Groq",
    longDescription: "Groq-powered AI with per-user history, reply chaining and model switching.",
    guide: {
      en: "Chat prefixes:\n" +
          "- ai\n" +
          "- queen\n" +
          "- .ai\n\n" +
          "Examples:\n" +
          "- ai What is the fastest bird?\n" +
          "- queen Summarize this text\n" +
          "- .ai Explain quantum tunneling\n\n" +
          "Models:\n" +
          "- ai models\n" +
          "- ai -set:1\n" +
          "- ai -set:2\n" +
          "- ai -set:3\n\n" +
          "History:\n" +
          "- ai clear\n\n" +
          "Reply to the AI message to continue chatting."
    }
  },
  onStart: async function () {},
  onChat: async function ({ message, event, api }) {
    if (!event || typeof event.body !== "string") {
      return;
    }
    
    const body = event.body.trim();
    if (!body) return;
    
    const lower = body.toLowerCase();
    const uid = String(event.senderID);
    
    const modelCommands = {
      "ai -set:1": AVAILABLE_MODELS[0],
      "queen -set:1": AVAILABLE_MODELS[0],
      ".ai -set:1": AVAILABLE_MODELS[0],
      "ai -set:2": AVAILABLE_MODELS[1],
      "queen -set:2": AVAILABLE_MODELS[1],
      ".ai -set:2": AVAILABLE_MODELS[1],
      "ai -set:3": AVAILABLE_MODELS[2],
      "queen -set:3": AVAILABLE_MODELS[2],
      ".ai -set:3": AVAILABLE_MODELS[2]
    };

    if (modelCommands[lower]) {
      const selectedModel = modelCommands[lower];
      saveModel(selectedModel);
      return message.reply(`✅ AI model changed to:\n${selectedModel}`);
    }

    if (["ai models", "queen models", ".ai models"].includes(lower)) {
      const { model } = loadModel();
      return message.reply(
        "🤖 Available Groq models:\n\n" +
        `1. ${AVAILABLE_MODELS[0]}\n` +
        `2. ${AVAILABLE_MODELS[1]}\n` +
        `3. ${AVAILABLE_MODELS[2]}\n\n` +
        `Current model: ${model}`
      );
    }

    if (["ai clear", "queen clear", ".ai clear"].includes(lower)) {
      resetHistory(uid);
      return message.reply("🧹 Your AI chat history has been cleared.");
    }

    if (["ai my details", "queen my details", ".ai my details"].includes(lower)) {
      const { model } = loadModel();
      return message.reply(
        "👤 Your details:\n" +
        `• UID: ${uid}\n` +
        `• Current model: ${model}\n` +
        `• Prefixes: ${PriyaPrefix.join(", ")}`
      );
    }

    const { usedPrefix, prompt } = normalizeCommand(body);
    if (!usedPrefix) return;

    if (!prompt) {
      const greetings = [
        "👑 Queen AI here! Ask me anything.",
        "🌟 Hi! Ready to chat?",
        "💡 Say something and I’ll respond!",
        "✨ What shall we explore today?"
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      return message.reply(randomGreeting);
    }

    const thinking = await message.reply("🧠 Thinking...");
    
    try {
      const { replyText } = await generateReply(uid, prompt);
      await api.editMessage(replyText, thinking.messageID);
      registerReply(thinking.messageID, uid);
    } catch (error) {
      console.error("Groq AI error:", error);
      await api.editMessage(`⚠️ ${formatError(error)}`, thinking.messageID);
    }
  },
  onReply: async function ({ api, message, event, Reply, args }) {
    if (!Reply || !event || String(event.senderID) !== String(Reply.author)) {
      return;
    }
    
    const userText = Array.isArray(args) 
      ? args.join(" ").trim() 
      : typeof event.body === "string" 
        ? event.body.trim() 
        : "";
        
    if (!userText) return;
    
    const uid = String(event.senderID);
    const thinking = await message.reply("🧠 Thinking...");
    
    try {
      const { replyText } = await generateReply(uid, userText);
      await api.editMessage(replyText, thinking.messageID);
      registerReply(thinking.messageID, uid);
    } catch (error) {
      console.error("Groq AI reply error:", error);
      await api.editMessage(`⚠️ ${formatError(error)}`, thinking.messageID);
    }
  }
};
