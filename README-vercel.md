Vercel serverless proxy for Desmos AI (Gemini)

This project contains a small serverless proxy intended for Vercel (or any Node-compatible serverless host).

Files added
- /api/gemini.js  - Vercel serverless function that proxies requests to the Generative Language API.

Environment
- GEN_API_KEY  - Your Gemini/Generative Language API key (set in Vercel dashboard as an Environment Variable)
- GEN_MODEL    - Optional model name (default: gemini-mini)

How it works
- Frontend calls POST /api/gemini with JSON { prompt: string }
- The serverless function forwards the request to the Generative Language API using the server-side API key
- The function returns JSON { reply, raw } where reply is the extracted assistant text (when available)

Deploy steps (GitHub + Vercel)
1. Create a GitHub repository for the project and push the files.
2. In Vercel, import the GitHub repo.
3. In Vercel Project Settings -> Environment Variables, set:
   - GEN_API_KEY = <your_api_key>
   - GEN_MODEL = gemini-mini (optional)
4. Deploy. The function will be available at https://<your-vercel-domain>/api/gemini

Local testing (optional)
- You can test the function locally with Vercel CLI or by running a small Express server that mounts the file.

Security note
- Do NOT commit your API key to the repository. Use Vercel environment variables.
- The HTML in this repository currently contains an embedded API key for quick local testing; remove it before publishing.

If the generative API schema changes
- The request body and response shape for the Generative Language API may change across versions. If the function returns surprising output, inspect the `raw` field in the response and adapt extraction logic accordingly.
