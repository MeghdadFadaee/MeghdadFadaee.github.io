import assert from "node:assert/strict";
import test from "node:test";
import { renderProjectCards, validateProjectsPayload } from "./projects.mjs";

const locale = { code: "en", path: "", direction: "ltr" };
const ui = { technologyTagsAria: "Technology tags", viewQuest: "View Quest", viewQuestAria: "Read {title}", ctaAria: "{label}: {title}" };
function fixture(overrides = {}) {
    return { version: 3, projects: [{ id: "safe-project", title: "Safe & Useful", accent: "#209cee", icon: "star", summary: "A <script>safe</script> project.", tags: [{ group: "API", label: "Go", style: "is-primary" }], cta: { label: "GitHub", href: "https://github.com/example/project?x=1&y=2", external: true }, ...overrides }] };
}

test("validates stable project IDs and renders escaped localized cards", () => {
    const payload = validateProjectsPayload(fixture());
    const html = renderProjectCards(payload.projects, locale, ui);
    assert.equal(payload.projects[0].id, "safe-project");
    assert.match(html, /Safe &amp; Useful/);
    assert.match(html, /&lt;script&gt;safe&lt;\/script&gt;/);
    assert.match(html, /x=1&amp;y=2/);
    assert.match(html, /aria-label="GitHub: Safe &amp; Useful"/);
    assert.doesNotMatch(html, /<script>/);
});

for (const [name, overrides] of [["project ID", { id: "../bad" }], ["accent", { accent: "red" }], ["icon", { icon: "close" }], ["external URL", { cta: { label: "Open", href: "javascript:alert(1)", external: true } }], ["internal URL", { cta: { label: "Open", href: "//example.com", external: false } }]]) {
    test(`rejects invalid ${name}`, () => assert.throws(() => validateProjectsPayload(fixture(overrides))));
}

test("rejects duplicate stable IDs", () => {
    const payload = fixture(); payload.projects.push({ ...structuredClone(payload.projects[0]), title: "Another" });
    assert.throws(() => validateProjectsPayload(payload), /duplicates another project ID/);
});
