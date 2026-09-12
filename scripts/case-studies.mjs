import { escapeHtml, escapeXml, serializeJsonForHtml } from "./text.mjs";
import { caseStudyAbsoluteUrl, caseStudyPath, localeAbsoluteUrl, localeRoot } from "./site-config.mjs";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function required(value, path, maximum = 1200) {
    if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${path} must be a non-empty string`);
    const result = value.trim();
    if (/[\u0000-\u001F\u007F]/.test(result) || result.length > maximum) throw new TypeError(`${path} is invalid`);
    return result;
}
function strings(value, path, minimum = 1) {
    if (!Array.isArray(value) || value.length < minimum) throw new TypeError(`${path} must contain at least ${minimum} item(s)`);
    return value.map((item, index) => required(item, `${path}[${index}]`));
}
function https(value, path) {
    const href = required(value, path, 1000); let url;
    try { url = new URL(href); } catch { throw new TypeError(`${path} must be an absolute HTTPS URL`); }
    if (url.protocol !== "https:" || url.username || url.password) throw new TypeError(`${path} must be an absolute HTTPS URL without credentials`);
    return href;
}
function validateCaseStudy(item, path) {
    if (!isObject(item)) throw new TypeError(`${path} must be an object`);
    const slug = required(item.slug, `${path}.slug`, 100);
    if (!SLUG.test(slug)) throw new TypeError(`${path}.slug must be a lowercase URL-safe slug`);
    const metaDescription = required(item.metaDescription, `${path}.metaDescription`, 240);
    if (metaDescription.length < 70) throw new TypeError(`${path}.metaDescription must contain at least 70 characters`);
    if (!Array.isArray(item.metrics) || !item.metrics.length) throw new TypeError(`${path}.metrics must contain metrics`);
    if (!Array.isArray(item.architecture) || item.architecture.length < 2) throw new TypeError(`${path}.architecture must contain at least two stages`);
    if (!Array.isArray(item.links) || !item.links.length) throw new TypeError(`${path}.links must contain links`);
    return {
        slug, headline: required(item.headline, `${path}.headline`), seoTitle: required(item.seoTitle, `${path}.seoTitle`, 120), metaDescription,
        kicker: required(item.kicker, `${path}.kicker`), intro: required(item.intro, `${path}.intro`), role: required(item.role, `${path}.role`), timeline: required(item.timeline, `${path}.timeline`), status: required(item.status, `${path}.status`),
        metrics: item.metrics.map((metric, index) => ({ value: required(metric.value, `${path}.metrics[${index}].value`, 40), label: required(metric.label, `${path}.metrics[${index}].label`), detail: required(metric.detail, `${path}.metrics[${index}].detail`) })),
        mission: strings(item.mission, `${path}.mission`),
        architecture: item.architecture.map((stage, index) => ({ label: required(stage.label, `${path}.architecture[${index}].label`), detail: required(stage.detail, `${path}.architecture[${index}].detail`) })),
        battlePlan: strings(item.battlePlan, `${path}.battlePlan`, 2), bossFight: strings(item.bossFight, `${path}.bossFight`), rewards: strings(item.rewards, `${path}.rewards`, 2), stack: strings(item.stack, `${path}.stack`, 3),
        links: item.links.map((link, index) => ({ label: required(link.label, `${path}.links[${index}].label`), href: https(link.href, `${path}.links[${index}].href`) })), sourceNote: required(item.sourceNote, `${path}.sourceNote`)
    };
}

export function validateProjectCaseStudies(payload) {
    const slugs = new Set();
    const projects = payload.projects.map((project, index) => {
        if (project.caseStudy === undefined) return project;
        const caseStudy = validateCaseStudy(project.caseStudy, `projects[${index}].caseStudy`);
        if (slugs.has(caseStudy.slug)) throw new TypeError(`projects[${index}].caseStudy.slug duplicates another case-study slug`);
        slugs.add(caseStudy.slug); return { ...project, caseStudy };
    });
    return { ...payload, projects };
}

function format(pattern, values) { return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value), pattern); }
function paragraphs(items) { return items.map((item) => `<p>${escapeHtml(item)}</p>`).join("\n"); }
function languageLinks(site, current, slug, aria) {
    return site.locales.filter((locale) => locale.code !== current.code).map((locale) => `<a class="nes-btn language-switcher" lang="${locale.code}" dir="${locale.direction}" hreflang="${locale.code}" href="${caseStudyPath(locale, slug)}" aria-label="${escapeHtml(aria)}">${escapeHtml(locale.nativeName)}</a>`).join("\n");
}
function renderArchitecture(items) { return items.map((item, index) => `<li class="case-architecture-node"><span class="case-node-index technical-ltr" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.detail)}</p></li>`).join("\n"); }
function renderMetrics(items) { return items.map((item) => `<li class="nes-container is-dark case-metric"><strong><bdi class="technical-ltr">${escapeHtml(item.value)}</bdi></strong><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.detail)}</small></li>`).join("\n"); }
function renderBattle(items, ui) { return items.map((item, index) => { const number = String(index + 1).padStart(2, "0"); return `<li class="case-battle-step"><div class="case-battle-marker technical-ltr" aria-hidden="true"><span>${number}</span></div><div class="case-battle-card"><span class="case-battle-label">${escapeHtml(format(ui.checkpoint, { number }))}</span><p>${escapeHtml(item)}</p></div></li>`; }).join("\n"); }
function renderBoss(items) { return items.map((item) => `<li><span class="case-boss-alert" aria-hidden="true">!</span><p>${escapeHtml(item)}</p></li>`).join("\n"); }
function renderRewards(items, ui) { return items.map((item, index) => { const number = String(index + 1).padStart(2, "0"); return `<li class="case-reward-card"><div class="case-reward-status"><span aria-hidden="true">★</span><span>${escapeHtml(format(ui.rewardUnlocked, { number }))}</span></div><p>${escapeHtml(item)}</p></li>`; }).join("\n"); }
function renderStack(items) { return items.map((item) => `<li><bdi class="technical-ltr">${escapeHtml(item)}</bdi></li>`).join("\n"); }
function renderLinks(items) { return items.map((item, index) => `<a class="nes-btn${index === 0 ? " is-primary" : ""}" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>`).join("\n"); }

function renderBody(project, site, locale, payload) {
    const item = project.caseStudy, ui = payload.caseUi, root = localeRoot(locale);
    return `<a href="#main-content" class="skip-link">${escapeHtml(ui.skip)}</a>
