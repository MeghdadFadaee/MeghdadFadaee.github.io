import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocaleContent, validateLocaleSet } from "./localization.mjs";
import { caseStudyAbsoluteUrl, caseStudyPath, loadSiteConfig, localeAbsoluteUrl, localeRoot } from "./site-config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const site = await loadSiteConfig(join(root, "site.config.json"));
const localized = validateLocaleSet(site, await Promise.all(site.locales.map((locale) => loadLocaleContent(join(root, "content", `${locale.code}.json`)))));
const allPages = [];

function regexEscape(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function pageFile(locale, slug = null) { return join(dist, ...(locale.path ? [locale.path] : []), ...(slug ? ["projects", slug] : []), "index.html"); }
function extractSchema(html, id) { const match = html.match(new RegExp(`<script type="application/ld\\+json" id="${id}">\\s*([\\s\\S]*?)\\s*<\\/script>`)); assert.ok(match, `${id} must exist`); return JSON.parse(match[1]); }
function externalLinksAreSafe(html, label) {
    for (const match of html.matchAll(/<a\b[^>]*href="https:\/\/[^\"]+"[^>]*>/g)) {
        assert.match(match[0], /target="_blank"/, `${label}: external link must open in a new tab`);
        assert.match(match[0], /rel="[^"]*noopener[^"]*noreferrer[^"]*"/, `${label}: external link must be protected`);
    }
}

for (const { locale, payload } of localized) {
    const homeUrl = localeAbsoluteUrl(site, locale);
    const home = await readFile(pageFile(locale), "utf8");
    allPages.push({ html: home, file: pageFile(locale), route: localeRoot(locale) });
    assert.match(home, new RegExp(`<html lang="${locale.code}" dir="${locale.direction}">`));
    assert.equal((home.match(/<h1\b/g) || []).length, 1);
    assert.equal((home.match(/data-project-card/g) || []).length, 22);
    assert.match(home, new RegExp(`<link rel="canonical" href="${regexEscape(homeUrl)}">`));
    assert.match(home, new RegExp(`<meta property="og:locale" content="${locale.ogLocale}">`));
    assert.match(home, /<form id="party-form"/);
    assert.match(home, /mailto:MeghdadFadaee@gmail\.com\?subject=/);
    assert.match(home, /const targets=\{about:'#about',skills:'#about',projects:'#projects',contact:'#contact'\}/);
    assert.doesNotMatch(home, /fetch\s*\(|HOME_(HEAD|BODY|SCHEMA|SCRIPT)|\{\{HTML_|PROJECT_CARDS/);
    assert.match(home, new RegExp(`>${regexEscape(payload.home.stats.title)}<`));
    assert.match(home, new RegExp(`>${regexEscape(payload.home.projects.title)}<`));
    assert.match(home, new RegExp(`>${regexEscape(payload.home.contact.title)}<`));
    const profile = extractSchema(home, "profile-schema");
    assert.ok(profile["@graph"].some((item) => item["@type"] === "ProfilePage" && item.inLanguage === locale.code));
    assert.ok(profile["@graph"].some((item) => item["@type"] === "Person"));
    externalLinksAreSafe(home, `${locale.code} homepage`);
    for (const alternate of site.locales) assert.match(home, new RegExp(`hreflang="${alternate.code}" href="${regexEscape(localeAbsoluteUrl(site, alternate))}"`));
    assert.match(home, new RegExp(`hreflang="x-default" href="${regexEscape(site.url)}"`));

    const other = site.locales.find((entry) => entry.code !== locale.code);
    assert.match(home, new RegExp(`hreflang="${other.code}"[^>]*href="${regexEscape(localeRoot(other))}"`));
    for (const project of payload.projects.filter((item) => item.caseStudy)) {
        const slug = project.caseStudy.slug;
        assert.match(home, new RegExp(`href="${regexEscape(caseStudyPath(locale, slug))}"`));
        const html = await readFile(pageFile(locale, slug), "utf8");
        allPages.push({ html, file: pageFile(locale, slug), route: caseStudyPath(locale, slug) });
        const url = caseStudyAbsoluteUrl(site, locale, slug);
        assert.match(html, new RegExp(`<html lang="${locale.code}" dir="${locale.direction}">`));
        assert.equal((html.match(/<h1\b/g) || []).length, 1);
        assert.match(html, new RegExp(`<link rel="canonical" href="${regexEscape(url)}">`));
        assert.match(html, new RegExp(`href="${regexEscape(caseStudyPath(other, slug))}"`));
        assert.doesNotMatch(html, /fetch\s*\(|CASE_(HEAD|BODY|SCHEMA)|\{\{HTML_/);
        for (const alternate of site.locales) assert.match(html, new RegExp(`hreflang="${alternate.code}" href="${regexEscape(caseStudyAbsoluteUrl(site, alternate, slug))}"`));
        const schema = extractSchema(html, "case-study-schema");
        const article = schema["@graph"].find((item) => item["@type"] === "TechArticle");
        const breadcrumb = schema["@graph"].find((item) => item["@type"] === "BreadcrumbList");
        assert.equal(article.inLanguage, locale.code); assert.equal(article.mainEntityOfPage, url); assert.equal(breadcrumb.inLanguage, locale.code);
        externalLinksAreSafe(html, `${locale.code}/${slug}`);
    }
}

const faHome = allPages.find((page) => page.route === "/fa/").html;
for (const accidental of ["Player Stats", "Quest Log (Projects)", "Join Party", "Mission Brief", "Battle Plan", "Quest Rewards"]) assert.doesNotMatch(faHome, new RegExp(`>${regexEscape(accidental)}<`));
assert.match(faHome, /[\u0600-\u06ff]/);
const siteCss = await readFile(join(dist, "assets", "site.css"), "utf8");
assert.match(siteCss, /html\[lang=fa\].*Vazirmatn/);
assert.match(siteCss, /\.site-brand\{[^}]*min-height:48px/, "site brand must meet the minimum touch-target height");

for (const page of allPages) {
    assert.match(page.html, /<header\b[^>]*>\s*<nav\b/, `${page.route}: page navigation must have a header landmark`);
    assert.match(page.html, /<link rel="manifest" href="\/site\.webmanifest">/, `${page.route}: web app manifest must be linked`);
    assert.match(page.html, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png">/, `${page.route}: Apple touch icon must be linked`);
    assert.match(page.html, /<link href="\/assets\/site\.css" rel="preload" as="style"/, `${page.route}: first-party CSS must load without blocking rendering`);
    const ids = new Set([...page.html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
    for (const match of page.html.matchAll(/href="(\/(?!\/)[^"]*)"/g)) {
        const href = match[1], [rawPath, fragment] = href.split("#"), path = rawPath || page.route;
        const relative = path.replace(/^\//, "");
        const target = path.endsWith("/") ? join(dist, relative, "index.html") : join(dist, relative);
        await access(target);
        if (fragment && target.endsWith("index.html")) {
            const targetHtml = target === page.file ? page.html : await readFile(target, "utf8");
            const targetIds = target === page.file ? ids : new Set([...targetHtml.matchAll(/\sid="([^"]+)"/g)].map((item) => item[1]));
            assert.ok(targetIds.has(fragment), `${page.route}: #${fragment} must resolve in ${path}`);
        }
    }
}

const expectedUrls = allPages.map((page) => new URL(page.route, site.url).href);
const xml = await readFile(join(dist, "sitemap.xml"), "utf8"), text = await readFile(join(dist, "sitemap.txt"), "utf8"), robots = await readFile(join(dist, "robots.txt"), "utf8");
const xmlUrls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert.deepEqual(xmlUrls, expectedUrls); assert.deepEqual(text.trim().split("\n"), expectedUrls); assert.equal(xmlUrls.length, 14);
assert.equal((xml.match(/hreflang="x-default"/g) || []).length, 14); assert.equal((xml.match(/hreflang="en"/g) || []).length, 14); assert.equal((xml.match(/hreflang="fa"/g) || []).length, 14);
assert.match(robots, /Sitemap: https:\/\/megh\.dad\/sitemap\.xml/); assert.match(robots, /Sitemap: https:\/\/megh\.dad\/sitemap\.txt/);
assert.equal(await readFile(join(dist, "CNAME"), "utf8"), "megh.dad\n");
for (const file of ["assets/preview.png", "assets/og-preview.png", "favicon.ico", "favicon.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "site.webmanifest", ".nojekyll"]) await access(join(dist, file));
await assert.rejects(access(join(dist, "api", "projects.json")));
console.log("Validated 14 localized pages, 44 cards, 12 case studies, SEO alternates, schemas, and internal links");
