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
  // Guard: common misconfiguration is accidentally placing the API key into GEN_MODEL.
  // Google API keys often start with "AIza"; detect that and return a clear error.
  const looksLikeApiKey = (s) => typeof s === 'string' && (/^AIza[A-Za-z0-9_-]{20,}$/.test(s) || (s.length > 30 && /[A-Za-z0-9_-]{20,}/.test(s)));
  if (!API_KEY && looksLikeApiKey(MODEL)) {
    console.error('Detected what looks like an API key in GEN_MODEL. Did you put your API key into GEN_MODEL by mistake?');
    return res.status(400).json({ error: 'Detected API key in GEN_MODEL. Set your API key in the GEN_API_KEY environment variable and set GEN_MODEL to the model name (or set GEN_ENDPOINT to the full upstream URL).' });
  }
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
  // Allow overriding the full upstream endpoint via GEN_ENDPOINT env var for flexibility
  // (useful if the provider's path or model naming differs in your account).
  const endpoint = process.env.GEN_ENDPOINT || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generate`;
  console.log('Proxy will call upstream endpoint:', endpoint, 'MODEL env:', process.env.GEN_MODEL || MODEL);
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

    // Read response body as text first to avoid JSON.parse errors on empty/non-JSON bodies
    const txt = await r.text();
    let json = null;
    try {
      if (txt && txt.length) json = JSON.parse(txt);
    } catch (parseErr) {
      // keep json as null and continue; we'll include raw text in error/fallbacks
      console.warn('Failed to parse upstream response as JSON:', parseErr && parseErr.message);
    }

    if (!r.ok) {
      // Return a helpful error including status and any body text for debugging
      console.error('Upstream API returned error', r.status, r.statusText, txt);
      const bodyPreview = txt ? (txt.length > 2000 ? txt.slice(0, 2000) + '... (truncated)' : txt) : '';
      return res.status(500).json({ error: `Upstream returned ${r.status} ${r.statusText}`, body: bodyPreview });
    }

    // Try to extract a useful reply if present in parsed JSON
    if (json && json.outputs && json.outputs[0] && json.outputs[0].content) {
      return res.status(200).json({ reply: json.outputs[0].content, raw: json });
    }

    // If we parsed JSON but didn't find expected fields, return the parsed JSON
    if (json) {
      return res.status(200).json({ reply: JSON.stringify(json), raw: json });
    }

    // As a last resort, return the raw text body (could be plain text or an empty string)
    return res.status(200).json({ reply: txt, rawText: txt });
  } catch (err) {
    console.error('Proxy error', err && err.stack || err);
    return res.status(500).json({ error: (err && err.message) || String(err) });
  }
}
