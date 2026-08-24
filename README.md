# Meghdad Fadaee — Portfolio

[![Build and deploy GitHub Pages](https://github.com/MeghdadFadaee/MeghdadFadaee.github.io/actions/workflows/pages.yml/badge.svg)](https://github.com/MeghdadFadaee/MeghdadFadaee.github.io/actions/workflows/pages.yml)

Source code for [megh.dad](https://megh.dad/), the multilingual portfolio of Meghdad Fadaee, a backend engineer and system architect. English is published at `/`, Persian at `/fa/`, and both present the same experience, 22 selected projects, and six engineering case studies through a game-inspired interface.

![Portfolio preview](assets/preview.png)

## Highlights

- Fully static output with no client-side project-data requests
- English and Persian content generated from complete, build-validated locale files
- Responsive LTR/RTL game-inspired UI built with shared HTML templates and Tailwind CSS
- Semantic HTML, keyboard-friendly navigation, and accessible labels
- Localized canonical URLs, reciprocal `hreflang`, Open Graph metadata, Twitter cards, JSON-LD, `robots.txt`, and generated sitemaps
- Automated validation, tests, and GitHub Pages deployment

## How the site is built

The source HTML files act as locale-neutral templates. During the build, Node.js reads [`content/en.json`](content/en.json) and [`content/fa.json`](content/fa.json), validates their complete translation and shared project contract, and generates:

- both localized homepages and their 22 project cards;
- six English pages under `/projects/<slug>/` and six Persian equivalents under `/fa/projects/<slug>/`;
- XML and plain-text sitemaps containing all 14 canonical pages and language alternates; and
- the production stylesheet compiled from [`src/styles.css`](src/styles.css).

The complete deployable site is written to `dist/`. That directory is generated, excluded from Git, and must not be edited manually.

The production origin is defined once in [`site.config.json`](site.config.json). The build uses it for canonical URLs, social metadata, structured data, both sitemaps, `robots.txt`, and the generated GitHub Pages `CNAME` file.

```text
content/en.json ─┐
                 ├─► scripts/build.mjs ──► English and Persian homepages
content/fa.json ─┘                       ├─► 12 static case-study pages
                                        ├─► localized sitemap.xml and sitemap.txt
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

Each locale has a complete source file: [`content/en.json`](content/en.json) and [`content/fa.json`](content/fa.json). Every item in `projects` produces one homepage card, and stable project IDs keep equivalent content aligned between languages.

A project card includes:

- `title`, `summary`, `accent`, and `icon`;
- one or more technology `tags`; and
- a `cta` describing its fallback action.

Add a `caseStudy` object to generate a dedicated page and change the card action to **View Quest**. Case-study data includes SEO text, role and timeline information, metrics, architecture, implementation steps, challenges, outcomes, technology stack, and supporting links.

When updating a project, make the corresponding change in both locale files. URLs, IDs, order, metrics, technology stacks, and proof-link targets must remain identical; display text is translated.

After editing the JSON files:

1. Update the top-level `updatedAt` date.
2. Run `npm run verify`.
3. Review the homepage and affected case-study pages in `dist/`.
4. Commit and push the source changes to `main`.

The validators reject missing translations, mismatched IDs/order/slugs/metrics/proof links, malformed entries, duplicate IDs or case-study slugs, unsafe URLs, unsupported icons or badge styles, invalid colors, incomplete case studies, and HTML or SEO regressions.

> The current publishing contract requires exactly six case studies. If that number intentionally changes, update the corresponding assertions in `scripts/build.mjs` and `scripts/check.mjs` together with the content.

## Repository structure

| Path | Description |
| --- | --- |
| `index.html` | Locale-neutral homepage shell |
| `project.html` | Shared case-study page template |
| `content/en.json` | Complete English UI, profile, project, and case-study content |
| `content/fa.json` | Complete Persian translation using the same project contract |
| `site.config.json` | Production URL and locale registry |
| `src/styles.css` | Tailwind entry point and custom visual styles |
| `scripts/build.mjs` | Static-site build orchestration |
| `scripts/home.mjs` | Localized homepage, metadata, and schema rendering |
| `scripts/localization.mjs` | Translation completeness and cross-locale validation |
| `scripts/projects.mjs` | Project validation and card rendering |
| `scripts/case-studies.mjs` | Case-study validation, rendering, schema, and sitemap generation |
| `scripts/*.test.mjs` | Node.js unit tests |
| `scripts/check.mjs` | Production-output and SEO contract checks |
| `assets/` | Images, fonts, and other public assets |
| `.github/workflows/pages.yml` | GitHub Pages build and deployment workflow |

## SEO and structured data

The generated site includes:

- localized titles, descriptions, self-canonical URLs, and reciprocal `hreflang` links;
- index/follow directives;
- Open Graph and Twitter preview metadata;
- a `ProfilePage`, `Person`, and `WebSite` graph on the homepage;
- `TechArticle` and `BreadcrumbList` structured data on case studies;
- a 1200×630 social preview image;
- XML and plain-text sitemaps covering all 14 canonical localized URLs; and
- a `robots.txt` file pointing search engines to the sitemap.

These requirements are enforced by `npm run check` so generated pages cannot be deployed silently with missing core metadata.

## Deployment

The [GitHub Actions workflow](.github/workflows/pages.yml) runs for pushes and pull requests targeting `main`:

1. Install dependencies with `npm ci`.
2. Run `npm run verify`.
3. Upload `dist/` as the GitHub Pages artifact.
4. Deploy the artifact for non-pull-request runs.

Pull requests are built and validated but are not deployed. The workflow can also be started manually from the GitHub Actions page.

### Changing the domain

Change only the `url` value in [`site.config.json`](site.config.json), keeping a full HTTPS origin with a trailing slash. Leave the locale registry unchanged:

```json
{
  "url": "https://example.com/",
  "defaultLocale": "en",
  "locales": [
    { "code": "en", "path": "", "direction": "ltr", "nativeName": "English", "ogLocale": "en_US" },
    { "code": "fa", "path": "fa", "direction": "rtl", "nativeName": "فارسی", "ogLocale": "fa_IR" }
  ]
}
```

Run `npm run verify`, then configure the same custom domain in the GitHub Pages repository settings. The build derives the `CNAME` hostname and all public URLs automatically.

### Adding another language

Add one entry to `site.config.json`, create one complete `content/<locale>.json` file with the same structure and stable project configuration, then run `npm run verify`. Missing UI text or project/case-study drift fails the build instead of falling back to another language.

## Contact

- Website: [megh.dad](https://megh.dad/)
- GitHub: [@MeghdadFadaee](https://github.com/MeghdadFadaee)
- Telegram: [@MeghdadFadaee](https://t.me/MeghdadFadaee)
- Email: [MeghdadFadaee@gmail.com](mailto:MeghdadFadaee@gmail.com)
