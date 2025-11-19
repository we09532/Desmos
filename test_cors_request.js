import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const PROXY = process.env.LOCAL_PROXY || 'http://localhost:3001/api/gemini';
const prompt = process.env.TEST_PROMPT || 'Hello from local test via CORS proxy';

async function run() {
  console.log('Posting prompt to', PROXY);
  try {
    const resp = await fetch(PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const text = await resp.text();
    console.log('Status:', resp.status);
    try {
      const json = JSON.parse(text);
      console.log('Response JSON:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('Response Text:', text);
    }
  } catch (err) {
    console.error('Error calling proxy:', err && err.message);
  }
}

run();
