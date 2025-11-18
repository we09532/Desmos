# Desmos AI Project

A locally-saved copy of the Desmos Scientific Calculator augmented with a small client-side integration that sends prompts starting with `@` to a serverless proxy which forwards them to the Google Generative Language (Gemini) API. The project keeps API secrets server-side (Vercel env var `GEN_API_KEY`) and logs interactions in `localStorage`.

## Quick overview

- Client (static HTML): `Desmos _ Scientific Calculator.html`
  - Detects Enter when the main expression begins with `@`.
  - Sends the text after `@` to the serverless proxy at `/api/gemini`.
  - Inserts the assistant reply into the first `span.dcg-mq-digit` whose visible text was `4` (fallback: logs to console).
  - Keeps no API key in client-side code.
  - Stores AI usage logs in `localStorage` under `desmos_ai_logs` and shows a floating log panel.

- Serverless proxy: `api/gemini.js`
  - Reads `process.env.GEN_API_KEY` and `process.env.GEN_MODEL` (optional).
  - Forwards POST `{ prompt: string }` to Google Generative Language REST endpoint and returns `{ reply, raw }`.
  - If `GEN_API_KEY` is missing the function returns an explanatory 500 error (safe default).

## Files of interest

- `Desmos _ Scientific Calculator.html` — main static page with the client integration scripts.
- `api/gemini.js` — Vercel serverless function that acts as the proxy (must be deployed on Vercel or another server with `GEN_API_KEY` set).
- `README.md` — this file.

## Why this design

API keys must not be embedded in public client code. The client in this project intentionally has no `GEMINI_API_KEY` and always calls the serverless `/api/gemini` proxy. That proxy is where you store the real `GEN_API_KEY` as an environment variable in your Vercel project.

## Deploying to Vercel (recommended)

1. Push this repository to GitHub (or another Git provider) and connect it to Vercel.
2. Ensure `api/gemini.js` is present at `/api/gemini.js` in the repo root — Vercel will deploy it as a serverless function.
3. In your Vercel project settings, add an Environment Variable named `GEN_API_KEY` with the value of your Gemini/Google API key.
   - Optionally add `GEN_MODEL` (defaults to `gemini-mini`).
4. Deploy the project. Vercel will serve the static HTML and host the serverless function at `https://<your-deploy>.vercel.app/api/gemini`.

### Test the proxy with PowerShell (local or deployed)

Use this `Invoke-RestMethod` PowerShell example to test the deployed proxy (replace the URL):

```powershell
Invoke-RestMethod -Method Post -Uri "https://<your-deploy>.vercel.app/api/gemini" -ContentType "application/json" -Body (@{ prompt = "Hello from test" } | ConvertTo-Json)
```

Expected successful response: JSON with `reply` and `raw` fields, e.g.

```json
{ "reply": "...assistant text...", "raw": { /* full API response */ } }
```

If you prefer `curl`:

```powershell
curl -X POST "https://<your-deploy>.vercel.app/api/gemini" -H "Content-Type: application/json" -d '{"prompt":"Hello from test"}'
```

Note: PowerShell's `curl` is an alias for `Invoke-WebRequest` — the `Invoke-RestMethod` example above is the native PowerShell approach.

## Local testing (optional)

- You can use `vercel dev` (Vercel CLI) to run functions locally if you have the Vercel CLI installed and configured. The serverless function will read `GEN_API_KEY` from your local environment variables when running locally.

## Security notes

- Do NOT put `GEN_API_KEY` into `Desmos _ Scientific Calculator.html` or any other client-side file. Doing so will expose your API key publicly.
- Keep `GEN_API_KEY` as a Vercel environment variable (or store it in your chosen hosting provider's protected environment variables).

## Troubleshooting

- `500 GEN_API_KEY not set` from `/api/gemini`:
  - Confirm you set `GEN_API_KEY` in the Vercel project settings (Environment Variables) for the correct branch (Production/Preview/Development) and re-deploy.

- `Proxy response not ok` or other HTTP status errors:
  - Check the serverless function logs in Vercel (Function logs) for the underlying error and verify the endpoint URL and model name.

- Client still shows console noise from Grammarly or chrome-extension:// URLs:
  - These artifacts are embedded in the saved HTML and cause console warnings only. If you want, you can remove the large Grammarly/CSS blocks from the HTML to shrink the file and silence the console; I can do that in a small, reversible patch.

## Next steps I can help with

- Add step-by-step Vercel deploy instructions (screenshots or exact menu choices).
- Remove Grammarly / chrome-extension references from the saved HTML to reduce file size and console noise.
- Add a small test harness script (Node or PowerShell) to exercise `/api/gemini` automatically.

---

If you'd like I can now (choose one):
- Update `README.md` with an example `.env` file and `vercel.json` (if you'd prefer a specific build/runtime),
- Or create a small `test-proxy.ps1` PowerShell test file to run the API test locally.

Which would you like next?