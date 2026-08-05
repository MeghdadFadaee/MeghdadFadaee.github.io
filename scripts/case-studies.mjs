import { escapeHtml, escapeXml, serializeJsonForHtml } from "./text.mjs";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CANONICAL_ROOT = "https://meghdadfadaee.github.io/";
const INTERNAL_PROJECT_ROOT = "/projects/";

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, path, maximumLength = 500) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${path} must be a non-empty string`);
    }

    const normalized = value.trim();
    if (/[\u0000-\u001F\u007F]/.test(normalized)) {
        throw new TypeError(`${path} must not contain control characters`);
    }

    if (normalized.length > maximumLength) {
        throw new TypeError(`${path} must not exceed ${maximumLength} characters`);
    }

    return normalized;
}

function requireStringList(value, path, minimumLength = 1) {
    if (!Array.isArray(value) || value.length < minimumLength) {
        throw new TypeError(`${path} must contain at least ${minimumLength} item(s)`);
    }

    return value.map((item, index) => requireString(item, `${path}[${index}]`, 1200));
}

function validateHttpsUrl(value, path) {
    const href = requireString(value, path, 1000);
    let url;

    try {
        url = new URL(href);
    } catch {
        throw new TypeError(`${path} must be an absolute HTTPS URL`);
    }

    if (url.protocol !== "https:" || url.username || url.password) {
        throw new TypeError(`${path} must be an absolute HTTPS URL without credentials`);
    }

    return href;
}

function validateCaseStudy(caseStudy, path) {
    if (!isPlainObject(caseStudy)) {
        throw new TypeError(`${path} must be an object`);
    }

    const slug = requireString(caseStudy.slug, `${path}.slug`, 100);
    if (!SLUG.test(slug)) {
        throw new TypeError(`${path}.slug must be a lowercase URL-safe slug`);
    }

    const metaDescription = requireString(caseStudy.metaDescription, `${path}.metaDescription`, 180);
    if (metaDescription.length < 80) {
        throw new TypeError(`${path}.metaDescription must contain at least 80 characters`);
    }

    if (!Array.isArray(caseStudy.metrics) || caseStudy.metrics.length === 0) {
        throw new TypeError(`${path}.metrics must contain at least one metric`);
    }

    const metrics = caseStudy.metrics.map((metric, index) => {
        const metricPath = `${path}.metrics[${index}]`;
        if (!isPlainObject(metric)) {
            throw new TypeError(`${metricPath} must be an object`);
        }

        return {
            value: requireString(metric.value, `${metricPath}.value`, 40),
            label: requireString(metric.label, `${metricPath}.label`, 80),
            detail: requireString(metric.detail, `${metricPath}.detail`, 240)
        };
    });

    if (!Array.isArray(caseStudy.architecture) || caseStudy.architecture.length < 2) {
        throw new TypeError(`${path}.architecture must contain at least two stages`);
    }

    const architecture = caseStudy.architecture.map((stage, index) => {
        const stagePath = `${path}.architecture[${index}]`;
        if (!isPlainObject(stage)) {
            throw new TypeError(`${stagePath} must be an object`);
        }

        return {
            label: requireString(stage.label, `${stagePath}.label`, 80),
            detail: requireString(stage.detail, `${stagePath}.detail`, 260)
        };
    });

    if (!Array.isArray(caseStudy.links) || caseStudy.links.length === 0) {
        throw new TypeError(`${path}.links must contain at least one link`);
    }

    const links = caseStudy.links.map((link, index) => {
        const linkPath = `${path}.links[${index}]`;
        if (!isPlainObject(link)) {
            throw new TypeError(`${linkPath} must be an object`);
        }

        return {
            label: requireString(link.label, `${linkPath}.label`, 100),
            href: validateHttpsUrl(link.href, `${linkPath}.href`)
        };
    });

    return {
        slug,
        headline: requireString(caseStudy.headline, `${path}.headline`, 120),
        seoTitle: requireString(caseStudy.seoTitle, `${path}.seoTitle`, 80),
        metaDescription,
        kicker: requireString(caseStudy.kicker, `${path}.kicker`, 60),
        intro: requireString(caseStudy.intro, `${path}.intro`, 700),
        role: requireString(caseStudy.role, `${path}.role`, 180),
        timeline: requireString(caseStudy.timeline, `${path}.timeline`, 80),
        status: requireString(caseStudy.status, `${path}.status`, 80),
        metrics,
        mission: requireStringList(caseStudy.mission, `${path}.mission`),
        architecture,
        battlePlan: requireStringList(caseStudy.battlePlan, `${path}.battlePlan`, 2),
        bossFight: requireStringList(caseStudy.bossFight, `${path}.bossFight`),
        rewards: requireStringList(caseStudy.rewards, `${path}.rewards`, 2),
        stack: requireStringList(caseStudy.stack, `${path}.stack`, 3),
        links,
        sourceNote: requireString(caseStudy.sourceNote, `${path}.sourceNote`, 500)
    };
}

export function validateProjectCaseStudies(payload) {
    const seenSlugs = new Set();

    const projects = payload.projects.map((project, index) => {
        if (project.caseStudy === undefined) {
            return project;
        }

        const caseStudy = validateCaseStudy(project.caseStudy, `projects[${index}].caseStudy`);
        if (seenSlugs.has(caseStudy.slug)) {
            throw new TypeError(`projects[${index}].caseStudy.slug duplicates another case-study slug`);
        }

        seenSlugs.add(caseStudy.slug);

        return {
            ...project,
            caseStudy
        };
    });

    return {
        ...payload,
        projects
    };
}

export function caseStudyHref(project) {
    return project.caseStudy
        ? `${INTERNAL_PROJECT_ROOT}${project.caseStudy.slug}/`
        : null;
}

function renderParagraphs(paragraphs) {
    return paragraphs
        .map((paragraph) => `                    <p>${escapeHtml(paragraph)}</p>`)
        .join("\n");
}

function renderArchitecture(stages) {
    return stages.map((stage, index) => `                    <li class="case-architecture-node">
                        <span class="case-node-index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
                        <h3>${escapeHtml(stage.label)}</h3>
                        <p>${escapeHtml(stage.detail)}</p>
                    </li>`).join("\n");
}

function renderMetrics(metrics) {
    return metrics.map((metric) => `                    <li class="nes-container is-dark case-metric">
                        <strong>${escapeHtml(metric.value)}</strong>
                        <span>${escapeHtml(metric.label)}</span>
                        <small>${escapeHtml(metric.detail)}</small>
                    </li>`).join("\n");
}

function renderStack(stack) {
    return stack.map((item) => `                        <li>${escapeHtml(item)}</li>`).join("\n");
}

function renderBattlePlan(items) {
    return items.map((item, index) => `                    <li class="case-battle-step">
                        <div class="case-battle-marker" aria-hidden="true">
                            <span>${String(index + 1).padStart(2, "0")}</span>
                        </div>
                        <div class="case-battle-card">
                            <span class="case-battle-label">Checkpoint ${String(index + 1).padStart(2, "0")}</span>
                            <p>${escapeHtml(item)}</p>
                        </div>
                    </li>`).join("\n");
}

function renderBossFight(items) {
    return items.map((item) => `                    <li>
                        <span class="case-boss-alert" aria-hidden="true">!</span>
                        <p>${escapeHtml(item)}</p>
                    </li>`).join("\n");
}

function renderRewards(items) {
    return items.map((item, index) => `                    <li class="case-reward-card">
                        <div class="case-reward-status">
                            <span aria-hidden="true">★</span>
                            <span>Reward ${String(index + 1).padStart(2, "0")} unlocked</span>
                        </div>
                        <p>${escapeHtml(item)}</p>
                    </li>`).join("\n");
}

function renderLinks(links) {
    return links.map((link, index) => {
        const className = index === 0 ? "nes-btn is-primary" : "nes-btn";
        return `                        <a class="${className}" href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`;
    }).join("\n");
}

function renderCaseStudyBody(project) {
    const caseStudy = project.caseStudy;

    return `        <nav class="case-breadcrumb" aria-label="Breadcrumb">
            <ol>
                <li><a href="/">Home</a></li>
                <li><a href="/#projects">Quest Log</a></li>
                <li aria-current="page">${escapeHtml(caseStudy.headline)}</li>
            </ol>
        </nav>

        <article>
            <header class="nes-container is-dark case-study-hero" style="--case-accent: ${escapeHtml(project.accent)}">
                <p class="section-kicker">${escapeHtml(caseStudy.kicker)}</p>
                <h1>${escapeHtml(caseStudy.headline)}</h1>
                <p class="case-study-intro">${escapeHtml(caseStudy.intro)}</p>
                <dl class="case-meta">
                    <div>
                        <dt>Role</dt>
                        <dd>${escapeHtml(caseStudy.role)}</dd>
                    </div>
                    <div>
                        <dt>Timeline</dt>
                        <dd>${escapeHtml(caseStudy.timeline)}</dd>
                    </div>
                    <div>
                        <dt>Status</dt>
                        <dd>${escapeHtml(caseStudy.status)}</dd>
                    </div>
                </dl>
            </header>

            <ul class="case-metrics" aria-label="Project highlights">
