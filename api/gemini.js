// Vercel Serverless function to proxy Gemini requests
// Place this file in your repository at /api/gemini.js (Vercel will deploy as serverless function).
// Requires environment variable: GEN_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const API_KEY = process.env.GEN_API_KEY;
  const MODEL = process.env.GEN_MODEL || 'gemini-mini';
  // Defensive check: reject obvious placeholder values so deploys don't accidentally use them.
  const PLACEHOLDER = '<PASTE_YOUR_API_KEY_HERE_OR_USE_PROXY>';
  if (!API_KEY || API_KEY.trim().length === 0) {
    return res.status(500).json({ error: 'GEN_API_KEY not set in environment. Set GEN_API_KEY in Vercel Environment Variables.' });
  }
  if (API_KEY === PLACEHOLDER) {
    return res.status(400).json({ error: 'GEN_API_KEY appears to be a placeholder. Replace it with your actual API key in the Vercel project settings (Environment Variables) before deploying.' });
  }

  try {
    // Attempt to call the Google Generative Language REST endpoint.
    // Note: API shapes and paths change; this implementation sends a simple "text prompt" wrapper
    // and returns the raw response. Adjust the request body if your API requires a different shape.
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generate`;
    const body = {
      prompt: { text: prompt }
    };

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(body)
    });

    const json = await r.json();

    // Try to extract a useful reply if present
    if (json && json.outputs && json.outputs[0] && json.outputs[0].content) {
      return res.status(200).json({ reply: json.outputs[0].content, raw: json });
    }
    // fallback: return the whole response
    return res.status(200).json({ reply: JSON.stringify(json), raw: json });
  } catch (err) {
    console.error('Proxy error', err && err.stack || err);
    return res.status(500).json({ error: (err && err.message) || String(err) });
  }
}
