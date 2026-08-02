# Meghdad Fadaee — Portfolio

[![Build and deploy GitHub Pages](https://github.com/MeghdadFadaee/MeghdadFadaee.github.io/actions/workflows/pages.yml/badge.svg)](https://github.com/MeghdadFadaee/MeghdadFadaee.github.io/actions/workflows/pages.yml)

Source code for [meghdadfadaee.github.io](https://meghdadfadaee.github.io/), the English portfolio of Meghdad Fadaee, a backend engineer and system architect. The site presents professional experience, selected projects, and six detailed engineering case studies through a game-inspired interface.

![Portfolio preview](assets/preview.png)

## Highlights

- Fully static output with no client-side project-data requests
- Project cards and case studies generated from one JSON data source
- Responsive, game-inspired UI built with HTML and Tailwind CSS
- Semantic HTML, keyboard-friendly navigation, and accessible labels
- Canonical URLs, Open Graph metadata, Twitter cards, JSON-LD, `robots.txt`, and a generated sitemap
- Automated validation, tests, and GitHub Pages deployment

## How the site is built

The source HTML files act as templates. During the build, Node.js reads [`api/projects.json`](api/projects.json), validates its contents, and generates:

- the project grid on the homepage;
- six static case-study pages under `/projects/<slug>/`;
- `sitemap.xml` containing the homepage and published case studies; and
- the production stylesheet compiled from [`src/styles.css`](src/styles.css).

The complete deployable site is written to `dist/`. That directory is generated, excluded from Git, and must not be edited manually.

```text
api/projects.json
        │
        ▼
scripts/build.mjs ──► Homepage project cards
                  ├─► Static case-study pages
                  ├─► sitemap.xml
                  └─► dist/ GitHub Pages artifact
```

## Requirements

- Node.js 22 or newer
- npm

## Local development

Install the locked dependencies and run the complete verification pipeline:

```bash
npm ci
npm run verify
```

Preview the generated site locally:

```bash
python3 -m http.server 4173 --directory dist
```

Then open [http://127.0.0.1:4173/](http://127.0.0.1:4173/).

There is no development server or file watcher. Run `npm run build` again after changing a template, stylesheet, script, or project entry.

## Available commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Generate the static pages and sitemap, then compile and minify the CSS |
| `npm test` | Run the project-data and case-study unit tests |
| `npm run check` | Validate the generated HTML, links, metadata, structured data, assets, and sitemap |
| `npm run verify` | Run the production build, tests, and generated-site checks |

## Updating projects

[`api/projects.json`](api/projects.json) is the single source of truth for portfolio content. Each item in `projects` produces one homepage card.

A project card includes:

- `title`, `summary`, `accent`, and `icon`;
- one or more technology `tags`; and
- a `cta` describing its fallback action.

Add a `caseStudy` object to generate a dedicated page and change the card action to **View Quest**. Case-study data includes SEO text, role and timeline information, metrics, architecture, implementation steps, challenges, outcomes, technology stack, and supporting links.

After editing the JSON:

1. Update the top-level `updatedAt` date.
2. Run `npm run verify`.
3. Review the homepage and affected case-study pages in `dist/`.
4. Commit and push the source changes to `main`.

The validators reject malformed entries, duplicate project titles or case-study slugs, unsafe URLs, unsupported icons or badge styles, invalid colors, incomplete case studies, and HTML or SEO regressions.

> The current publishing contract requires exactly six case studies. If that number intentionally changes, update the corresponding assertions in `scripts/build.mjs` and `scripts/check.mjs` together with the content.

## Repository structure

| Path | Description |
| --- | --- |
| `index.html` | English homepage template and lightweight page interactions |
| `project.html` | Shared case-study page template |
| `api/projects.json` | Structured project and case-study content |
| `src/styles.css` | Tailwind entry point and custom visual styles |
| `scripts/build.mjs` | Static-site build orchestration |
| `scripts/projects.mjs` | Project validation and card rendering |
| `scripts/case-studies.mjs` | Case-study validation, rendering, schema, and sitemap generation |
| `scripts/*.test.mjs` | Node.js unit tests |
| `scripts/check.mjs` | Production-output and SEO contract checks |
| `assets/` | Images, fonts, and other public assets |
| `fa/` | Legacy Persian page, copied to the deployment unchanged |
| `.github/workflows/pages.yml` | GitHub Pages build and deployment workflow |

## SEO and structured data

The generated site includes:

- unique titles, descriptions, and canonical URLs;
- index/follow directives;
- Open Graph and Twitter preview metadata;
- a `ProfilePage`, `Person`, and `WebSite` graph on the homepage;
- `TechArticle` and `BreadcrumbList` structured data on case studies;
- a 1200×630 social preview image;
- a generated XML sitemap; and
- a `robots.txt` file pointing search engines to the sitemap.

These requirements are enforced by `npm run check` so generated pages cannot be deployed silently with missing core metadata.

## Deployment

The [GitHub Actions workflow](.github/workflows/pages.yml) runs for pushes and pull requests targeting `main`:

1. Install dependencies with `npm ci`.
2. Run `npm run verify`.
3. Upload `dist/` as the GitHub Pages artifact.
4. Deploy the artifact for non-pull-request runs.

Pull requests are built and validated but are not deployed. The workflow can also be started manually from the GitHub Actions page.

## Contact

- Website: [meghdadfadaee.github.io](https://meghdadfadaee.github.io/)
- GitHub: [@MeghdadFadaee](https://github.com/MeghdadFadaee)
- Telegram: [@MeghdadFadaee](https://t.me/MeghdadFadaee)
- Email: [MeghdadFadaee@gmail.com](mailto:MeghdadFadaee@gmail.com)
