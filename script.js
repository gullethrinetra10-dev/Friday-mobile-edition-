
"use strict";

// ========================================
// 1. GEMINI API CONFIGURATION
// ========================================

const MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-latest"
];

let API_KEY = localStorage.getItem("jarvis_key") || "";

if (!API_KEY) {
    API_KEY = prompt("Enter your Gemini API Key:");

    if (API_KEY) {
        API_KEY = API_KEY.trim();
        localStorage.setItem("jarvis_key", API_KEY);
    }
}

// ========================================
// 2. HTML ELEMENTS
// ========================================

const chat = document.getElementById("chat");
const msg = document.getElementById("msg");
const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const clearBtn = document.getElementById("clear-btn");
const voiceStatus = document.getElementById("voice-status");

// ========================================
// 3. MEMORY
// ========================================

let MEMORY = [];

try {
    const saved = JSON.parse(
        localStorage.getItem("jarvis_memory") || "[]"
    );

    if (Array.isArray(saved)) {
        MEMORY = saved.filter(item =>
            item &&
            ["user", "model"].includes(item.role) &&
            typeof item.text === "string"
        ).slice(-30);
    }
} catch (error) {
    MEMORY = [];
}

function saveMemory() {
    try {
        localStorage.setItem(
            "jarvis_memory",
            JSON.stringify(MEMORY.slice(-30))
        );
    } catch (error) {
        console.error("Memory save error:", error);
    }
}

function clearMemory() {
    MEMORY = [];

    localStorage.removeItem("jarvis_memory");

    if (chat) {
        chat.innerHTML = "";
    }

    add("Memory cleared successfully, Boss.", "ai");
}

// ========================================
// 4. CHAT DISPLAY
// ========================================

function add(text, type = "ai") {
    if (!chat) return;

    const message = document.createElement("div");

    message.className = "message " + type;
    message.textContent = text;

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;
}

function setVoiceStatus(text, active = false) {
    if (!voiceStatus) return;

    voiceStatus.textContent = "● " + text;
    voiceStatus.className = active ? "on" : "";
}

// ========================================
// 5. TEXT TO SPEECH
// ========================================

function speak(text) {
    if (!("speechSynthesis" in window)) {
        add("Voice output is not supported in this browser.", "ai");
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "en-IN";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
}

// ========================================
// 6. API REQUEST HELPER
// ========================================

async function fetchJson(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("HTTP " + response.status);
    }

    return await response.json();
}

// ========================================
// 7. JARVIS TOOLS
// ========================================

