const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({apiKey: "MOCK"});

async function test() {
    const origWS = global.WebSocket;
    global.WebSocket = class extends origWS {
        constructor(url) { 
            console.log("WS CONNECTED TO:", url);
            super(url);
        }
        send(msg) { console.log("PAYLOAD:", msg); super.send(msg); }
    };

    const session = await ai.live.connect({ model: "models/gemini-2.0-flash" });
    
    console.log("=== Sending Audio ===");
    session.sendRealtimeInput([{
        mimeType: "audio/pcm;rate=16000",
        data: "base64data"
    }]);

    console.log("=== Sending Content ===");
    session.sendClientContent({ turns: [{ role: "user", parts: [{ text: "Hello" }] }], turnComplete: true });
    
    await new Promise(r => setTimeout(r, 100));
}
test().catch(e => console.error(e));
