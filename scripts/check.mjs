import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml } from "./text.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(projectRoot, "dist");
const canonicalUrl = "https://meghdadfadaee.github.io/";
const html = await readFile(join(dist, "index.html"), "utf8");
const projectsSource = await readFile(join(projectRoot, "api", "projects.json"));
const projectsBuilt = await readFile(join(dist, "api", "projects.json"));
const payload = JSON.parse(projectsSource.toString("utf8"));
const caseProjects = payload.projects.filter((project) => project.caseStudy);

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertProtectedExternalLinks(pageHtml, context) {
    for (const match of pageHtml.matchAll(/<a\b[^>]*\bhref="https:\/\/[^"]+"[^>]*>/g)) {
        assert.match(match[0], /\btarget="_blank"/, `${context}: external links must open in a new tab`);
        assert.match(
            match[0],
            /\brel="[^"]*\bnoopener\b[^"]*\bnoreferrer\b[^"]*"/,
            `${context}: external links must prevent opener and referrer access`
        );
    }

    for (const match of pageHtml.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
        assert.match(
            match[0],
            /\brel="[^"]*\bnoopener\b[^"]*\bnoreferrer\b[^"]*"/,
            `${context}: every new-tab link must be protected`
        );
    }
}

assert.equal(caseProjects.length, 6, "The portfolio must publish exactly six case studies");
assert.equal((html.match(/data-project-card/g) || []).length, payload.projects.length, "Every JSON project must render once");
assert.equal((html.match(/<h1\b/g) || []).length, 1, "The page must contain exactly one h1");
assert.match(html, /<html lang="en">/);
assert.match(html, /<title>Meghdad Fadaee — Backend Engineer &amp; System Architect<\/title>/);
assert.match(html, /<link rel="canonical" href="https:\/\/meghdadfadaee\.github\.io\/">/);
assert.match(html, /<meta property="og:url" content="https:\/\/meghdadfadaee\.github\.io\/">/);
assert.match(html, /<meta name="description" content="[^"]+">/);
assert.match(html, /<meta property="og:image" content="https:\/\/meghdadfadaee\.github\.io\/assets\/og-preview\.png">/);
assert.match(html, /<meta name="google-site-verification" content="r7GnylOYawm7Ty0cNnZlbeQyRgX1pTOStpal1n-G9fw">/);
assert.doesNotMatch(html, /Fadadee|meta name="keywords"|cdn\.tailwindcss\.com|Loading quests|loadProjects|projectsApiUrl|fetch\s*\(|PROJECT_CARDS/);
assert.match(html, /<h2\b[^>]*>Player Stats<\/h2>/);
assert.match(html, /<h3\b[^>]*>Backend Architect<\/h3>/);
assert.match(html, /Level 24 Engineer/);
assert.match(html, /HP \(Caffeine\)/);
assert.match(html, /MP \(Creativity\)/);
assert.match(html, /EXP \(Years\)/);
assert.match(html, /<h2\b[^>]*>Quest Log \(Projects\)<\/h2>/);
assert.match(html, /<h2\b[^>]*>Join Party<\/h2>/);
assert.match(html, /<form id="party-form"/);
assert.match(html, /mailto:MeghdadFadaee@gmail\.com\?subject=/);
assert.match(html, /href="#about" class="nes-btn is-primary">Stats<\/a>/);
assert.match(html, /href="#projects" class="nes-btn is-success">Quests<\/a>/);
assert.match(html, /href="#contact" class="nes-btn is-warning">Connect<\/a>/);

const projectCards = [...html.matchAll(/<article\b[^>]*\bdata-project-card\b[\s\S]*?<\/article>/g)]
    .map((match) => match[0]);
assert.equal(projectCards.length, payload.projects.length, "Each project must render in its own card");

for (const [index, project] of payload.projects.entries()) {
    const card = projectCards[index];
    const escapedTitle = escapeHtml(project.title);
    assert.match(card, new RegExp(`<h3[^>]*>${escapeRegExp(escapedTitle)}<\\/h3>`));

    if (project.caseStudy) {
        const caseHref = `/projects/${project.caseStudy.slug}/`;
        const questLink = card.match(/<a\b[^>]*class="[^"]*\bnes-btn\b[^"]*"[^>]*>View Quest<\/a>/);
        assert.ok(questLink, `${project.title} must expose a View Quest action`);
        assert.match(questLink[0], new RegExp(`\\bhref="${escapeRegExp(caseHref)}"`));
        assert.doesNotMatch(questLink[0], /\btarget="_blank"/, `${project.title} case-study link must stay in the same tab`);
    }
}

assert.deepEqual(projectsBuilt, projectsSource, "The deployed JSON must byte-match the source JSON");

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
for (const match of html.matchAll(/\shref="#([^"]+)"/g)) {
    assert.ok(ids.has(match[1]), `Fragment #${match[1]} must resolve to an element id`);
}

