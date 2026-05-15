const fs = require('fs');
function readDirRecursive(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const fullPath = dir + '/' + f;
        if (fs.statSync(fullPath).isDirectory()) {
            readDirRecursive(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.d.ts')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('realtimeInput') || content.includes('RealtimeInput')) {
                console.log("MATCH", fullPath);
            }
        }
    }
}
readDirRecursive('node_modules/@google/genai');
