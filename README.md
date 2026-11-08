# BlastRadius AI — Operational Dependency Simulator

A browser-based proof of concept showing how outages propagate through an enterprise dependency graph. Built as a portfolio demo for solution architecture and technical prototyping.

**Live demo:** After enabling GitHub Pages, add your published site URL here.

## What it does

- Choose among three simulated failure origins (identity provider, customer database, core network).
- Visualize affected infrastructure and services on an interactive SVG dependency graph.
- See the impact paths and simulated user/business exposure.
- Click nodes to inspect how they relate to the incident.

## Run it

Open `index.html` in a modern browser. No build, account, API keys, backend, or dependencies are required.

## Publish with GitHub Pages

1. Create a **public** GitHub repository named `blastradius-ai`.
2. Upload the **contents of this folder** (`index.html`, `README.md`, `.nojekyll`) to the repository root. Do **not** upload the ZIP itself.
3. In GitHub, choose **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select `main` and `/(root)`, then **Save**.
6. Your site URL will normally be `https://YOUR-USERNAME.github.io/blastradius-ai/` (replace YOUR-USERNAME).

## Architecture

`Static HTML + CSS + JavaScript → directed dependency graph → reachability traversal → impact summary + SVG visualization`

The model uses eight fictional system nodes and predefined directed dependencies. Impact counts and estimated financial exposure are **illustrative assumptions**, not predictions or measured outcomes. No external services are contacted and no user data is collected by the app.

## Suggested next improvements

- Import user-provided CSV/JSON of assets and dependencies.
- Add graph editing and a scenario builder.
- Move impact logic into a tested Python/FastAPI service.
- Add an evidence-backed explanation panel; distinguish AI commentary from deterministic results.
- Document security assumptions and add automated tests.

## Portfolio positioning

**Problem:** Teams lack visibility into downstream consequences of shared-service outages.

**Approach:** Represent system dependencies as a graph and calculate downstream reachability when a node fails.

**Deliverable:** An interactive, explainable customer demo designed for solution discovery and PoC discussions.

> Note: “AI” is the project brand; this initial version uses graph algorithms, **not** a trained machine-learning model or LLM.
