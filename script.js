
const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const micBtn = document.getElementById('mic');
const voiceStatus = document.getElementById('voice-status');

// Text-to-Speech Function (JARVIS Speaking)
function speak(text) {
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
}

// Add message to chat box
function add(text, who) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    d.innerText = text;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
}

// Handle User Input Response
function handleCommand(command) {
    const cmd = command.toLowerCase().trim();
    if (!cmd) return;

    add('YOU: ' + cmd, 'user');
    input.value = '';
    add('J.A.R.V.I.S: Processing...', 'ai');

    setTimeout(() => {
        let reply = "Systems online. How may I assist you, Boss?";
        
        if (cmd.includes('hello') || cmd.includes('hi')) {
            reply = "Hello Boss, all systems are fully operational.";
        } else if (cmd.includes('time')) {
            reply = "The current time is " + new Date().toLocaleTimeString();
        } else if (cmd.includes('open google')) {
            reply = "Opening Google for you, Boss.";
            window.open('https://www.google.com', '_blank');
        }

        chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
        speak(reply);
    }, 1000);
}

// Send Button Click Event
sendBtn.onclick = () => {
    handleCommand(input.value);
};

// Enter key support
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleCommand(input.value);
    }
});

// Voice Recognition (Speech-to-Text) Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    micBtn.onclick = () => {
        try {
            recognition.start();
            voiceStatus.innerText = "• LISTENING...";
            voiceStatus.className = "on";
        } catch (e) {
            console.log(e);
        }
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        voiceStatus.innerText = "• ONLINE";
        voiceStatus.className = "off";
        handleCommand(transcript);
    };

    recognition.onerror = () => {
        voiceStatus.innerText = "• ERROR";
        voiceStatus.className = "off";
    };
} else {
    micBtn.style.display = 'none'; // Hide if browser doesn't support
    console.warn("Speech Recognition not supported in this browser.");
}