${renderMetrics(caseStudy.metrics)}
            </ul>

            <section class="nes-container with-title is-dark case-section" aria-labelledby="mission-title">
                <h2 class="title" id="mission-title">Mission Brief</h2>
                <div class="case-prose">
${renderParagraphs(caseStudy.mission)}
                </div>
            </section>

            <section class="case-section" aria-labelledby="architecture-title">
                <p class="section-kicker">System Map</p>
                <h2 id="architecture-title">Architecture</h2>
                <ol class="case-architecture">
${renderArchitecture(caseStudy.architecture)}
                </ol>
            </section>

            <section class="case-section case-battle" aria-labelledby="battle-plan-title">
                <div class="case-section-heading">
                    <div>
                        <p class="section-kicker">Strategy Route</p>
                        <h2 id="battle-plan-title">Battle Plan</h2>
                    </div>
                    <p>The implementation path, checkpoint by checkpoint.</p>
                </div>
                <ol class="case-battle-path">
${renderBattlePlan(caseStudy.battlePlan)}
                </ol>
            </section>

            <section class="case-section case-boss-encounter" aria-labelledby="boss-fight-title">
                <div class="case-boss-header">
                    <div>
                        <p class="section-kicker">Critical Encounter</p>
                        <h2 id="boss-fight-title">Boss Fight</h2>
                    </div>
                    <div class="case-boss-health">
                        <div class="case-boss-health-label">
                            <span>Boss HP</span>
                            <strong>Resolved</strong>
                        </div>
                        <div class="case-boss-health-track"
                             role="meter"
                             aria-label="Boss challenge remaining"
                             aria-valuemin="0"
                             aria-valuemax="100"
                             aria-valuenow="0"
                             aria-valuetext="Resolved">
                            <span aria-hidden="true"></span>
                        </div>
                    </div>
                </div>
                <ul class="case-boss-log">
