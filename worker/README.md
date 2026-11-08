# BlastRadius AI — secure AI gateway

This Cloudflare Worker securely calls OpenAI's Responses API for the GitHub Pages simulation. It does not itself host the website.

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
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put DEMO_ACCESS_CODE
```

Use a long random access code (at least 24 random characters). Configure API budget limits in your OpenAI Platform account. Consider Cloudflare WAF rate limiting for `/analyze` before giving the access code to anybody.

4. Find the deployed `https://blastradius-ai-gateway.<your-subdomain>.workers.dev` URL in Wrangler output. Visit the BlastRadius AI website, run a simulation, choose **AI via secure gateway**, paste the Worker URL and private demo access code, confirm data sharing, and ask a question.

**Never publish the access code** in GitHub, a webpage, screenshots or your portfolio. Only the public Worker URL belongs in the interface. Every AI request consumes OpenAI API credits.

## How it works

- `POST /analyze`: validates the caller origin, private demo access code and bounded JSON graph evidence, then calls the OpenAI Responses API.
- `GET /health`: returns a non-secret service status.
- The API key and access code are stored as Cloudflare Worker secrets.
- CORS permits the `https://omerghafour.github.io` browser origin, but CORS is not authentication. The secret access code is required. Configure an additional Cloudflare WAF rate limit to reduce credential guessing and cost abuse.
- Only fictional or properly authorized data may be sent. The dataset travels to the OpenAI API for analysis; the local-mode engine makes no external requests.
- The model can explain only evidence submitted by the simulator. It does not independently verify real outages, redundancy, or financial losses.

## Troubleshooting

- 401: wrong access code; recheck `DEMO_ACCESS_CODE` secret.
- 403: wrong browser origin (only the published portfolio origin is allowed).
- 503: missing secrets. Use `wrangler secret put` for both values.
- 429: OpenAI API usage limit, or rate limit.
- 502: OpenAI API network/provider error; check Worker logs using `npx wrangler tail`.

**Development caveat:** No server-side per-user rate limiter is included. Do not publish access credentials without adding rate limiting and a budget cap.
