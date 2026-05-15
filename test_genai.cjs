const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({apiKey: "MOCK"});
// mock the node native WebSocket used by genai!
const ws = require('ws');

class MockWS {
    constructor(url) {
        console.log("WS URL:", url);
        this.readyState = 1;
    }
    send(data) {
        console.log("WS Data sent:", typeof data === 'string' ? data : data.toString());
    }
    on(event, handler) {
        if (event === 'open') setTimeout(handler, 10);
    }
    once(event, handler) {}
    removeAllListeners() {}
}

const originalWebSocket = global.WebSocket;
try {
    const genaiLive = require('@google/genai/dist/node/index.cjs');
    // I don't know exactly what they import for WS, but I'll patch global and require('ws').
} catch (e) {}

Object.assign(ws.prototype, MockWS.prototype);
ws.WebSocket = MockWS;

async function test() {
  const session = await ai.live.connect({ model: 'models/gemini-2.0-flash-exp' });
  await session.sendRealtimeInput([{
    mimeType: "audio/pcm;rate=16000",
    data: "base64data"
  }]);
}
test().catch(e => console.error(e.message));
