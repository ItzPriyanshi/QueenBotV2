const fs = require('fs');
const axios = require('axios');
const path = require('path');

const apiKey = "COHERE_API_KEY_HERE";

const TEXT_MODEL = 'command-a-03-2025';
const VISION_MODEL = 'command-a-vision-07-2025';

const TAVILY_API_KEY = 'TAVILY_API_KEY_HERE';

const USERS_FILE = path.join(__dirname, 'cohere.json');
const MAX_HISTORY = 20;         
const MAX_TOOL_ROUNDS = 3;       
const MSG_LIMIT = 1900;          
const REPLY_TTL = 2 * 60 * 60 * 1000; 

const COHERE_URL = 'https://api.cohere.com/v2/chat';
const COHERE_HEADERS = {
  Authorization: `Bearer ${apiKey}`,
  'Content-Type': 'application/json'
};

const busy = new Set();

function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return {};
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    const data = raw.trim() ? JSON.parse(raw) : {};
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeUsers(obj) {
  const tmp = USERS_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, USERS_FILE);
}

function getHistory(uid) {
  const h = readUsers()[uid];
  return Array.isArray(h) ? h : []; 
}

function saveHistory(uid, history) {
  const users = readUsers();
  const trimmed = history.slice(-MAX_HISTORY);
  while (trimmed.length && trimmed[0].role !== 'user') trimmed.shift();
  users[uid] = trimmed;
  writeUsers(users);
}

function clearHistory(uid) {
  const users = readUsers();
  if (uid in users) {
    delete users[uid];
    writeUsers(users);
  }
}

function buildSystemText() {
  const now = new Date().toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  return `## Task And Context
You help people answer their questions and other requests interactively. You will be asked a very wide array of requests on all kinds of topics. You have a web_search tool: use it for current events, recent facts, prices, news, or anything you are not sure about. Focus on serving the user's needs. The current date is ${now}.

## Style Guide
Unless asked otherwise, answer in full sentences, with proper grammar and spelling. Keep answers reasonably concise.`;
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for up-to-date information. Returns titles, URLs and snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' }
        },
        required: ['query']
      }
    }
  }
];

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchTavily(query) {
  const r = await axios.post(
    'https://api.tavily.com/search',
    { api_key: TAVILY_API_KEY, query, max_results: 5 },
    { timeout: 15000 }
  );
  return (r.data.results || []).map(x => ({
    title: x.title,
    url: x.url,
    snippet: (x.content || '').slice(0, 500)
  }));
}

async function searchDuckDuckGo(query) {
  const r = await axios.get('https://html.duckduckgo.com/html/', {
    params: { q: query },
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'
    },
    timeout: 15000
  });

  const html = String(r.data);
  const re =
    /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

  const results = [];
  let m;
  while ((m = re.exec(html)) && results.length < 5) {
    let url = m[1];
    const uddg = url.match(/uddg=([^&]+)/);
    if (uddg) url = decodeURIComponent(uddg[1]);
    else if (url.startsWith('//')) url = 'https:' + url;
    results.push({ title: stripHtml(m[2]), url, snippet: stripHtml(m[3]) });
  }
  return results;
}

async function webSearch(query) {
  try {
    const results = TAVILY_API_KEY ? await searchTavily(query) : await searchDuckDuckGo(query);
    return results.length ? results : [];
  } catch (err) {
    console.error('Web search failed:', err.message);
    return [];
  }
}

async function runTool(name, args, sources) {
  if (name === 'web_search') {
    const query = String(args.query || '').trim();
    if (!query) return { error: 'Empty query' };
    const results = await webSearch(query);
    results.forEach(r => r.url && sources.add(r.url));
    return results.length ? { results } : { results: [], note: 'No results found.' };
  }
  return { error: `Unknown tool: ${name}` };
}

function getPhoto(event) {
  const att = event.messageReply?.attachments?.[0] || event.attachments?.[0] || null;
  if (!att || !att.url) return null;
  if (att.type !== 'photo' && att.type !== 'animated_image') return null;
  return { url: att.url, mime: 'image/jpeg' };
}

async function toDataUrl(url, fallbackMime) {
  const r = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 20000,
    maxContentLength: 10 * 1024 * 1024
  });
  let type = String(r.headers['content-type'] || '').split(';')[0];
  if (!type.startsWith('image/')) type = fallbackMime || 'image/jpeg';
  return `data:${type};base64,${Buffer.from(r.data).toString('base64')}`;
}

async function postChat(body) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await axios.post(COHERE_URL, body, {
        headers: COHERE_HEADERS,
        timeout: 60000
      });
      return resp.data;
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      const retryable = !status || status === 429 || status >= 500;
      if (!retryable || attempt === 2) break;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1) ** 2));
    }
  }
  throw lastErr;
}

