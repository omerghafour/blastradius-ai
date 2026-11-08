# BlastRadius AI — V2

**Live:** https://omerghafour.github.io/blastradius-ai/

An interactive, browser-only dependency intelligence simulator for solution architecture and prototyping portfolios. This is a **deterministic graph-analysis demo**, not an AI model or incident monitoring product.

## Features

- Import your own **JSON model** or select **two CSV files together** (`assets.csv` and `dependencies.csv`).
- Explore a clickable, directional dependency graph; search systems and zoom in/out.
- Simulate failures from **any node** and visualize possible cascading effects.
- Inspect each node and see its **shortest explanatory dependency path** from the failed origin.
- Export a **self-contained HTML impact report** with methods and assumptions; print or save the report as PDF from the browser.
- No backend, account, dependencies, external API requests, or uploaded data storage. Files are processed within the browser. Avoid sharing confidential information in screenshots or exported reports.

## Publish on your existing GitHub Pages site

1. Download and extract the V2 ZIP.
2. Open https://github.com/omerghafour/blastradius-ai and choose **Add file → Upload files**.
3. Upload `index.html`, `app.js`, `styles.css`, `.nojekyll`, and the **samples** folder into the repository root; also replace `README.md`.
4. Commit changes to `main`. GitHub Pages (branch: `main`, folder: `/ (root)`) will publish the update at https://omerghafour.github.io/blastradius-ai/ .
5. Hard-refresh the website if your browser shows the old version.

## Run locally

Open `index.html` in a browser for the built-in dataset. Some browsers restrict local file access, but the import control works because it reads user-selected files. For a local HTTP server:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000.

## Data model

JSON:

```json
{
  "name": "Example environment",
  "nodes": [
    {"id":"db","label":"Database","type":"data"},
    {"id":"portal","label":"Customer Portal","type":"business","users":100,"exposure":2500}
  ],
  "edges": [{"from":"db","to":"portal"}]
}
```

- `id` unique string, `label` display name, `type` one of `infrastructure`, `data`, `application`, `business`.
- Optional: `description`, `users`, `exposure` (non-negative numbers; user-count and EUR per hour). Only **business** nodes contribute to business metric totals.
- Direction: **A → B means B depends on A**. A failure at A can propagate to B.
- CSV asset columns: `id,label,type,users,exposure,description` (optional fields may be blank).
- CSV edge columns: `from,to`.
- Maximum 250 nodes, 1,500 edges, and 3 MB per file to keep the browser responsive.

## Algorithm and limitations

A breadth-first search finds reachable nodes and reconstructs **one shortest path** from the selected failure origin. Cyclic graphs are supported for traversal (the visual layout is only approximate). The model treats dependencies as unconditional, so these are *potential* impacts, not observed outages. It does not model failover, redundancy, probability, recovery times, or partial degradation. User counts may overlap between services and are summed without deduplication. Exposure values are illustrative assumptions, not forecasts.

## Tests

With Node.js installed:

```bash
node --test tests/graph.test.js
```

## Project structure

```text
index.html             Web application
styles.css             Responsive dark-mode interface
app.js                 Import, graph simulation, path reasoning, HTML reporting
samples/               Synthetic JSON and CSV input files
README.md              Usage and architecture
.nojekyll              GitHub Pages static publishing
```

### Architecture

`Local CSV / JSON → validation → in-memory graph → BFS impact analysis → SVG visualization + explanations → downloadable report`

## Future roadmap

- V3: optional evidence-grounded AI commentary and recommendation assistant via a secure backend.
- V4: FastAPI ingestion APIs, persistent graph storage, integration tests, Docker/Kubernetes.
- V5: Authorized monitoring API connectors and real events with appropriately scoped access.

**Portfolio note:** All bundled example organizations, dependencies, user counts, and exposure values are fictional.
