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
async function validateIco(file, expectedSizes) {
    const ico = await readFile(file);
    assert.ok(ico.length >= 6, `${file}: ICO header must exist`);
    assert.equal(ico.readUInt16LE(0), 0, `${file}: ICO reserved field must be zero`);
    assert.equal(ico.readUInt16LE(2), 1, `${file}: image type must be ICO`);
    const count = ico.readUInt16LE(4);
    assert.equal(count, expectedSizes.length, `${file}: unexpected image count`);
    const directoryEnd = 6 + count * 16;
    assert.ok(directoryEnd <= ico.length, `${file}: ICO directory must fit in the file`);
    const entries = [];
    for (let index = 0; index < count; index += 1) {
        const entry = 6 + index * 16;
        const width = ico[entry] || 256, height = ico[entry + 1] || 256;
        const byteLength = ico.readUInt32LE(entry + 8), offset = ico.readUInt32LE(entry + 12);
        assert.equal(width, height, `${file}: entry ${index} must be square`);
        assert.equal(ico.readUInt16LE(entry + 4), 1, `${file}: entry ${index} must have one color plane`);
        assert.equal(ico.readUInt16LE(entry + 6), 32, `${file}: entry ${index} must be 32-bit`);
        assert.ok(byteLength > 0, `${file}: entry ${index} must not be empty`);
        assert.ok(offset >= directoryEnd && offset + byteLength <= ico.length, `${file}: entry ${index} data must be in bounds`);
        const png = ico.subarray(offset, offset + 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
        if (png) {
            assert.equal(ico.readUInt32BE(offset + 16), width, `${file}: entry ${index} PNG width must match its directory entry`);
            assert.equal(ico.readUInt32BE(offset + 20), height, `${file}: entry ${index} PNG height must match its directory entry`);
        } else {
            assert.ok(ico.readUInt32LE(offset) >= 40, `${file}: entry ${index} must contain a supported bitmap header`);
            assert.equal(ico.readInt32LE(offset + 4), width, `${file}: entry ${index} bitmap width must match its directory entry`);
            assert.equal(ico.readInt32LE(offset + 8), height * 2, `${file}: entry ${index} bitmap height must include the XOR and AND masks`);
        }
        entries.push({ width, offset, end: offset + byteLength });
    }
    assert.deepEqual(entries.map(({ width }) => width).sort((a, b) => a - b), expectedSizes);
    const ranges = entries.toSorted((a, b) => a.offset - b.offset);
    for (let index = 1; index < ranges.length; index += 1) assert.ok(ranges[index].offset >= ranges[index - 1].end, `${file}: image entries must not overlap`);
    assert.equal(Math.max(...entries.map(({ end }) => end)), ico.length, `${file}: last image entry must end at EOF`);
    return ico;
}
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
    assert.match(page.html, /<style id="site-styles">[\s\S]*\.nes-btn[\s\S]*\.site-brand/, `${page.route}: complete styles must be present before first paint`);
    assert.doesNotMatch(page.html, /<link\b[^>]*(?:rel="stylesheet"|as="style")/, `${page.route}: stylesheets must not block or restyle the page after first paint`);
    assert.doesNotMatch(page.html, /url\((?:"\.\/files\/|\.\.\/webfonts\/)/, `${page.route}: inlined stylesheet assets must use root-relative URLs`);
    assert.match(page.html, /<link rel="preload" href="\/assets\/fonts\/files\//, `${page.route}: primary locale font must be preloaded`);
    assert.doesNotMatch(page.html, /(?:unpkg\.com\/nes\.css|fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)/, `${page.route}: page assets must not depend on a CDN`);
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
for (const file of ["assets/preview.png", "assets/og-preview.png", "assets/nes.min.css", "assets/fonts/fonts.css", "assets/fonts/files/press-start-2p-latin-400-normal.woff2", "assets/fonts/files/lalezar-arabic-400-normal.woff2", "assets/fonts/files/vazirmatn-arabic-700-normal.woff2", "assets/fontawesome/css/all.min.css", "assets/fontawesome/webfonts/fa-brands-400.woff2", "assets/fontawesome/webfonts/fa-solid-900.woff2", "favicon.ico", "favicon.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "site.webmanifest", ".nojekyll"]) await access(join(dist, file));
const expectedFaviconSizes = [16, 32, 48, 64, 128, 256];
const sourceFavicon = await validateIco(join(root, "favicon.ico"), expectedFaviconSizes);
const builtFavicon = await validateIco(join(dist, "favicon.ico"), expectedFaviconSizes);
assert.deepEqual(builtFavicon, sourceFavicon, "dist/favicon.ico must be an exact copy of the source favicon");
await assert.rejects(access(join(dist, "api", "projects.json")));
console.log("Validated 14 localized pages, 44 cards, 12 case studies, SEO alternates, schemas, and internal links");
