import assert from "node:assert/strict";
import test from "node:test";
import { caseStudyPath, localeRoot, renderSiteUrlTemplate, validateSiteConfig } from "./site-config.mjs";

const config = { url: "https://megh.dad/", defaultLocale: "en", locales: [{ code: "en", path: "", direction: "ltr", nativeName: "English", ogLocale: "en_US" }, { code: "fa", path: "fa", direction: "rtl", nativeName: "فارسی", ogLocale: "fa_IR" }] };
test("normalizes locale registry and route helpers", () => {
    const site = validateSiteConfig(config);
    assert.equal(site.hostname, "megh.dad");
    assert.equal(localeRoot(site.locales[0]), "/");
    assert.equal(localeRoot(site.locales[1]), "/fa/");
    assert.equal(caseStudyPath(site.locales[1], "domainops"), "/fa/projects/domainops/");
});
test("rejects invalid domains, directions, prefixes, and duplicate prefixes", () => {
    assert.throws(() => validateSiteConfig({ ...config, url: "http://megh.dad/" }), /HTTPS origin/);
    assert.throws(() => validateSiteConfig({ ...config, locales: config.locales.map((x, i) => i ? { ...x, direction: "sideways" } : x) }), /ltr or rtl/);
    assert.throws(() => validateSiteConfig({ ...config, locales: config.locales.map((x, i) => i ? { ...x, path: "" } : x) }), /duplicates/);
});
test("renders the configurable domain", () => assert.equal(renderSiteUrlTemplate("{{SITE_URL}}x", "https://megh.dad/"), "https://megh.dad/x"));
