import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 3001;

// Very permissive CORS for local testing only
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function buildUpstreamOptions(prompt, opts = {}) {
  const model = process.env.GEN_MODEL || 'gemini-mini';
  const endpointEnv = process.env.GEN_ENDPOINT; // allow override
  let url;
  if (endpointEnv) {
    url = endpointEnv;
  } else {
    // default to generativelanguage endpoint form
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generate`;
  }

  // If the API key looks like an API key (starts with AIza), use ?key= for simple testing
  const apiKey = process.env.GEN_API_KEY;
  let headers = { 'Content-Type': 'application/json' };
  if (apiKey) {
    if (apiKey.startsWith('AIza')) {
      // keep key in query string
      const sep = url.includes('?') ? '&' : '?';
      url = url + sep + 'key=' + encodeURIComponent(apiKey);
    } else {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
  }

  // Detect if user wants the newer generateContent endpoint shape
  const useGenerateContent = (opts.useGenerateContent === true) || url.includes(':generateContent');

  const body = useGenerateContent
    ? {
        // new shape: contents -> parts
        contents: [ { parts: [ { text: prompt } ] } ]
      }
    : { prompt: { text: prompt } };

  return { url, headers, body };
}

app.post('/api/gemini', async (req, res) => {
  const prompt = req.body.prompt || req.body.text || (req.body && req.body.message) || '';
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body. Send { "prompt": "..." } or { "text": "..." }.' });
  }

  const opts = { useGenerateContent: req.body.useGenerateContent || false };
  const { url, headers, body } = buildUpstreamOptions(prompt, opts);

  console.log('[local_cors_proxy] Forwarding to upstream:', url);

  try {
    const upstreamResp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), timeout: 20000 });
    const text = await upstreamResp.text();

    if (!upstreamResp.ok) {
      console.warn('[local_cors_proxy] Upstream returned', upstreamResp.status, text.slice(0, 200));
      return res.status(502).json({ error: `Upstream ${upstreamResp.status} ${upstreamResp.statusText}`, bodyPreview: text.slice(0, 200) });
    }

    // Try to parse JSON, fall back to text
    try {
      const json = JSON.parse(text);
      return res.json({ ok: true, upstream: json });
    } catch (e) {
      return res.json({ ok: true, upstreamText: text });
    }
  } catch (err) {
    console.error('[local_cors_proxy] Error calling upstream', err && err.message);
    return res.status(500).json({ error: 'Error calling upstream', message: err && err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[local_cors_proxy] Listening on http://localhost:${PORT} - POST /api/gemini`);
  console.log('[local_cors_proxy] Set GEN_API_KEY, GEN_MODEL or GEN_ENDPOINT in .env to match your provider.');
});
