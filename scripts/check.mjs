import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(projectRoot, "dist");
const canonicalUrl = "https://meghdadfadaee.github.io/";
const html = await readFile(join(dist, "index.html"), "utf8");
const projectsSource = await readFile(join(projectRoot, "api", "projects.json"));
const projectsBuilt = await readFile(join(dist, "api", "projects.json"));
const payload = JSON.parse(projectsSource.toString("utf8"));

assert.equal((html.match(/data-project-card/g) || []).length, payload.projects.length, "Every JSON project must render once");
assert.equal((html.match(/<h1\b/g) || []).length, 1, "The page must contain exactly one h1");
assert.match(html, /<html lang="en">/);
assert.match(html, /<title>Meghdad Fadaee — Backend Engineer &amp; System Architect<\/title>/);
assert.match(html, /<link rel="canonical" href="https:\/\/meghdadfadaee\.github\.io\/">/);
assert.match(html, /<meta property="og:url" content="https:\/\/meghdadfadaee\.github\.io\/">/);
assert.match(html, /<meta name="description" content="[^"]+">/);
assert.match(html, /<meta property="og:image" content="https:\/\/meghdadfadaee\.github\.io\/assets\/og-preview\.png">/);
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

let previousProjectPosition = -1;
for (const project of payload.projects) {
    const escapedTitle = project.title
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    assert.match(html, new RegExp(`<h3[^>]*>${escapedTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/h3>`));
    const projectPosition = html.indexOf(`>${escapedTitle}</h3>`);
    assert.ok(projectPosition > previousProjectPosition, `${project.title} must preserve JSON order`);
    previousProjectPosition = projectPosition;
}

assert.deepEqual(projectsBuilt, projectsSource, "The deployed JSON must byte-match the source JSON");

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
for (const match of html.matchAll(/\shref="#([^"]+)"/g)) {
    assert.ok(ids.has(match[1]), `Fragment #${match[1]} must resolve to an element id`);
}

for (const match of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    assert.match(match[0], /\brel="[^"]*\bnoopener\b[^"]*\bnoreferrer\b[^"]*"/);
}

const schemaMatch = html.match(/<script type="application\/ld\+json" id="profile-schema">\s*([\s\S]*?)\s*<\/script>/);
assert.ok(schemaMatch, "Profile JSON-LD must exist");
const schema = JSON.parse(schemaMatch[1]);
const graphTypes = new Set(schema["@graph"].map((item) => item["@type"]));
assert.ok(graphTypes.has("WebSite"));
assert.ok(graphTypes.has("ProfilePage"));
assert.ok(graphTypes.has("Person"));

const robots = await readFile(join(dist, "robots.txt"), "utf8");
const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
assert.match(robots, /Sitemap: https:\/\/meghdadfadaee\.github\.io\/sitemap\.xml/);
assert.equal((sitemap.match(new RegExp(canonicalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1);

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

console.log(`Validated ${payload.projects.length} static project cards and the deployment SEO contract`);