async function handleTools(text) {

    const command = text.toLowerCase().trim();

    // TIME

    if (command === "time" || command === "current time") {
        return "Current time is " +
            new Date().toLocaleTimeString() + ", Boss.";
    }

    // DATE

    if (command === "date" || command === "today") {
        return "Today's date is " +
            new Date().toLocaleDateString() + ", Boss.";
    }

    // WEATHER

    if (command === "weather") {
        try {
            const response = await fetch(
                "https://wttr.in/?format=3"
            );

            if (!response.ok) {
                throw new Error("Weather unavailable");
            }

            return "Weather: " + await response.text();

        } catch (error) {
            return "Unable to fetch weather, Boss.";
        }
    }

    // NEWS

    if (command === "news") {
        try {
            const data = await fetchJson(
                "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=5"
            );

            const headlines = data.hits
                .map(item => item.title)
                .filter(Boolean)
                .join("\n");

            return headlines
                ? "Top News:\n" + headlines
                : "No news available.";

        } catch (error) {
            return "Unable to fetch news, Boss.";
        }
    }

    // BITCOIN

    if (command === "bitcoin" || command === "crypto") {
        try {
            const data = await fetchJson(
                "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
            );

            return "Bitcoin price: $" +
                data.bitcoin.usd + " USD";

        } catch (error) {
            return "Unable to fetch Bitcoin price.";
        }
    }

    // OPEN YOUTUBE

    if (/^(open\s+)?youtube$/i.test(command)) {
        window.open("https://youtube.com", "_blank");
        return "Opening YouTube, Boss.";
    }

    // OPEN GOOGLE

    if (/^(open\s+)?google$/i.test(command)) {
        window.open("https://google.com", "_blank");
        return "Opening Google, Boss.";
    }

    // GOOGLE SEARCH

    const googleMatch = text.match(
        /^(?:google\s+search|search\s+(?:on\s+)?google)(?:\s+for)?\s+(.+)$/i
    );

    if (googleMatch) {
        const query = googleMatch[1].trim();

        window.open(
            "https://www.google.com/search?q=" +
            encodeURIComponent(query),
            "_blank"
        );

        return "Searching Google for " + query;
    }

    // YOUTUBE SEARCH

    const youtubeMatch = text.match(
        /^(?:play|youtube(?:\s+search)?|search\s+(?:on\s+)?youtube)(?:\s+for)?\s+(.+)$/i
    );

    if (youtubeMatch) {
        const query = youtubeMatch[1].trim();

        window.open(
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(query),
            "_blank"
        );

        return "Searching YouTube for " + query;
    }

    // OPEN URL

    const urlMatch = text.match(
        /^(?:open|visit|go to)\s+(https?:\/\/\S+)$/i
    );

    if (urlMatch) {
        try {
            const url = new URL(urlMatch[1]);

            if (!["http:", "https:"].includes(url.protocol)) {
                return "Invalid URL.";
            }

            window.open(url.href, "_blank");

            return "Opening " + url.hostname;

        } catch (error) {
            return "Invalid URL.";
        }
    }

    // WIKIPEDIA SEARCH

    const searchMatch = text.match(
        /^(?:search|look up)\s+(.+)$/i
    );

    if (searchMatch) {
        const query = searchMatch[1].trim();

        try {
            const url =
                "https://en.wikipedia.org/w/api.php" +
                "?action=query&list=search&srlimit=1&srsearch=" +
                encodeURIComponent(query) +
                "&format=json&origin=*";

            const data = await fetchJson(url);

            const result = data?.query?.search?.[0];

            if (!result) {
                return "No Wikipedia result found.";
            }

            const snippet = result.snippet
                .replace(/<[^>]*>/g, "")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'");

            return result.title + ": " + snippet;

        } catch (error) {
            return "Wikipedia search failed.";
        }
    }

    return null;
}

// ========================================
// 8. GEMINI BRAIN
// ========================================

async function callGeminiRaw(promptText, history = null) {

    if (!API_KEY) {
        throw new Error("Gemini API key is missing.");
    }

    const contents = history || [
        {
            role: "user",
            parts: [{ text: promptText }]
        }
    ];

    let lastError = null;

    for (const model of MODELS) {

        try {
            const response = await fetch(
                "https://generativelanguage.googleapis.com/v1beta/models/" +
                model +
                ":generateContent?key=" +
                encodeURIComponent(API_KEY),
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        contents: contents
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data?.error?.message ||
                    "Gemini API HTTP " + response.status
                );
            }

            const reply =
                data?.candidates?.[0]?.content?.parts
                    ?.map(part => part.text || "")
                    .join("\n");

            if (reply) {
                return reply;
            }

            throw new Error("Gemini returned an empty response.");

        } catch (error) {
            lastError = error;

            console.error(
                "Gemini model failed:",
                model,
                error.message
            );
        }
    }

    throw lastError || new Error("All Gemini models failed.");
}

async function callGemini(promptText) {

    const history = MEMORY.slice(-12).map(item => ({
        role: item.role,
        parts: [{ text: item.text }]
    }));

    history.push({
        role: "user",
        parts: [{ text: promptText }]
    });

    const reply = await callGeminiRaw(
        promptText,
        history
    );

    MEMORY.push(
        { role: "user", text: promptText },
        { role: "model", text: reply }
    );

    MEMORY = MEMORY.slice(-30);

    saveMemory();

    return reply;
}

// ========================================
// 9. AGENT MODE
// ========================================

const AGENT_TOOLS = {
    time: () => handleTools("time"),
    weather: () => handleTools("weather"),
    news: () => handleTools("news"),
    crypto: () => handleTools("bitcoin")
};

function isAgentModeRequest(text) {
    return /\b(agent mode|run agent|use agent|briefing)\b/i.test(text);
}