<header class="sticky top-0 z-50"><nav class="site-nav p-4 bg-[#212529] border-b-4 border-white" aria-label="${escapeHtml(ui.primaryAria)}"><div class="container mx-auto flex justify-between items-center gap-3"><a href="${root}" class="text-[#209cee] site-brand" aria-label="${escapeHtml(ui.homeAria)}"><i class="nes-icon coin is-small" aria-hidden="true"></i> ${escapeHtml(payload.home.profile.name)}</a><div class="nav-actions"><div class="hidden md:flex nav-page-links"><a href="${root}#about" class="nes-btn is-primary">${escapeHtml(ui.statsNav)}</a><a href="${root}#projects" class="nes-btn is-success">${escapeHtml(ui.questsNav)}</a><a href="${root}#contact" class="nes-btn is-warning">${escapeHtml(ui.connectNav)}</a></div>${languageLinks(site, locale, item.slug, ui.languageAria)}</div></div></nav></header>
<main id="main-content" class="container mx-auto px-4 mt-12 pb-20 case-study-main"><nav class="case-breadcrumb" aria-label="${escapeHtml(ui.breadcrumbAria)}"><ol><li><a href="${root}">${escapeHtml(ui.home)}</a></li><li><a href="${root}#projects">${escapeHtml(ui.questLog)}</a></li><li aria-current="page">${escapeHtml(item.headline)}</li></ol></nav>
<article><header class="nes-container is-dark case-study-hero" style="--case-accent:${escapeHtml(project.accent)}"><p class="section-kicker">${escapeHtml(item.kicker)}</p><h1>${escapeHtml(item.headline)}</h1><p class="case-study-intro">${escapeHtml(item.intro)}</p><dl class="case-meta"><div><dt>${escapeHtml(ui.role)}</dt><dd>${escapeHtml(item.role)}</dd></div><div><dt>${escapeHtml(ui.timeline)}</dt><dd><bdi>${escapeHtml(item.timeline)}</bdi></dd></div><div><dt>${escapeHtml(ui.status)}</dt><dd>${escapeHtml(item.status)}</dd></div></dl></header>
<ul class="case-metrics" aria-label="${escapeHtml(ui.highlightsAria)}">${renderMetrics(item.metrics)}</ul>
<section class="nes-container with-title is-dark case-section" aria-labelledby="mission-title"><h2 class="title" id="mission-title">${escapeHtml(ui.missionBrief)}</h2><div class="case-prose">${paragraphs(item.mission)}</div></section>
<section class="case-section" aria-labelledby="architecture-title"><p class="section-kicker">${escapeHtml(ui.systemMap)}</p><h2 id="architecture-title">${escapeHtml(ui.architecture)}</h2><ol class="case-architecture">${renderArchitecture(item.architecture)}</ol></section>
<section class="case-section case-battle" aria-labelledby="battle-plan-title"><div class="case-section-heading"><div><p class="section-kicker">${escapeHtml(ui.strategyRoute)}</p><h2 id="battle-plan-title">${escapeHtml(ui.battlePlan)}</h2></div><p>${escapeHtml(ui.battleIntro)}</p></div><ol class="case-battle-path">${renderBattle(item.battlePlan, ui)}</ol></section>
<section class="case-section case-boss-encounter" aria-labelledby="boss-fight-title"><div class="case-boss-header"><div><p class="section-kicker">${escapeHtml(ui.criticalEncounter)}</p><h2 id="boss-fight-title">${escapeHtml(ui.bossFight)}</h2></div><div class="case-boss-health"><div class="case-boss-health-label"><span>${escapeHtml(ui.bossHp)}</span><strong>${escapeHtml(ui.resolved)}</strong></div><div class="case-boss-health-track" role="meter" aria-label="${escapeHtml(ui.bossRemainingAria)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="${escapeHtml(ui.resolved)}"><span aria-hidden="true"></span></div></div></div><ul class="case-boss-log">${renderBoss(item.bossFight)}</ul></section>
<section class="case-section case-rewards" aria-labelledby="rewards-title"><div class="case-section-heading"><div><p class="section-kicker">${escapeHtml(ui.achievements)}</p><h2 id="rewards-title">${escapeHtml(ui.questRewards)}</h2></div><p>${escapeHtml(ui.rewardsIntro)}</p></div><ul class="case-reward-grid">${renderRewards(item.rewards, ui)}</ul></section>
<div class="case-two-column case-loadout"><section class="nes-container is-dark case-section" aria-labelledby="loadout-title"><p class="section-kicker">${escapeHtml(ui.specialItems)}</p><h2 id="loadout-title">${escapeHtml(ui.technicalLoadout)}</h2><ul class="case-stack">${renderStack(item.stack)}</ul></section><section class="nes-container is-dark case-section" aria-labelledby="proof-title"><p class="section-kicker">${escapeHtml(ui.proofOfWork)}</p><h2 id="proof-title">${escapeHtml(ui.exploreQuest)}</h2><div class="case-links">${renderLinks(item.links)}</div><p class="case-source-note">${escapeHtml(item.sourceNote)}</p></section></div>
<nav class="case-next-actions" aria-label="${escapeHtml(ui.actionsAria)}"><a class="nes-btn is-success" href="${root}#projects">${escapeHtml(ui.backToQuestLog)}</a><a class="nes-btn is-warning" href="${root}#contact">${escapeHtml(ui.joinParty)}</a></nav></article></main>
<footer class="text-center p-8 bg-black border-t-4 border-[#212529]"><p class="text-xs text-gray-400">${escapeHtml(ui.footer)}</p><div class="mt-4"><i class="nes-icon is-small heart" aria-hidden="true"></i></div></footer>`;
}

function renderSchema(project, site, locale, payload) {
    const item = project.caseStudy, pageUrl = caseStudyAbsoluteUrl(site, locale, item.slug), homeUrl = localeAbsoluteUrl(site, locale), personUrl = `${site.url}#person`;
    return serializeJsonForHtml({ "@context": "https://schema.org", "@graph": [
        { "@type": "TechArticle", "@id": `${pageUrl}#article`, headline: item.headline, description: item.metaDescription, dateModified: payload.updatedAt, inLanguage: locale.code, mainEntityOfPage: pageUrl, author: { "@type": "Person", "@id": personUrl, name: payload.home.profile.name, url: site.url }, about: { "@type": "SoftwareApplication", name: item.headline, description: project.summary, applicationCategory: "DeveloperApplication" } },
        { "@type": "BreadcrumbList", inLanguage: locale.code, itemListElement: [{ "@type": "ListItem", position: 1, name: payload.caseUi.home, item: homeUrl }, { "@type": "ListItem", position: 2, name: payload.caseUi.questLog, item: `${homeUrl}#projects` }, { "@type": "ListItem", position: 3, name: item.headline, item: pageUrl }] }
    ] });
}

