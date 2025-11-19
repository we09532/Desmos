import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

function looksLikeApiKey(s) {
  return typeof s === 'string' && (/^AIza[A-Za-z0-9_-]{20,}$/.test(s) || (s.length > 30 && /[A-Za-z0-9_-]{20,}/.test(s)));
}

app.post('/api/gemini', async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt' });

  const API_KEY = process.env.GEN_API_KEY;
  const MODEL = process.env.GEN_MODEL || 'gemini-mini';

  if (!API_KEY) {
    return res.status(500).json({ error: 'GEN_API_KEY not set in environment. Set GEN_API_KEY in .env or your environment.' });
  }

  if (!API_KEY && looksLikeApiKey(MODEL)) {
    return res.status(400).json({ error: 'Detected API key placed in GEN_MODEL. Set your API key in GEN_API_KEY and set GEN_MODEL to the model name.' });
  }

  const endpoint = process.env.GEN_ENDPOINT || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generate`;
  console.log('Local proxy calling upstream endpoint:', endpoint);

  try {
    // Support two upstream shapes:
    // 1) Generative Language simple generate: { prompt: { text } }
    // 2) Gemini generateContent: { contents: [{ parts: [{ text }] }] }
    const usesGenerateContent = endpoint.includes(':generateContent');
    const upstreamBody = usesGenerateContent
      ? { contents: [{ parts: [{ text: prompt }] }] }
      : { prompt: { text: prompt } };

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(upstreamBody)
    });

    const txt = await r.text();
    let json = null;
    try { if (txt && txt.length) json = JSON.parse(txt); } catch (e) { console.warn('Upstream JSON parse failed:', e && e.message); }

    if (!r.ok) {
      console.error('Upstream API returned error', r.status, r.statusText, txt);
      const bodyPreview = txt ? (txt.length > 2000 ? txt.slice(0, 2000) + '... (truncated)' : txt) : '';
      return res.status(500).json({ error: `Upstream returned ${r.status} ${r.statusText}`, body: bodyPreview });
    }

    // Try extract for generateContent shape first
    if (json && json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts && json.candidates[0].content.parts[0] && json.candidates[0].content.parts[0].text) {
      return res.status(200).json({ reply: json.candidates[0].content.parts[0].text, raw: json });
    }

    // Try previous outputs format
    if (json && json.outputs && json.outputs[0] && json.outputs[0].content) {
      return res.status(200).json({ reply: json.outputs[0].content, raw: json });
    }

    if (json) return res.status(200).json({ reply: JSON.stringify(json), raw: json });

    return res.status(200).json({ reply: txt, rawText: txt });
  } catch (err) {
    console.error('Local proxy error', err && err.stack || err);
    return res.status(500).json({ error: (err && err.message) || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Local Desmos AI proxy listening at http://localhost:${PORT}/api/gemini`);
});
