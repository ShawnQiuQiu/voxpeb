const WebSocket = require('ws');

const apiKey = "MOCK"; // I'll replace this
const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

const ws = new WebSocket(url);

const setup = {
    "setup": {
        "model": `models/gemini-2.0-flash-exp`,
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": "Puck"}
                }
            }
        }
    }
};

ws.on('open', () => {
    ws.send(JSON.stringify(setup));
});

ws.on('message', (data) => {
    console.log("MSG:", data.toString());
});

ws.on('close', (code, reason) => {
    console.log("CLOSE:", code, reason.toString());
});
