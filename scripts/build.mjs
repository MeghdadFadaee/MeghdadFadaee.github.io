import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCaseStudyPage, renderSitemap, renderTextSitemap } from "./case-studies.mjs";
import { renderHomePage } from "./home.mjs";
import { loadLocaleContent, validateLocaleSet } from "./localization.mjs";
import { renderProjectCards } from "./projects.mjs";
import { loadSiteConfig, renderSiteUrlTemplate } from "./site-config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const [homeTemplate, caseTemplate, robotsTemplate, site] = await Promise.all([
    readFile(join(root, "index.html"), "utf8"), readFile(join(root, "project.html"), "utf8"),
    readFile(join(root, "robots.txt"), "utf8"), loadSiteConfig(join(root, "site.config.json"))
]);
const payloads = await Promise.all(site.locales.map((locale) => loadLocaleContent(join(root, "content", `${locale.code}.json`))));
const localized = validateLocaleSet(site, payloads);
for (const [template, markers] of [[homeTemplate, ["{{HTML_LANG}}", "{{HTML_DIR}}", "<!-- HOME_HEAD -->", "<!-- HOME_SCHEMA -->", "<!-- HOME_BODY -->", "<!-- HOME_SCRIPT -->"]], [caseTemplate, ["{{HTML_LANG}}", "{{HTML_DIR}}", "<!-- CASE_HEAD -->", "<!-- CASE_SCHEMA -->", "<!-- CASE_BODY -->"]]]) {
    for (const marker of markers) if (template.split(marker).length - 1 !== 1) throw new Error(`Expected exactly one ${marker} marker`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
let cardCount = 0, caseCount = 0;
for (const { locale, payload } of localized) {
    const outputRoot = locale.path ? join(dist, locale.path) : dist;
    await mkdir(outputRoot, { recursive: true });
    const cards = renderProjectCards(payload.projects, locale, payload.home.projects);
    cardCount += payload.projects.length;
    await writeFile(join(outputRoot, "index.html"), renderHomePage(homeTemplate, site, locale, payload, cards), "utf8");
    for (const project of payload.projects.filter((item) => item.caseStudy)) {
        const directory = join(outputRoot, "projects", project.caseStudy.slug);
        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, "index.html"), renderCaseStudyPage(caseTemplate, project, site, locale, payload), "utf8");
        caseCount += 1;
    }
}

await writeFile(join(dist, "sitemap.xml"), renderSitemap(localized, site), "utf8");
await writeFile(join(dist, "sitemap.txt"), renderTextSitemap(localized, site), "utf8");
await writeFile(join(dist, "robots.txt"), renderSiteUrlTemplate(robotsTemplate, site.url), "utf8");
await writeFile(join(dist, "CNAME"), `${site.hostname}\n`, "utf8");
for (const relative of [".nojekyll", ".well-known", "assets", "favicon.ico", "favicon.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "site.webmanifest"]) {
    const target = join(dist, relative); await mkdir(dirname(target), { recursive: true }); await cp(join(root, relative), target, { recursive: true });
}
console.log(`Generated ${cardCount} localized project cards and ${caseCount} localized case-study pages`);