assertProtectedExternalLinks(html, "Homepage");

const profileSchemaMatch = html.match(/<script type="application\/ld\+json" id="profile-schema">\s*([\s\S]*?)\s*<\/script>/);
assert.ok(profileSchemaMatch, "Profile JSON-LD must exist");
const profileSchema = JSON.parse(profileSchemaMatch[1]);
const profileGraphTypes = new Set(profileSchema["@graph"].map((item) => item["@type"]));
assert.ok(profileGraphTypes.has("WebSite"));
assert.ok(profileGraphTypes.has("ProfilePage"));
assert.ok(profileGraphTypes.has("Person"));

const expectedSitemapUrls = [canonicalUrl];

for (const project of caseProjects) {
    const caseStudy = project.caseStudy;
    const caseUrl = `${canonicalUrl}projects/${caseStudy.slug}/`;
    const pagePath = join(dist, "projects", caseStudy.slug, "index.html");
    const pageHtml = await readFile(pagePath, "utf8");
    const context = `${project.title} case study`;
    expectedSitemapUrls.push(caseUrl);

    assert.equal((pageHtml.match(/<h1\b/g) || []).length, 1, `${context}: page must contain exactly one h1`);
    assert.match(pageHtml, /<html lang="en">/, `${context}: page language must be English`);
    assert.match(pageHtml, new RegExp(`<title>${escapeRegExp(escapeHtml(caseStudy.seoTitle))}<\\/title>`));
    assert.match(
        pageHtml,
        new RegExp(`<meta name="description" content="${escapeRegExp(escapeHtml(caseStudy.metaDescription))}">`)
    );
    assert.match(pageHtml, new RegExp(`<link rel="canonical" href="${escapeRegExp(caseUrl)}">`));
    assert.match(pageHtml, new RegExp(`<meta property="og:url" content="${escapeRegExp(caseUrl)}">`));
    assert.match(pageHtml, /<meta property="og:type" content="article">/);
    assert.match(pageHtml, /<meta property="og:image" content="https:\/\/meghdadfadaee\.github\.io\/assets\/og-preview\.png">/);
    assert.match(pageHtml, /<meta name="robots" content="index, follow, max-image-preview:large">/);
    assert.match(pageHtml, /href="\/#about" class="nes-btn is-primary">Stats<\/a>/);
    assert.match(pageHtml, /href="\/#projects" class="nes-btn is-success">Quests<\/a>/);
    assert.match(pageHtml, /href="\/#contact" class="nes-btn is-warning">Connect<\/a>/);
    assert.match(pageHtml, /<h2 class="title" id="mission-title">Mission Brief<\/h2>/);
    assert.match(pageHtml, /<h2 id="architecture-title">Architecture<\/h2>/);
    assert.match(pageHtml, /<section class="case-section case-battle"[^>]*>/);
    assert.match(pageHtml, /<h2 id="battle-plan-title">Battle Plan<\/h2>/);
    assert.equal(
        (pageHtml.match(/class="case-battle-step"/g) || []).length,
        caseStudy.battlePlan.length,
        `${context}: every battle-plan checkpoint must render as a readable step`
    );
    assert.match(pageHtml, /<section class="case-section case-boss-encounter"[^>]*>/);
    assert.match(pageHtml, /<h2 id="boss-fight-title">Boss Fight<\/h2>/);
    assert.match(pageHtml, /role="meter"[\s\S]*?aria-valuenow="0"[\s\S]*?aria-valuetext="Resolved"/);
    assert.equal(
        (pageHtml.match(/class="case-boss-alert"/g) || []).length,
        caseStudy.bossFight.length,
        `${context}: every boss-fight challenge must render separately`
    );
    assert.match(pageHtml, /<section class="case-section case-rewards"[^>]*>/);
    assert.match(pageHtml, /<h2 id="rewards-title">Quest Rewards<\/h2>/);
    assert.equal(
        (pageHtml.match(/class="case-reward-card"/g) || []).length,
        caseStudy.rewards.length,
        `${context}: every reward must render as an unlocked card`
    );
    assert.match(pageHtml, /<h2 id="loadout-title">Technical Loadout<\/h2>/);
    assert.match(pageHtml, /<h2 id="proof-title">Explore the Quest<\/h2>/);
    assert.match(pageHtml, /href="\/#projects">Back to Quest Log<\/a>/);
    assert.match(pageHtml, /href="\/#contact">Join Party<\/a>/);
    assert.doesNotMatch(pageHtml, /CASE_HEAD|CASE_SCHEMA|CASE_BODY|fetch\s*\(/, `${context}: template/runtime markers must be absent`);

    for (const link of caseStudy.links) {
        const escapedHref = escapeHtml(link.href);
        const renderedLink = pageHtml.match(
            new RegExp(`<a\\b[^>]*\\bhref="${escapeRegExp(escapedHref)}"[^>]*>${escapeRegExp(escapeHtml(link.label))}<\\/a>`)
        );
        assert.ok(renderedLink, `${context}: ${link.label} must be rendered`);
        assert.match(renderedLink[0], /\btarget="_blank"/);
        assert.match(renderedLink[0], /\brel="[^"]*\bnoopener\b[^"]*\bnoreferrer\b[^"]*"/);
    }
    assertProtectedExternalLinks(pageHtml, context);

    const caseSchemaMatch = pageHtml.match(
        /<script type="application\/ld\+json" id="case-study-schema">\s*([\s\S]*?)\s*<\/script>/
    );
    assert.ok(caseSchemaMatch, `${context}: JSON-LD must exist`);
    const caseSchema = JSON.parse(caseSchemaMatch[1]);
    const article = caseSchema["@graph"].find((item) => item["@type"] === "TechArticle");
    const breadcrumbs = caseSchema["@graph"].find((item) => item["@type"] === "BreadcrumbList");
    assert.ok(article, `${context}: JSON-LD must describe a TechArticle`);
    assert.ok(breadcrumbs, `${context}: JSON-LD must include breadcrumbs`);
    assert.equal(article.headline, caseStudy.headline);
    assert.equal(article.description, caseStudy.metaDescription);
    assert.equal(article.mainEntityOfPage, caseUrl);
    assert.equal(article.inLanguage, "en");
    assert.match(article.dateModified, /^\d{4}-\d{2}-\d{2}$/);
    assert.deepEqual(
        breadcrumbs.itemListElement.map((item) => item.item),
        [canonicalUrl, `${canonicalUrl}#projects`, caseUrl],
        `${context}: breadcrumb URLs must describe the published path`
    );
}

const robots = await readFile(join(dist, "robots.txt"), "utf8");
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
const textSitemap = await readFile(join(dist, "sitemap.txt"), "utf8");
assert.match(robots, /Sitemap: https:\/\/meghdadfadaee\.github\.io\/sitemap\.xml/);
assert.match(robots, /Sitemap: https:\/\/meghdadfadaee\.github\.io\/sitemap\.txt/);
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const textSitemapUrls = textSitemap.trimEnd().split("\n");
assert.deepEqual(sitemapUrls, expectedSitemapUrls, "Sitemap must contain only the homepage and six case-study URLs");
assert.deepEqual(textSitemapUrls, expectedSitemapUrls, "Text sitemap must match the XML sitemap URLs");
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "Sitemap URLs must be unique");
assert.equal(new Set(textSitemapUrls).size, textSitemapUrls.length, "Text sitemap URLs must be unique");
assert.equal((sitemap.match(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g) || []).length, expectedSitemapUrls.length);
assert.match(textSitemap, /\n$/);

for (const relativePath of [
    ".nojekyll",
    ".well-known/discord.txt",
    "assets/site.css",
    "assets/preview.png",
    "assets/og-preview.png",
    "fa/index.html",
    "favicon.ico",
    "favicon.png"
]) {
    await access(join(dist, relativePath));
}

const socialImage = await readFile(join(dist, "assets", "og-preview.png"));
assert.equal(socialImage.subarray(1, 4).toString("ascii"), "PNG");
assert.equal(socialImage.readUInt32BE(16), 1200, "Social image width must match Open Graph metadata");
assert.equal(socialImage.readUInt32BE(20), 630, "Social image height must match Open Graph metadata");

console.log(`Validated ${payload.projects.length} static project cards, six case studies, and the deployment SEO contract`);
