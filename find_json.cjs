const fs = require('fs');
const path = require('path');
function search(dir) {
    for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) search(p);
        else if (p.endsWith('.js') && !p.includes('test')) {
            const buf = fs.readFileSync(p, 'utf8');
            if (buf.includes('realtimeInput')) {
                console.log(p);
                const lines = buf.split('\n');
                for (let i = 0; i < Math.min(lines.length, 500); i++) {
                    if (lines[i].includes('realtimeInput')) {
                        console.log(lines.slice(i-2, i+15).join('\n'));
                        break;
                    }
                }
            }
        }
    }
}
search('node_modules/@google/genai');
