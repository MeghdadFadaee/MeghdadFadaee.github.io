# Meghdad Fadaee Portfolio

The portfolio is deployed to GitHub Pages as a generated static site.

## Updating projects

`api/projects.json` is the single source of truth for project cards. Edit that file and push to `main`; the GitHub Actions workflow validates the JSON, renders semantic HTML cards, builds the CSS, and deploys the resulting `dist/` artifact.

The build rejects duplicate titles, unsafe links, unsupported icons/styles, invalid colors, and missing required fields so a bad project entry cannot silently break the live page.

## Local validation

Requirements: Node.js 22 or newer.

```bash
npm install
npm run verify
python3 -m http.server 4173 --directory dist
```

Open `http://127.0.0.1:4173/` after starting the local server. Do not edit `dist/`; it is generated and intentionally ignored by Git.

The `<!-- PROJECT_CARDS -->` marker in `index.html` is replaced only in the generated output. The source template and JSON file are never rewritten.

The existing Persian page is copied to the deployment unchanged.
