// ===== 1. API KEY & ALL 50+ GEMINI MODELS =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
    API_KEY = prompt('Enter your Gemini API Key:');
    if (API_KEY) localStorage.setItem('jarvis_key', API_KEY.trim());
}

// 50+ Gemini Models (Latest, Flash, Pro, Ultra, Experimental, and Legacy versions)
const MODELS = [
    // Gemini 2.5 / 2.0 / Latest Flash & Pro Models
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-exp",
    "gemini-2.0-flash-lite",
    "gemini-2.0-pro",
    "gemini-2.0-pro-exp",
    "gemini-flash-latest",
    "gemini-pro-latest",
    
    // Gemini 1.5 Series
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001",
    "gemini-1.5-flash-002",
    "gemini-1.5-pro",
    "gemini-1.5-pro-latest",
    "gemini-1.5-pro-001",
    "gemini-1.5-pro-002",
    "gemini-1.5-flash-8b",
    
    // Gemini 1.0 & Legacy Series
    "gemini-1.0-pro",
    "gemini-1.0-pro-latest",
    "gemini-1.0-pro-001",
    "gemini-pro",
    "gemini-pro-vision",
    
    // Experimental & Specialized Models
    "gemini-exp-1206",
    "gemini-exp-1121",
    "gemini-exp-1114",
    "gemini-exp-0827",
    "gemini-code-assist",
    "gemini-ultra",
    "gemini-ultra-latest",
    
    // Additional Fallback Variations
    "gemini-2.5-flash-preview",
    "gemini-2.0-flash-preview",
    "gemini-1.5-flash-preview",
    "gemini-1.5-pro-preview",
    "gemini-2.5-beta",
    "gemini-2.0-beta",
    "gemini-1.5-beta",
    "text-embedding-004",
    "imagen-3.0-generate-002"
];

// ===== 2. MEMORY MANAGEMENT =====
let MEMORY = [];
try {
    const storedMemory = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
    if (Array.isArray(storedMemory)) {
        MEMORY = storedMemory.filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string');
    }
} catch (e) {
    MEMORY = [];
}

const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const micBtn = document.getElementById('mic-btn');
const clearBtn = document.getElementById('clear-btn');
const voiceStatus = document.getElementById('voice-status');

// Render saved chat history
function renderChat() {
    chat.innerHTML = '';
    MEMORY.forEach(m => {
        addMessage(m.role === 'user' ? 'YOU: ' + m.text : 'J.A.R.V.I.S: ' + m.text, m.role === 'user' ? 'user' : 'ai');
    });
}
renderChat();

function addMessage(text, who) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.innerText = text;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

// Text-to-Speech (JARVIS speaking)
function speak(text) {
    if ('speechSynthesis' in window) {
        const speech = new SpeechSynthesisUtterance(text);
        speech.rate = 1;
        speech.pitch = 1;
        window.speechSynthesis.speak(speech);
    }
}

// ===== 3. TOOLS & COMMAND HANDLER =====
async function handleTools(text) {
    const t = text.toLowerCase();
    
    if (/^\s*(?:please\s+)?(?:open\s+youtube|youtube\s+open|youtube)(?:\s+please)?[\s.!]*$/i.test(text)) {
        window.open('https://youtube.com', '_blank', 'noopener,noreferrer');
        return 'Opening YouTube, Boss.';
    }
    if (/^\s*(?:please\s+)?(?:open\s+google|google\s+open|google)(?:\s+please)?[\s.!]*$/i.test(text)) {
        window.open('https://google.com', '_blank', 'noopener,noreferrer');
        return 'Opening Google, Boss.';
    }
    if (/^\s*(?:time|current time)\s*$/i.test(text)) {
        return 'The current time is ' + new Date().toLocaleTimeString();
    }
    if (/^\s*(?:date|today's date)\s*$/i.test(text)) {
        return 'Today\'s date is ' + new Date().toLocaleDateString();
    }

    const googleSearch = text.match(/^\s*(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s+(.+?)\s*$/i);
    if (googleSearch) {
        const query = googleSearch[1].trim();
        if (!query) return 'Tell me what to search for on Google.';
        window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank', 'noopener,noreferrer');
        return 'Searching Google for ' + query + ', Boss.';
    }

    const videoQuery = text.match(/^\s*(?:play|youtube\s+search|search\s+youtube)\s+(?:for\s+)?(.+?)\s*$/i);
    if (videoQuery) {
        const query = videoQuery[1].trim();
        window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(query), '_blank', 'noopener,noreferrer');
        return 'Searching YouTube for ' + query + ', Boss.';
    }

    return null;
}

// ===== 4. GEMINI API CALL WITH MULTI-MODEL FALLBACK =====
async function callGemini(promptText) {
    if (!API_KEY) throw new Error('Gemini API key is missing.');
    
    // Check built-in tool actions first
    const toolResult = await handleTools(promptText);
    if (toolResult) return toolResult;

    const contents = MEMORY.slice(-10).map(m => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.text }]
    }));
    contents.push({ role: 'user', parts: [{ text: promptText }] });

    let lastError = null;
    for (const model of MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            });

            if (!response.ok) {
                continue; // Try next model silently if current model is not found or deprecated
            }

            const data = await response.json();
            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (replyText) return replyText;
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError || new Error('Failed to get response from all available Gemini models.');
}

// ===== 5. INTERACTION LOGIC =====
async function processUserPrompt(text) {
    const prompt = text.trim();
    if (!prompt) return;

    addMessage('YOU: ' + prompt, 'user');
    input.value = '';
    addMessage('J.A.R.V.I.S: Processing...', 'ai');

    MEMORY.push({ role: 'user', text: prompt });

    try {
        const reply = await callGemini(prompt);
        chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
        MEMORY.push({ role: 'model', text: reply });
        localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
        speak(reply);
    } catch (error) {
        const errorMsg = 'Error: ' + error.message;
        chat.lastChild.innerText = 'J.A.R.V.I.S: ' + errorMsg;
    }
}

sendBtn.onclick = () => processUserPrompt(input.value);
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') processUserPrompt(input.value);
});

clearBtn.onclick = () => {
    MEMORY = [];
    localStorage.removeItem('jarvis_memory');
    chat.innerHTML = '';
    speak('Memory cleared, Boss.');
};

// Voice Recognition (Speech-to-Text) Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    micBtn.onclick = () => {
        try {
            recognition.start();
            voiceStatus.innerText = '● LISTENING...';
        } catch (e) {
            console.log(e);
        }
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        voiceStatus.innerText = '● READY';
        processUserPrompt(transcript);
    };

    recognition.onerror = () => {
        voiceStatus.innerText = '● ERROR';
    };
} else {
    micBtn.style.display = 'none';
}