${renderBossFight(caseStudy.bossFight)}
                </ul>
            </section>

            <section class="case-section case-rewards" aria-labelledby="rewards-title">
                <div class="case-section-heading">
                    <div>
                        <p class="section-kicker">Achievements Unlocked</p>
                        <h2 id="rewards-title">Quest Rewards</h2>
                    </div>
                    <p>What the quest delivered.</p>
                </div>
                <ul class="case-reward-grid">
${renderRewards(caseStudy.rewards)}
                </ul>
            </section>

            <div class="case-two-column case-loadout">
                <section class="nes-container is-dark case-section" aria-labelledby="loadout-title">
                    <p class="section-kicker">Special Items</p>
                    <h2 id="loadout-title">Technical Loadout</h2>
                    <ul class="case-stack">
${renderStack(caseStudy.stack)}
                    </ul>
                </section>

                <section class="nes-container is-dark case-section" aria-labelledby="proof-title">
                    <p class="section-kicker">Proof of Work</p>
                    <h2 id="proof-title">Explore the Quest</h2>
                    <div class="case-links">
${renderLinks(caseStudy.links)}
                    </div>
                    <p class="case-source-note">${escapeHtml(caseStudy.sourceNote)}</p>
                </section>
            </div>

            <nav class="case-next-actions" aria-label="Case study actions">
                <a class="nes-btn is-success" href="/#projects">Back to Quest Log</a>
                <a class="nes-btn is-warning" href="/#contact">Join Party</a>
            </nav>
        </article>`;
}

function renderStructuredData(project, updatedAt) {
    const caseStudy = project.caseStudy;
    const pageUrl = `${CANONICAL_ROOT}projects/${caseStudy.slug}/`;

    return serializeJsonForHtml({
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "TechArticle",
                "@id": `${pageUrl}#article`,
                headline: caseStudy.headline,
                description: caseStudy.metaDescription,
                dateModified: updatedAt,
                inLanguage: "en",
                mainEntityOfPage: pageUrl,
                author: {
                    "@type": "Person",
                    "@id": `${CANONICAL_ROOT}#person`,
                    name: "Meghdad Fadaee",
                    url: CANONICAL_ROOT
                },
                about: {
                    "@type": "SoftwareApplication",
                    name: caseStudy.headline,
                    description: project.summary,
                    applicationCategory: "DeveloperApplication"
                }
            },
            {
                "@type": "BreadcrumbList",
                itemListElement: [
                    {
                        "@type": "ListItem",
                        position: 1,
                        name: "Home",
                        item: CANONICAL_ROOT
                    },
                    {
                        "@type": "ListItem",
                        position: 2,
                        name: "Quest Log",
                        item: `${CANONICAL_ROOT}#projects`
                    },
                    {
                        "@type": "ListItem",
                        position: 3,
                        name: caseStudy.headline,
                        item: pageUrl
                    }
                ]
            }
        ]
    });
}

