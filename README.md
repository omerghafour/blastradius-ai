# BlastRadius AI — Version 4

**Live portfolio demo:** https://omerghafour.github.io/blastradius-ai/

An interactive operational dependency and failure-impact simulator with **Gemini-powered investigation** and professional, evidence-backed report exports.

## Version 4 — Investigation report studio

1. Select a failure origin and click **Run impact simulation**.
2. Scroll to **Investigation report studio**.
3. Choose **Build evidence report** (fully local) or **Generate with Gemini** (requires previously configured private gateway URL, `DEMO_ACCESS_CODE`, and the data-sharing checkbox in the AI assistant panel).
4. Review the report preview, including:
   - Deterministic executive summary and illustrative impact metrics.
   - Optional Gemini commentary with requested evidence IDs.
   - Evidence-backed findings with path references like `SYS-001`.
   - Suggested investigation order based on illustrative business exposure.
   - Explicit scope, assumptions, and limitations.
5. Use **Export report HTML** to download a standalone professional report, or **Print / PDF** to open the printable view.

The report is generated in the browser. Graph paths and metrics are **not inferred by Gemini**; they come from breadth-first traversal of the imported model. Gemini commentary is interpretation, and users must review it critically against the evidence register.

**Existing V2/V3 capabilities remain:** CSV/JSON ingestion, interactive graph, custom failure simulation, local investigation chatbot, secure Gemini gateway mode, and original V2 export.

## Architecture

```text
GitHub Pages: index.html + styles.css
    ├── app.js     (graph model, import, deterministic analysis)
    ├── analyst.js (local Q&A, optional private Gemini gateway)
    └── report.js  (V4 reporting UI, evidence register, AI commentary, export)
                        │
                        └── /analyze → Cloudflare Worker
                                          └── Gemini API (server-side secret)
```

No new Worker endpoint is required for V4. The pre-existing `POST /analyze` interface is reused. If your existing Gemini assistant works, V4 uses the same gateway URL, access code and consent checkbox.

## Security and appropriate use

- Never put Gemini API keys in GitHub or browser source code. Keep `GEMINI_API_KEY` and `DEMO_ACCESS_CODE` as private Cloudflare Worker secrets. See [Worker deployment instructions](worker/README.md).
- Only submit fictional data or data you are authorized to transmit. Google's free-tier API requests may be used to improve its products.
- AI-generated commentary may contain inaccuracies, including incorrect evidence references. The deterministic paths and model data are shown separately for review.
- The financial impact values are user-provided *illustrative hourly exposure assumptions*, not measured losses. User counts may overlap.
- No actual infrastructure monitoring, real failure detection, failover modeling, downtime probabilities or recovery SLAs are provided.
- Don't share the private demo access code publicly without server-side rate limiting, quota controls and abuse safeguards.
- Imported data is processed in the browser for local analysis, but it is sent to Gemini through the Worker only when the user explicitly enables AI mode and confirms sharing. Exported HTML reports contain the graph evidence from the selected simulation.

## Code organization

- `index.html` — application structure and V4 report studio
- `styles.css` — dark app UI and responsive report preview
- `app.js` — graph analysis, import and original impact export
- `analyst.js` — grounded local Q&A and private Gemini analysis
- `report.js` — executive summary, Gemini narrative, evidence register and standalone HTML/PDF-print export
- `worker/` — Cloudflare secure API proxy (already deployed separately)
- `samples/` — fictional data samples
- `tests/` — existing graph checks

## Deploy

The site is hosted by **GitHub Pages** from `main`. Changes to the frontend files automatically publish through the existing Pages configuration. The Cloudflare Worker is a separate deployment and is unchanged in V4.

## Portfolio positioning

An applied solution architecture demonstration showing data modeling, API integration, graph traversal, AI-grounded analysis, evidence traceability and reporting design.
