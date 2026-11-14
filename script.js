const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const micBtn = document.getElementById('mic-btn');
const clearBtn = document.getElementById('clear-btn');
const camBtn = document.getElementById('cam-btn');
const imgInput = document.getElementById('img-input');

// Text-to-Speech (JARVIS speaking)
function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
}

// Add message to chat
function add(text, who) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.innerText = text;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

// Command Handler
function handleCommand(command) {
    const cmd = command.toLowerCase().trim();
    if (!cmd) return;

    add('YOU: ' + cmd, 'user');
    input.value = '';
    add('J.A.R.V.I.S: Processing...', 'ai');

    setTimeout(() => {
        let reply = "Systems operational. How may I assist you, Boss?";

        if (cmd.includes('hello') || cmd.includes('hi')) {
            reply = "Hello Boss, systems are online and ready.";
        } else if (cmd.includes('how are you') || cmd.includes('whats up')) {
            reply = "All diagnostics look green, Boss. Ready for action.";
        } else if (cmd.includes('name')) {
            reply = "I am J.A.R.V.I.S, your advanced personal AI assistant.";
        } else if (cmd.includes('time')) {
            reply = "The current time is " + new Date().toLocaleTimeString();
        } else if (cmd.includes('open google')) {
            reply = "Opening Google now, Boss.";
            window.open('https://www.google.com', '_blank');
        }

        chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
        speak(reply);
    }, 1000);
}

// Send Button Event
sendBtn.onclick = () => {
    handleCommand(input.value);
};

// Enter Key Support
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleCommand(input.value);
    }
});

// Clear Memory Button Event
clearBtn.onclick = () => {
    chat.innerHTML = '';
    speak("Memory cleared, Boss.");
};

// Camera Button Event
camBtn.onclick = () => {
    imgInput.click();
};

imgInput.onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
        add('YOU: [Uploaded an image for analysis]', 'user');
        setTimeout(() => {
            let reply = "Image received, Boss. Visual analysis module is active.";
            add('J.A.R.V.I.S: ' + reply, 'ai');
            speak(reply);
        }, 1000);
    }
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
            add('J.A.R.V.I.S: Listening...', 'ai');
        } catch (e) {
            console.log(e);
        }
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleCommand(transcript);
    };

    recognition.onerror = () => {
        add('J.A.R.V.I.S: Voice input error.', 'ai');
    };
} else {
    micBtn.style.display = 'none';
}