export function renderCaseStudyPage(template, project, updatedAt, socialImagePath = "assets/og-preview.png") {
    const caseStudy = project.caseStudy;
    const pageUrl = `${CANONICAL_ROOT}projects/${caseStudy.slug}/`;
    const imageUrl = `${CANONICAL_ROOT}${socialImagePath}`;
    const head = `    <title>${escapeHtml(caseStudy.seoTitle)}</title>
    <meta name="description" content="${escapeHtml(caseStudy.metaDescription)}">
    <meta name="author" content="Meghdad Fadaee">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="theme-color" content="#212529">
    <link rel="canonical" href="${escapeHtml(pageUrl)}">

    <meta property="og:title" content="${escapeHtml(caseStudy.seoTitle)}">
    <meta property="og:description" content="${escapeHtml(caseStudy.metaDescription)}">
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:alt" content="${escapeHtml(`${caseStudy.headline} case study by Meghdad Fadaee`)}">
    <meta property="og:url" content="${escapeHtml(pageUrl)}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Meghdad Fadaee">
    <meta property="og:locale" content="en_US">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(caseStudy.seoTitle)}">
    <meta name="twitter:description" content="${escapeHtml(caseStudy.metaDescription)}">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
    <meta name="twitter:image:alt" content="${escapeHtml(`${caseStudy.headline} case study by Meghdad Fadaee`)}">`;
    const schema = `    <script type="application/ld+json" id="case-study-schema">
${renderStructuredData(project, updatedAt)}
    </script>`;

    return template
        .replace("<!-- CASE_HEAD -->", head)
        .replace("<!-- CASE_SCHEMA -->", schema)
        .replace("<!-- CASE_BODY -->", renderCaseStudyBody(project));
}

function sitemapUrls(projects) {
    return [
        CANONICAL_ROOT,
        ...projects
            .filter((project) => project.caseStudy)
            .map((project) => `${CANONICAL_ROOT}projects/${project.caseStudy.slug}/`)
    ];
}

export function renderSitemap(projects, updatedAt) {
    const urls = sitemapUrls(projects);

    const entries = urls.map((url) => `    <url>
        <loc>${escapeXml(url)}</loc>
        <lastmod>${escapeXml(updatedAt)}</lastmod>
    </url>`).join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

export function renderTextSitemap(projects) {
    return `${sitemapUrls(projects).join("\n")}\n`;
}
