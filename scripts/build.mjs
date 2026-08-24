import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCaseStudyPage, renderSitemap, renderTextSitemap } from "./case-studies.mjs";
import { loadProjects, renderProjectCards } from "./projects.mjs";
import { loadSiteConfig, renderSiteUrlTemplate } from "./site-config.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(projectRoot, "dist");
const homeTemplatePath = join(projectRoot, "index.html");
const caseStudyTemplatePath = join(projectRoot, "project.html");
const projectDataPath = join(projectRoot, "api", "projects.json");
const siteConfigPath = join(projectRoot, "site.config.json");
const robotsTemplatePath = join(projectRoot, "robots.txt");
const projectMarker = "<!-- PROJECT_CARDS -->";
const caseStudyMarkers = [
    "<!-- CASE_HEAD -->",
    "<!-- CASE_SCHEMA -->",
    "<!-- CASE_BODY -->"
];

async function copyRequiredPath(relativePath) {
    const source = join(projectRoot, relativePath);
    const destination = join(outputDirectory, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
}

const [homeTemplate, caseStudyTemplate, robotsTemplate, payload, site] = await Promise.all([
    readFile(homeTemplatePath, "utf8"),
    readFile(caseStudyTemplatePath, "utf8"),
    readFile(robotsTemplatePath, "utf8"),
    loadProjects(projectDataPath),
    loadSiteConfig(siteConfigPath)
]);

const markerCount = homeTemplate.split(projectMarker).length - 1;
if (markerCount !== 1) {
    throw new Error(`Expected exactly one ${projectMarker} marker in index.html; found ${markerCount}`);
}

for (const marker of caseStudyMarkers) {
    const count = caseStudyTemplate.split(marker).length - 1;
    if (count !== 1) {
        throw new Error(`Expected exactly one ${marker} marker in project.html; found ${count}`);
    }
}

const caseStudyProjects = payload.projects.filter((project) => project.caseStudy);
if (caseStudyProjects.length !== 6) {
    throw new Error(`Expected exactly six case studies; found ${caseStudyProjects.length}`);
}

const renderedHtml = renderSiteUrlTemplate(
    homeTemplate.replace(projectMarker, renderProjectCards(payload.projects)),
    site.url
);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "index.html"), renderedHtml, "utf8");

for (const project of caseStudyProjects) {
    const pageDirectory = join(outputDirectory, "projects", project.caseStudy.slug);
    await mkdir(pageDirectory, { recursive: true });
    await writeFile(
        join(pageDirectory, "index.html"),
        renderCaseStudyPage(caseStudyTemplate, project, payload.updatedAt, site.url),
        "utf8"
    );
}

await writeFile(
    join(outputDirectory, "sitemap.xml"),
    renderSitemap(payload.projects, payload.updatedAt, site.url),
    "utf8"
);
await writeFile(
    join(outputDirectory, "sitemap.txt"),
    renderTextSitemap(payload.projects, site.url),
    "utf8"
);
await writeFile(join(outputDirectory, "robots.txt"), renderSiteUrlTemplate(robotsTemplate, site.url), "utf8");
await writeFile(join(outputDirectory, "CNAME"), `${site.hostname}\n`, "utf8");

for (const relativePath of [
    ".nojekyll",
    ".well-known",
    "api",
    "assets",
    "fa",
    "favicon.ico",
    "favicon.png"
]) {
    await copyRequiredPath(relativePath);
}

console.log(
    `Generated ${payload.projects.length} project cards and ${caseStudyProjects.length} case-study pages`
);
