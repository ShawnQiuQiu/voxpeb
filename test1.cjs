const https = require('https');
https.get('https://raw.githubusercontent.com/google-gemini/cookbook/main/gemini-2/live_api/live_api_starter.py', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(d.includes('send') ? 'HAS SEND' : 'NO SEND'));
});