export function renderCaseStudyPage(template, project, site, locale, payload) {
    const item = project.caseStudy, pageUrl = caseStudyAbsoluteUrl(site, locale, item.slug), imageUrl = `${site.url}assets/og-preview.png`;
    const fontPreloads = locale.direction === "rtl"
        ? `<link rel="preload" href="/assets/fonts/files/vazirmatn-arabic-400-normal.woff2" as="font" type="font/woff2" crossorigin><link rel="preload" href="/assets/fonts/files/lalezar-arabic-400-normal.woff2" as="font" type="font/woff2" crossorigin>`
        : `<link rel="preload" href="/assets/fonts/files/press-start-2p-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>`;
    const alternates = site.locales.map((entry) => `<link rel="alternate" hreflang="${entry.code}" href="${caseStudyAbsoluteUrl(site, entry, item.slug)}">`).join("\n    ");
    const fallback = site.locales.find((entry) => entry.code === site.defaultLocale);
    const ogAlternates = site.locales.filter((entry) => entry.code !== locale.code).map((entry) => `<meta property="og:locale:alternate" content="${entry.ogLocale}">`).join("\n    ");
    const imageAlt = format(payload.caseUi.imageAlt, { title: item.headline });
    const head = `${fontPreloads}<title>${escapeHtml(item.seoTitle)}</title><meta name="description" content="${escapeHtml(item.metaDescription)}"><meta name="author" content="${escapeHtml(payload.home.profile.name)}"><meta name="robots" content="index, follow, max-image-preview:large"><meta name="theme-color" content="#212529"><link rel="canonical" href="${pageUrl}">
    ${alternates}
    <link rel="alternate" hreflang="x-default" href="${caseStudyAbsoluteUrl(site, fallback, item.slug)}"><meta property="og:title" content="${escapeHtml(item.seoTitle)}"><meta property="og:description" content="${escapeHtml(item.metaDescription)}"><meta property="og:image" content="${imageUrl}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/png"><meta property="og:image:alt" content="${escapeHtml(imageAlt)}"><meta property="og:url" content="${pageUrl}"><meta property="og:type" content="article"><meta property="og:site_name" content="${escapeHtml(payload.home.profile.siteName)}"><meta property="og:locale" content="${locale.ogLocale}">${ogAlternates ? `\n    ${ogAlternates}` : ""}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(item.seoTitle)}"><meta name="twitter:description" content="${escapeHtml(item.metaDescription)}"><meta name="twitter:image" content="${imageUrl}"><meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">`;
    return template.replace("{{HTML_LANG}}", locale.code).replace("{{HTML_DIR}}", locale.direction).replace("<!-- CASE_HEAD -->", head).replace("<!-- CASE_SCHEMA -->", `<script type="application/ld+json" id="case-study-schema">\n${renderSchema(project, site, locale, payload)}\n</script>`).replace("<!-- CASE_BODY -->", renderBody(project, site, locale, payload));
}

