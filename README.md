# Meghdad Fadaee Portfolio

The portfolio is deployed to GitHub Pages as a generated static site.

## Updating projects

`api/projects.json` is the single source of truth for project cards and case studies. Edit that file and push to `main`; the GitHub Actions workflow validates the JSON, renders semantic HTML, builds the CSS, and deploys the resulting `dist/` artifact.

Add a `caseStudy` object to a project to turn its card action into a `View Quest` link and generate `/projects/<slug>/index.html`. The build currently requires exactly six case studies. It also generates `dist/sitemap.xml` from those routes so the sitemap cannot drift from the deployed pages.

The build rejects duplicate titles or slugs, unsafe links, unsupported icons/styles, invalid colors, and missing required fields so a bad project entry cannot silently break the live page.

## Local validation

Requirements: Node.js 22 or newer.

```bash
npm install
npm run verify
python3 -m http.server 4173 --directory dist
```

Open `http://127.0.0.1:4173/` after starting the local server. Do not edit `dist/`; it is generated and intentionally ignored by Git.

The `<!-- PROJECT_CARDS -->` marker in `index.html` and the case-study markers in `project.html` are replaced only in the generated output. The source templates and JSON file are never rewritten.

The existing Persian page is copied to the deployment unchanged.
