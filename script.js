
// ===== 1. API KEY =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}
const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"];

// ===== 2. MEMORY =====
let MEMORY = [];
try {
  const storedMemory = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
  if (Array.isArray(storedMemory)) {
    MEMORY = storedMemory.filter(
      m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string'
    );
  }
} catch (e) {
  MEMORY = [];
}

async function fetchToolJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Network response was not ok');
  return await res.json();
}

// ===== 3. TOOLS =====
async function handleTools(text) {
  const t = text.toLowerCase().trim();

  // Basic Agent Tool Handlers
  if (t === 'current time' || t === 'time') {
    return 'Current time is ' + new Date().toLocaleTimeString() + ', Boss.';
  }
  if (t === 'weather') {
    try {
      const data = await fetchToolJson('https://wttr.in/?format=3');
      return 'Weather: ' + data;
    } catch (e) {
      const res = await fetch('https://wttr.in/?format=3');
      return res.ok ? 'Weather: ' + (await res.text()) : 'Unable to fetch weather, Boss.';
    }
  }
  if (t === 'news') {
    try {
      const data = await fetchToolJson('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=3');
      const headlines = data.hits.map(h => h.title).join(' | ');
      return 'Top News: ' + headlines;
    } catch (e) {
      return 'Unable to fetch news, Boss.';
    }
  }
  if (t === 'bitcoin' || t === 'crypto') {
    try {
      const data = await fetchToolJson('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
      return 'Bitcoin price: $' + data.bitcoin.usd + ' USD';
    } catch (e) {
      return 'Unable to fetch crypto price, Boss.';
    }
  }

  // Open YouTube / Google
  if (/^\s*(?:please\s+)?(?:open\s+youtube|youtube\s+open|youtube)(?:\s+please)?[.!?]*\s*$/i.test(text)) {
    window.open('https://youtube.com', '_blank', 'noopener,noreferrer');
    return 'Opening YouTube, Boss.';
  }
  if (/^\s*(?:please\s+)?(?:open\s+google|google\s+open|google)(?:\s+please)?[.!?]*\s*$/i.test(text)) {
    window.open('https://google.com', '_blank', 'noopener,noreferrer');
    return 'Opening Google, Boss.';
  }

  // Open Direct URL
  const urlCommand = text.match(/^\s*(?:open|visit|go to)\s+(https?:\/\/\S+)\s*$/i);
  if (urlCommand) {
    try {
      const destination = new URL(urlCommand[1]);
      if (destination.protocol !== 'https:' && destination.protocol !== 'http:') {
        return 'Only http and https links can be opened.';
      }
      window.open(destination.href, '_blank', 'noopener,noreferrer');
      return 'Opening ' + destination.hostname + ', Boss.';
    } catch (e) {
      return 'That link does not look valid.';
    }
  }

  // Google Search
  if (/^\s*(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s*$/i.test(text)) {
    return 'Tell me what to search for on Google.';
  }
  const googleSearch = text.match(/^\s*(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s+(.+?)\s*$/i);
  if (googleSearch) {
    const query = googleSearch[1].trim();
    if (!query) return 'Tell me what to search for on Google.';
    window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank', 'noopener,noreferrer');
    return 'Searching Google for ' + query + ', Boss.';
  }

  // YouTube Search
  const playMatch = text.match(/^\s*play\s+(.+?)\s*$/i);
  const youtubeMatch = text.match(/^\s*youtube(?:\s+search)?(?:\s+for)?\s+(.+?)\s*$/i);
  const searchYoutubeMatch = text.match(/^\s*search\s+(?:on\s+)?youtube(?:\s+for)?\s+(.+?)\s*$/i);
  const videoQuery = (playMatch || youtubeMatch || searchYoutubeMatch)?.[1]?.trim();
  if (videoQuery) {
    window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(videoQuery), '_blank', 'noopener,noreferrer');
    return 'Searching YouTube for ' + videoQuery + ', Boss.';
  }

  // Wikipedia Search
  const searchMatch = text.match(/^\s*(?:search|look up)\s+(?:for\s+)?(.+?)\s*$/i);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    if (!query) return 'Tell me what to search for.';
    try {
      const url = 'https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&srsearch=' +
        encodeURIComponent(query) + '&format=json&origin=*';
      const data = await fetchToolJson(url);
      const result = data?.query?.search?.[0];
      if (!result) return 'I could not find that, Boss.';
      const snippet = String(result.snippet || '')
        .replace(/<[^>]*>/g, '')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      return 'Wikipedia summary: ' + result.title + (snippet ? '. ' + snippet : '');
    } catch (e) {
      return 'Search error, Boss.';
    }
  }

  return null;
}

// ===== 3.5. AGENT MODE ENGINE =====
const AGENT_TOOLS = Object.freeze({
  time: async () => handleTools('current time'),
  weather: async () => handleTools('weather'),
  news: async () => handleTools('news'),
  crypto: async () => handleTools('bitcoin')
});

const AGENT_TOOL_NAMES = Object.freeze({
  time: 'time',
  weather: 'weather',
  news: 'news',
  crypto: 'crypto'
});

function isAgentModeRequest(text = '') {
  const value = String(text || '');
  if (/\b(?:agent(?:\s+mode)?|run\s+(?:the\s+)?agent|use\s+(?:the\s+)?agent)\b/i.test(value)) return true;
  if (/\b(?:briefing|research|analy[sz]e|analysis)\b/i.test(value)) return true;
  return /\bplan\b/i.test(value) && /\b(?:time|weather|news|crypto|bitcoin|btc)\b/i.test(value);
}

function parseAgentToolPlan(responseText) {
  const text = String(responseText || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start < 0 || end < start) throw new Error('Agent plan format incorrect.');
  const parsed = JSON.parse(text.slice(start, end + 1));
  const allowed = new Set(Object.keys(AGENT_TOOLS));
  return [...new Set(
    parsed
      .filter(item => typeof item === 'string')
      .map(item => item.trim().toLowerCase())
      .filter(item => allowed.has(item))
  )];
}

function fallbackAgentToolPlan(goal) {
  const g = String(goal || '').toLowerCase();
  const plan = [];
  if (g.includes('time')) plan.push('time');
  if (g.includes('weather')) plan.push('weather');
  if (g.includes('news') || g.includes('briefing')) plan.push('news');
  if (g.includes('crypto') || g.includes('bitcoin') || g.includes('btc')) plan.push('crypto');
  return plan.length ? plan : ['time', 'weather', 'news'];
}

async function runAgent(goal) {
  add('J.A.R.V.I.S: Agent mode active.', 'ai');
  add('J.A.R.V.I.S: Goal analyze chesthunna...', 'ai');
  const planPrompt = 'Return ONLY a JSON array of tools from ["time","weather","news","crypto"] needed for this goal. Goal: ' + JSON.stringify(String(goal));
  let toolsToRun;
  try {
    toolsToRun = parseAgentToolPlan(await callGeminiRaw(planPrompt));
  } catch (error) {
    toolsToRun = fallbackAgentToolPlan(goal);
  }
  const results = {};
  for (let i = 0; i < toolsToRun.length; i++) {
    const tool = toolsToRun[i];
    add('J.A.R.V.I.S: [' + (i + 1) + '/' + toolsToRun.length + '] ' + AGENT_TOOL_NAMES[tool] + ' tool run chesthunna...', 'ai');
    try {
      results[tool] = await AGENT_TOOLS[tool]();
    } catch (e) {
      results[tool] = 'Tool error';
    }
  }
  add('J.A.R.V.I.S: Results combine chesthunna...', 'ai');
  const summaryPrompt = 'Goal: ' + JSON.stringify(String(goal)) + '. Tool results: ' + JSON.stringify(results) + '. Give concise Telugu/English summary.';
  return await callGemini(summaryPrompt);
}

// ===== 4. GEMINI BRAIN =====
async function callGeminiRaw(promptText, contentsOverride = null) {
  if (!API_KEY) throw new Error('Gemini API key is missing.');
  const contents = contentsOverride || [{ role: 'user', parts: [{ text: promptText }] }];
  let lastError;

  for (const m of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(API_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents })
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return reply;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('All Gemini models failed.');
}

async function callGemini(p) {
  const contents = MEMORY.slice(-12).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
  contents.push({ role: 'user', parts: [{ text: p }] });
  const reply = await callGeminiRaw(p, contents);

  MEMORY.push({ role: 'user', text: p }, { role: 'model', text: reply });
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY.slice(-30)));
  return reply;
}
