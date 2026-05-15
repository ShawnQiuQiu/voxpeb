const https = require('https');
https.get('https://raw.githubusercontent.com/google-gemini/cookbook/main/gemini-2/live_api/live_api_starter.py', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const lines = data.split('\n');
    let start_printing = false;
    lines.forEach(line => {
      if (line.includes('send(')) {
        start_printing = true;
      }
      if (start_printing) console.log(line);
      if (start_printing && line.includes('}')) {
        // start_printing = false;
      }
    });
  });
}).on('error', (err) => {
  console.log("Error: " + err.message);
});
