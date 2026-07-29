import assert from "node:assert/strict";
import test from "node:test";
import { renderProjectCards, validateProjectsPayload } from "./projects.mjs";

function validPayload(overrides = {}) {
    return {
        version: 2,
        projects: [
            {
                title: "Safe & Useful",
                accent: "#209cee",
                icon: "star",
                summary: "A useful <script>alert('no')</script> project.",
                tags: [
                    {
                        group: "API",
                        label: "Go",
                        style: "is-primary"
                    }
                ],
                cta: {
                    label: "GitHub",
                    href: "https://github.com/example/project?x=1&y=2",
                    external: true
                },
                ...overrides
            }
        ]
    };
}

test("validates and normalizes supported project data", () => {
    const payload = validateProjectsPayload(validPayload());
    assert.equal(payload.projects[0].title, "Safe & Useful");
});

test("escapes project content and attributes when rendering", () => {
    const payload = validateProjectsPayload(validPayload());
    const html = renderProjectCards(payload.projects);

    assert.match(html, /Safe &amp; Useful/);
    assert.match(html, /&lt;script&gt;alert\(&#39;no&#39;\)&lt;\/script&gt;/);
    assert.match(html, /x=1&amp;y=2/);
    assert.doesNotMatch(html, /<script>/);
});

for (const [name, overrides] of [
    ["invalid accent", { accent: "red" }],
    ["invalid icon", { icon: "close" }],
    ["unsafe external URL", { cta: { label: "Open", href: "javascript:alert(1)", external: true } }],
    ["unsafe internal URL", { cta: { label: "Open", href: "//example.com", external: false } }]
]) {
    test(`rejects ${name}`, () => {
        assert.throws(() => validateProjectsPayload(validPayload(overrides)));
    });
}

test("rejects duplicate project titles", () => {
    const payload = validPayload();
    payload.projects.push({
        ...payload.projects[0],
        title: " safe & useful "
    });

    assert.throws(() => validateProjectsPayload(payload), /duplicates/);
});
