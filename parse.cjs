const fs = require('fs');
const d = JSON.parse(fs.readFileSync('discovery.json', 'utf8'));
const schemas = Object.keys(d.schemas).filter(k => k.includes('Bidi') || k.includes('Live'));
console.log('Schemas with Bidi or Live:', schemas);