function fallbackAgentToolPlan(goal) {

    const g = goal.toLowerCase();
    const plan = [];

    if (g.includes("time")) plan.push("time");
    if (g.includes("weather")) plan.push("weather");
    if (g.includes("news")) plan.push("news");

    if (
        g.includes("crypto") ||
        g.includes("bitcoin") ||
        g.includes("btc")
    ) {
        plan.push("crypto");
    }

    return plan.length ? plan : ["time", "weather", "news"];
}

async function runAgent(goal) {

    add("Agent Mode activated, Boss.", "ai");

    const planPrompt =
        'Return ONLY a JSON array using these tools: ' +
        '["time","weather","news","crypto"]. Goal: ' +
        JSON.stringify(goal);

    let toolsToRun;

    try {
        const response = await callGeminiRaw(planPrompt);

        const cleaned = response
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        const start = cleaned.indexOf("[");
        const end = cleaned.lastIndexOf("]");

        if (start < 0 || end < start) {
            throw new Error("Invalid agent plan");
        }

        const parsed = JSON.parse(
            cleaned.slice(start, end + 1)
        );

        toolsToRun = [
            ...new Set(
                parsed.filter(tool =>
                    Object.hasOwn(AGENT_TOOLS, tool)
                )
            )
        ];

    } catch (error) {
        toolsToRun = fallbackAgentToolPlan(goal);
    }

    const results = {};

    for (const tool of toolsToRun) {

        add("Running " + tool + " tool...", "ai");

        try {
            results[tool] = await AGENT_TOOLS[tool]();
        } catch (error) {
            results[tool] = "Tool failed.";
        }
    }

    return await callGemini(
        "Goal: " + goal +
        "\nTool results: " + JSON.stringify(results) +
        "\nGive a concise Telugu/English summary."
    );
}

// ========================================
// 10. SEND MESSAGE
// ========================================

let isProcessing = false;

async function sendMessage() {

    if (isProcessing) return;

    const text = msg.value.trim();

    if (!text) return;

    if (!API_KEY) {
        add("Please enter a valid Gemini API key.", "ai");
        return;
    }

    isProcessing = true;

    sendBtn.disabled = true;

    add("You: " + text, "user");

    msg.value = "";

    try {

        let reply = await handleTools(text);

        if (reply === null) {

            if (isAgentModeRequest(text)) {
                reply = await runAgent(text);
            } else {
                reply = await callGemini(text);
            }
        }

        add("J.A.R.V.I.S: " + reply, "ai");

        speak(reply);

    } catch (error) {

        console.error(error);

        add(
            "Error: " + error.message,
            "ai"
        );

    } finally {

        isProcessing = false;

        sendBtn.disabled = false;

        msg.focus();
    }
}

// ========================================
// 11. VOICE INPUT
// ========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let recognition = null;
let isListening = false;

if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = function () {

        isListening = true;

        setVoiceStatus("LISTENING", true);

        add("Listening, Boss...", "ai");
    };

    recognition.onresult = function (event) {

        const transcript =
            event.results[event.results.length - 1][0].transcript;

        msg.value = transcript;

        sendMessage();
    };

    recognition.onerror = function (event) {

        isListening = false;

        setVoiceStatus("VOICE ERROR", false);

        add(
            "Voice error: " + event.error,
            "ai"
        );
    };

    recognition.onend = function () {

        isListening = false;

        setVoiceStatus("READY", true);
    };

} else {

    setVoiceStatus("NOT SUPPORTED", false);
}

function activateMic() {

    if (!recognition) {

        add(
            "Speech recognition is not supported. Try Chrome.",
            "ai"
        );

        return;
    }

    if (isListening) {

        recognition.stop();

        return;
    }

    try {

        recognition.start();

    } catch (error) {

        add(
            "Microphone error: " + error.message,
            "ai"
        );
    }
}

// ========================================
// 12. BUTTON EVENTS
// ========================================

if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
}

if (micBtn) {
    micBtn.addEventListener("click", activateMic);
}

if (clearBtn) {
    clearBtn.addEventListener("click", clearMemory);
}

if (msg) {

    msg.addEventListener("keydown", function (event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();
        }
    });
}

// ========================================
// 13. INITIALIZATION
// ========================================

add("J.A.R.V.I.S initialized, Boss.", "ai");

add("Gemini Brain ready for commands.", "ai");

if (recognition) {
    setVoiceStatus("READY", true);
} else {
    setVoiceStatus("NOT SUPPORTED", false);
}

