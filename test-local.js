import fetch from 'node-fetch';

const url = process.env.URL || 'http://localhost:3000/api/gemini';
const body = { prompt: 'Hello from local test' };

(async function(){
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const txt = await res.text();
    try {
      console.log('Status:', res.status, JSON.parse(txt));
    } catch (e) {
      console.log('Status:', res.status, txt);
    }
  } catch (err) {
    console.error('Request failed:', err);
    process.exit(1);
  }
})();
