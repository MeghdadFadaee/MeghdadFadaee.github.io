import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderCaseStudyPage, renderSitemap, renderTextSitemap } from "./case-studies.mjs";
import { validateLocaleSet } from "./localization.mjs";
import { validateProjectsPayload } from "./projects.mjs";
import { validateSiteConfig } from "./site-config.mjs";

const root = new URL("../", import.meta.url);
const site = validateSiteConfig(JSON.parse(await readFile(new URL("site.config.json", root), "utf8")));
const payloads = await Promise.all(site.locales.map(async (locale) => validateProjectsPayload(JSON.parse(await readFile(new URL(`content/${locale.code}.json`, root), "utf8")))));
const localized = validateLocaleSet(site, payloads);

test("renders equivalent localized case-study routes with safe structured data", async () => {
    const template = await readFile(new URL("project.html", root), "utf8");
    for (const { locale, payload } of localized) {
        const project = payload.projects.find((item) => item.id === "mahak-api-platform");
        const html = renderCaseStudyPage(template, project, site, locale, payload);
        assert.match(html, new RegExp(`<html lang="${locale.code}" dir="${locale.direction}">`));
        assert.match(html, new RegExp(`<link rel="canonical" href="https://megh\\.dad${locale.path ? "/fa" : ""}/projects/mahak-api-platform/">`));
        assert.match(html, /hreflang="en" href="https:\/\/megh\.dad\/projects\/mahak-api-platform\/"/);
        assert.match(html, /hreflang="fa" href="https:\/\/megh\.dad\/fa\/projects\/mahak-api-platform\/"/);
        assert.doesNotMatch(html, /CASE_(HEAD|SCHEMA|BODY)|\{\{HTML_/);
        const match = html.match(/id="case-study-schema">\s*([\s\S]*?)\s*<\/script>/);
        const schema = JSON.parse(match[1]);
        assert.equal(schema["@graph"][0].inLanguage, locale.code);
    }
});

test("rejects unsafe case-study slugs and proof links", () => {
    const base = structuredClone(payloads[0]);
    base.projects[0].caseStudy.slug = "../escape";
    assert.throws(() => validateProjectsPayload(base), /lowercase URL-safe slug/);
    const unsafe = structuredClone(payloads[0]);
    unsafe.projects[0].caseStudy.links[0].href = "javascript:alert(1)";
    assert.throws(() => validateProjectsPayload(unsafe), /absolute HTTPS URL/);
});

test("locale validation rejects missing translations and invariant drift", () => {
    const missing = structuredClone(payloads[1]); delete missing.home.contact.title;
    assert.throws(() => validateLocaleSet(site, [payloads[0], missing]), /keys do not match/);
    const drift = structuredClone(payloads[1]); drift.projects[0].caseStudy.metrics[0].value = "25";
    assert.throws(() => validateLocaleSet(site, [payloads[0], drift]), /metric values mismatch/);
});

test("sitemaps contain all 14 localized canonical pages and reciprocal alternates", () => {
    const xml = renderSitemap(localized, site), text = renderTextSitemap(localized, site);
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    assert.equal(urls.length, 14);
    assert.equal(new Set(urls).size, 14);
    assert.deepEqual(text.trim().split("\n"), urls);
    assert.equal((xml.match(/hreflang="x-default"/g) || []).length, 14);
    assert.equal((xml.match(/hreflang="fa"/g) || []).length, 14);
    assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
});
