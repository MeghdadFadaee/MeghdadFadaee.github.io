import { readFile } from "node:fs/promises";

const LOCALE_CODE = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const LOCALE_PATH = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OG_LOCALE = /^[a-z]{2}_[A-Z]{2}$/;

function requiredString(value, path) {
    if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${path} must be a non-empty string`);
    return value.trim();
}

export function validateSiteConfig(config) {
    if (config === null || typeof config !== "object" || Array.isArray(config)) throw new TypeError("Site config must be an object");
    let url;
    try { url = new URL(requiredString(config.url, "Site config url")); } catch { throw new TypeError("Site config url must be a valid absolute URL"); }
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new TypeError("Site config url must be an HTTPS origin with a trailing slash");
    const defaultLocale = requiredString(config.defaultLocale, "Site config defaultLocale");
    if (!Array.isArray(config.locales) || config.locales.length < 2) throw new TypeError("Site config locales must contain at least two locales");
    const codes = new Set();
    const paths = new Set();
    const locales = config.locales.map((item, index) => {
        const label = `Site config locales[${index}]`;
        if (item === null || typeof item !== "object" || Array.isArray(item)) throw new TypeError(`${label} must be an object`);
        const code = requiredString(item.code, `${label}.code`);
        const prefix = typeof item.path === "string" ? item.path.trim() : null;
        const direction = requiredString(item.direction, `${label}.direction`);
        const nativeName = requiredString(item.nativeName, `${label}.nativeName`);
        const ogLocale = requiredString(item.ogLocale, `${label}.ogLocale`);
        if (!LOCALE_CODE.test(code)) throw new TypeError(`${label}.code is invalid`);
        if (prefix === null || (prefix !== "" && !LOCALE_PATH.test(prefix))) throw new TypeError(`${label}.path is invalid`);
        if (!new Set(["ltr", "rtl"]).has(direction)) throw new TypeError(`${label}.direction must be ltr or rtl`);
        if (!OG_LOCALE.test(ogLocale)) throw new TypeError(`${label}.ogLocale is invalid`);
        if (codes.has(code)) throw new TypeError(`${label}.code duplicates another locale`);
        if (paths.has(prefix)) throw new TypeError(`${label}.path duplicates another locale`);
        codes.add(code); paths.add(prefix);
        return { code, path: prefix, direction, nativeName, ogLocale };
    });
    const selected = locales.find((locale) => locale.code === defaultLocale);
    if (!selected) throw new TypeError("Site config defaultLocale must exist in locales");
    if (selected.path !== "") throw new TypeError("The default locale must use the root path");
    if (locales.filter((locale) => locale.path === "").length !== 1) throw new TypeError("Exactly one locale must use the root path");
    return { url: url.href, hostname: url.hostname, defaultLocale, locales };
}

export async function loadSiteConfig(filePath) {
    try { return validateSiteConfig(JSON.parse(await readFile(filePath, "utf8"))); }
    catch (error) {
        if (error instanceof SyntaxError) throw new Error(`Unable to read site config from ${filePath}: ${error.message}`, { cause: error });
        throw error;
    }
}

export function localeRoot(locale) { return locale.path ? `/${locale.path}/` : "/"; }
export function localeAbsoluteUrl(site, locale) { return new URL(localeRoot(locale), site.url).href; }
export function caseStudyPath(locale, slug) { return `${localeRoot(locale)}projects/${slug}/`; }
export function caseStudyAbsoluteUrl(site, locale, slug) { return new URL(caseStudyPath(locale, slug), site.url).href; }
export function renderSiteUrlTemplate(template, siteUrl) { return template.replaceAll("{{SITE_URL}}", siteUrl); }