async function chatV2({ prompt, uid, isOnStart, imageUrl, imageMime }) {
  const history = isOnStart ? [] : getHistory(uid);
  const sources = new Set();

  const userContent = [{ type: 'text', text: prompt }];
  let useTools = true;
  let model = TEXT_MODEL;

  if (imageUrl) {
    userContent.push({
      type: 'image_url',
      image_url: { url: await toDataUrl(imageUrl, imageMime) }
    });
    model = VISION_MODEL;
    useTools = false; 
  }

  const messages = [
    { role: 'system', content: buildSystemText() },
    ...history,
    { role: 'user', content: userContent }
  ];

  let text = '';
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const body = { model, messages, temperature: 0.3 };
    const toolsEnabled = useTools && round < MAX_TOOL_ROUNDS;
    if (toolsEnabled) body.tools = TOOLS;

    const data = await postChat(body);
    const msg = data.message || {};

    if (toolsEnabled && Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
      messages.push({
        role: 'assistant',
        tool_plan: msg.tool_plan,
        tool_calls: msg.tool_calls
      });

      for (const call of msg.tool_calls) {
        let result;
        try {
          const args = JSON.parse(call.function?.arguments || '{}');
          result = await runTool(call.function?.name, args, sources);
        } catch (e) {
          result = { error: e.message };
        }
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: [{ type: 'document', document: { data: JSON.stringify(result) } }]
        });
      }
      continue;
    }

    text = (msg.content || []).map(c => c?.text || '').join('').trim();
    break;
  }

  if (!text) text = 'No response.';

  saveHistory(uid, [
    ...history,
    { role: 'user', content: imageUrl ? `[image] ${prompt}` : prompt },
    { role: 'assistant', content: text }
  ]);

  if (sources.size) {
    text += '\n\nSources:\n' + [...sources].slice(0, 3).map(u => `- ${u}`).join('\n');
  }

  return { text };
}

function chunkText(text, size = MSG_LIMIT) {
  const out = [];
  let rest = String(text);
  while (rest.length > size) {
    let cut = rest.lastIndexOf('\n', size);
    if (cut < size * 0.5) cut = rest.lastIndexOf(' ', size);
    if (cut < size * 0.5) cut = size;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

async function sendReply(message, text, { commandName, author }) {
  for (const chunk of chunkText(text)) {
    await new Promise(resolve => {
      message.reply(chunk, (err, info) => {
        if (!err && info?.messageID) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            messageID: info.messageID,
            author
          });
          const t = setTimeout(() => global.GoatBot.onReply.delete(info.messageID), REPLY_TTL);
          if (t.unref) t.unref();
        }
        resolve();
      });
    });
  }
}

function friendlyError(err) {
  const status = err?.response?.status;
  if (status === 429) return 'Rate limit reached. Please try again in a moment.';
  if (status === 401 || status === 403) return 'API key was rejected. Please contact the bot admin.';
  if (status === 404) return 'The configured model is unavailable. Please contact the bot admin.';
  return 'An error occurred.';
}

async function handle({ api, message, event, commandName, raw, prompt, isOnStart }) {
  const uid = event.senderID;

  if (raw.trim().toLowerCase() === 'clear') {
    clearHistory(uid);
    api.setMessageReaction('✅', event.messageID, () => {}, true);
    return message.reply('Conversation cleared');
  }

  if (busy.has(uid)) {
    return message.reply('Please wait for the previous reply to finish.');
  }
  busy.add(uid);

  api.setMessageReaction('⌛', event.messageID, () => {}, true);
  const startTime = Date.now();

  try {
    const photo = getPhoto(event);
    const { text } = await chatV2({
      prompt,
      uid,
      isOnStart,
      imageUrl: photo?.url || null,
      imageMime: photo?.mime
    });

    const completionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    await sendReply(message, `${text}\n\nCompletion time: ${completionTime}s`, {
      commandName,
      author: uid
    });
    api.setMessageReaction('✅', event.messageID, () => {}, true);
  } catch (error) {
    console.error(
      'Error in Cohere chat:',
      error?.response?.status,
      JSON.stringify(error?.response?.data) || error.message
    );
    api.setMessageReaction('❌', event.messageID, () => {}, true);
    await message.reply(friendlyError(error));
  } finally {
    busy.delete(uid);
  }
}

module.exports = {
  config: {
    name: 'c',
    version: '2.1.0',
    author: 'Shikaki | Priyanshi Kaur',
    countDown: 5,
    role: 0,
    category: 'Ai',
    description: {
      en: 'Cohere v2 Chat with Web Search and Vision (image URL in replies).'
    },
    guide: {
      en:
`{pn} tell about fastest bird
Reply with an image attached to enable vision:
- Reply to a message with an image and prompt: "{pn} describe this"
Continue a conversation:
- Reply to the bot's message
Clear conversation:
- {pn} clear  or reply "clear"
Models/behavior:
- Uses Cohere /v2/chat with a web_search tool (text) and a vision model (images).`
    }
  },

  onStart: async function ({ api, message, event, args, commandName }) {
    const raw = (args || []).join(' ').trim();
    let prompt = raw;

    if (event.type === 'message_reply' && event.messageReply?.body) {
      prompt = `${event.messageReply.body} ${raw}`.trim();
    }

    if (raw.toLowerCase() !== 'clear' && !prompt) {
      if (getPhoto(event)) {
        prompt = 'Describe this content.';
      } else {
        return message.reply('Please provide a prompt.');
      }
    }

    return handle({ api, message, event, commandName, raw, prompt, isOnStart: true });
  },

  onReply: async function ({ api, message, event, Reply, args, commandName }) {
    if (event.senderID !== Reply.author) return;

    const raw = (args || []).join(' ').trim();
    let prompt = raw;

    if (raw.toLowerCase() !== 'clear' && !prompt) {
      if (!getPhoto(event)) return;
      prompt = 'Describe this content.';
    }

    return handle({ api, message, event, commandName, raw, prompt, isOnStart: false });
  }
};