function sitemapPages(localized) {
    const pages = [];
    for (const { locale, payload } of localized) {
        pages.push({ locale, payload, slug: null });
        for (const project of payload.projects.filter((item) => item.caseStudy)) pages.push({ locale, payload, slug: project.caseStudy.slug });
    }
    return pages;
}
function pageUrl(site, locale, slug) { return slug ? caseStudyAbsoluteUrl(site, locale, slug) : localeAbsoluteUrl(site, locale); }
export function renderSitemap(localized, site) {
    const fallback = site.locales.find((locale) => locale.code === site.defaultLocale);
    const entries = sitemapPages(localized).map(({ locale, payload, slug }) => {
        const links = site.locales.map((entry) => `<xhtml:link rel="alternate" hreflang="${entry.code}" href="${escapeXml(pageUrl(site, entry, slug))}"/>`).join("\n        ");
        return `    <url><loc>${escapeXml(pageUrl(site, locale, slug))}</loc><lastmod>${escapeXml(payload.updatedAt)}</lastmod>\n        ${links}\n        <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(pageUrl(site, fallback, slug))}"/>\n    </url>`;
    }).join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries}\n</urlset>\n`;
}
export function renderTextSitemap(localized, site) { return `${sitemapPages(localized).map(({ locale, slug }) => pageUrl(site, locale, slug)).join("\n")}\n`; }
