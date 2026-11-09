# BlastRadius AI — secure AI gateway

This Cloudflare Worker securely calls Google Gemini API for the GitHub Pages simulation. It does not itself host the website.

## Deploy (Cloudflare account required)

1. Install Node.js 20+ and sign in to Cloudflare.
2. From the repository root:

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

3. Set **two private secrets** (these commands prompt for values, do not type them into GitHub or chat):

```bash
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put DEMO_ACCESS_CODE
```

Use a long random access code (at least 24 random characters). Check free-tier quotas and API billing status in Google AI Studio. Consider Cloudflare WAF rate limiting for `/analyze` before giving the access code to anybody.

4. Find the deployed `https://blastradius-ai-gateway.<your-subdomain>.workers.dev` URL in Wrangler output. Visit the BlastRadius AI website, run a simulation, choose **AI via secure gateway**, paste the Worker URL and private demo access code, confirm data sharing, and ask a question.

**Never publish the access code** in GitHub, a webpage, screenshots or your portfolio. Only the public Worker URL belongs in the interface. Every AI request consumes Gemini API quota.

## How it works

- `POST /analyze`: validates the caller origin, private demo access code and bounded JSON graph evidence, then calls the Gemini generateContent API.
- `GET /health`: returns a non-secret service status.
- The API key and access code must be stored as Cloudflare Worker secrets.
- CORS permits the `https://omerghafour.github.io` browser origin, but CORS is not authentication. The secret access code is required. Configure an additional Cloudflare WAF rate limit to reduce credential guessing and cost abuse.
- Only fictional or properly authorized data may be sent. The dataset travels to the Gemini API for analysis; free-tier data may be used to improve Google's products. The local-mode engine makes no external requests.
- The model can explain only evidence submitted by the simulator. It does not independently verify real outages, redundancy, or financial losses.

## Troubleshooting

- 401: wrong access code; recheck `DEMO_ACCESS_CODE` secret.
- 403: wrong browser origin (only the published portfolio origin is allowed).
- 503: missing secrets. Use `wrangler secret put` for both values.
- 429: Gemini API usage limit, or rate limit.
- 502: Gemini API network/provider error; check Worker logs using `npx wrangler tail`.

**Development caveat:** No server-side per-user rate limiter is included. Do not publish access credentials without adding rate limiting and a budget cap.

## Gemini model and free tier

The Worker uses `gemini-3.1-flash-lite`. Check whether the model is available to your specific Gemini API project and region. Free-tier limits are subject to change, and Google may use free-tier prompts and responses to improve products. Use synthetic portfolio data only.

If the Worker has already been deployed, update the code with `npx wrangler deploy` after pulling the latest GitHub changes. The secrets must be configured in Cloudflare Workers, **not** in this repository or in the browser.

## Important for deployments created with Cloudflare's browser editor

Changing the GitHub file does **not** automatically update a Worker created through Cloudflare's Hello World editor. Open your Worker in Cloudflare Dashboard → **Edit Code**, replace its source with the latest [src/index.js](src/index.js) from GitHub, then click **Deploy**. Your existing Cloudflare secrets remain configured on the Worker.

If the AI gateway fails after redeployment, the UI now identifies the Gemini status and HTTP error category without revealing secret values. Check AI Studio for model availability, key restrictions, quotas and billing eligibility.
