import { readFile } from "node:fs/promises";

export function validateSiteConfig(config) {
    if (config === null || typeof config !== "object" || Array.isArray(config)) {
        throw new TypeError("Site config must be an object");
    }

    if (typeof config.url !== "string" || config.url.trim() === "") {
        throw new TypeError("Site config url must be a non-empty string");
    }

    let url;

    try {
        url = new URL(config.url.trim());
    } catch {
        throw new TypeError("Site config url must be a valid absolute URL");
    }

    if (
        url.protocol !== "https:"
        || url.username
        || url.password
        || url.pathname !== "/"
        || url.search
        || url.hash
    ) {
        throw new TypeError("Site config url must be an HTTPS origin with a trailing slash");
    }

    return {
        url: url.href,
        hostname: url.hostname
    };
}

export async function loadSiteConfig(filePath) {
    let config;

    try {
        config = JSON.parse(await readFile(filePath, "utf8"));
    } catch (error) {
        throw new Error(`Unable to read site config from ${filePath}: ${error.message}`, { cause: error });
    }

    return validateSiteConfig(config);
}

export function renderSiteUrlTemplate(template, siteUrl) {
    return template.replaceAll("{{SITE_URL}}", siteUrl);
}
