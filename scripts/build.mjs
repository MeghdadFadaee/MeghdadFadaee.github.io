import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjects, renderProjectCards } from "./projects.mjs";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(projectRoot, "dist");
const templatePath = join(projectRoot, "index.html");
const projectDataPath = join(projectRoot, "api", "projects.json");
const projectMarker = "<!-- PROJECT_CARDS -->";

async function copyRequiredPath(relativePath) {
    const source = join(projectRoot, relativePath);
    const destination = join(outputDirectory, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
}

const [template, payload] = await Promise.all([
    readFile(templatePath, "utf8"),
    loadProjects(projectDataPath)
]);

const markerCount = template.split(projectMarker).length - 1;
if (markerCount !== 1) {
    throw new Error(`Expected exactly one ${projectMarker} marker in index.html; found ${markerCount}`);
}

const renderedHtml = template.replace(projectMarker, renderProjectCards(payload.projects));

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await writeFile(join(outputDirectory, "index.html"), renderedHtml, "utf8");

for (const relativePath of [
    ".nojekyll",
    ".well-known",
    "api",
    "assets",
    "fa",
    "favicon.ico",
    "favicon.png",
    "robots.txt",
    "sitemap.xml"
]) {
    await copyRequiredPath(relativePath);
}

console.log(`Generated ${payload.projects.length} static project cards in dist/index.html`);
