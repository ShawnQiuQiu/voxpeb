const fs = require('fs');
const content = fs.readFileSync('node_modules/@google/genai/dist/genai.d.ts', 'utf8');
const lines = content.split('\n');
const startIndex = lines.findIndex(l => l.includes('declare interface LiveClientRealtimeInput'));
console.log(lines.slice(startIndex, startIndex + 15).join('\n'));
