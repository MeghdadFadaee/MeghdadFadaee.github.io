import assert from "node:assert/strict";
import test from "node:test";
import {
    renderCaseStudyPage,
    renderSitemap,
    renderTextSitemap
} from "./case-studies.mjs";
import {
    renderProjectCards,
    validateProjectsPayload
} from "./projects.mjs";

function validCaseStudy(overrides = {}) {
    return {
        slug: "safe-useful",
        headline: "Safe & Useful Platform",
        seoTitle: "Safe & Useful Platform Engineering Case Study",
        metaDescription: "A detailed engineering case study covering architecture, delivery, reliability, and measurable outcomes.",
        kicker: "Featured Quest",
        intro: "A reliable platform built to turn a difficult workflow into a clear product.",
        role: "Solo engineer",
        timeline: "2025–present",
        status: "Active",
        metrics: [
            {
                value: "24",
                label: "Active tenants",
                detail: "Measured in production"
            }
        ],
        mission: [
            "Create a maintainable service without hiding the operational tradeoffs."
        ],
        architecture: [
            {
                label: "Client",
                detail: "Sends a validated request."
            },
            {
                label: "Service",
                detail: "Processes the request and records the result."
            }
        ],
        battlePlan: [
            "Fail closed when validation is incomplete.",
            "Keep deployment and rollback paths explicit."
        ],
        bossFight: [
            "The primary constraint was preserving reliability while the system evolved."
        ],
        rewards: [
            "A simpler operating model.",
            "A safer path for future changes."
        ],
        stack: [
            "Node.js",
            "PostgreSQL",
            "Redis"
        ],
        links: [
            {
                label: "View source",
                href: "https://github.com/example/project?x=1&y=2"
            }
        ],
        sourceNote: "Claims are limited to documented or measured results.",
        ...overrides
    };
}

function validPayload(caseStudy = validCaseStudy()) {
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
                    href: "https://github.com/example/project",
                    external: true
                },
                caseStudy
            }
        ]
    };
}

test("case studies replace external card actions with an internal View Quest link", () => {
    const payload = validateProjectsPayload(validPayload());
    const html = renderProjectCards(payload.projects);

    assert.match(html, /href="\/projects\/safe-useful\/"/);
    assert.match(html, />View Quest<\/a>/);
    assert.match(html, /aria-label="Read the Safe &amp; Useful Platform case study"/);
    assert.doesNotMatch(html, /target="_blank"/);
    assert.doesNotMatch(html, /href="https:\/\/github\.com\/example\/project"/);
});

test("renders escaped case-study HTML and script-safe structured data", () => {
    const dangerousHeadline = "Safe </script><script>alert('no')</script> Quest";
    const payload = validateProjectsPayload(validPayload(validCaseStudy({
        headline: dangerousHeadline,
        intro: "Input such as <img src=x onerror=alert(1)> is always treated as text.",
        sourceNote: "Measured & verified."
    })));
    const template = "<!doctype html><html lang=\"en\"><head><!-- CASE_HEAD --><!-- CASE_SCHEMA --></head><body><!-- CASE_BODY --></body></html>";
    const html = renderCaseStudyPage(template, payload.projects[0], "2026-07-29");

    assert.match(html, /Safe &lt;\/script&gt;&lt;script&gt;alert\(&#39;no&#39;\)&lt;\/script&gt; Quest/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.match(html, /href="https:\/\/github\.com\/example\/project\?x=1&amp;y=2"/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.doesNotMatch(html, /<\/script><script>alert\('no'\)<\/script>/);
    assert.doesNotMatch(html, /<img src=x onerror=/);

    const schemaMatch = html.match(
        /<script type="application\/ld\+json" id="case-study-schema">\s*([\s\S]*?)\s*<\/script>/
    );
    assert.ok(schemaMatch);
    assert.match(schemaMatch[1], /\\u003c\/script\\u003e/);
    const schema = JSON.parse(schemaMatch[1]);
    assert.equal(schema["@graph"][0].headline, dangerousHeadline);
    assert.equal(schema["@graph"][0].mainEntityOfPage, "https://meghdadfadaee.github.io/projects/safe-useful/");
});

test("rejects an unsafe case-study slug", () => {
    assert.throws(
        () => validateProjectsPayload(validPayload(validCaseStudy({ slug: "../escape" }))),
        /lowercase URL-safe slug/
    );
});

test("rejects duplicate case-study slugs", () => {
    const payload = validPayload();
    payload.projects.push({
        ...structuredClone(payload.projects[0]),
        title: "Another Project",
        caseStudy: {
            ...structuredClone(payload.projects[0].caseStudy),
            headline: "Another Project"
        }
    });

    assert.throws(() => validateProjectsPayload(payload), /duplicates another case-study slug/);
});

test("rejects unsafe proof links and undersized SEO descriptions", () => {
    assert.throws(
        () => validateProjectsPayload(validPayload(validCaseStudy({
            links: [{ label: "Unsafe", href: "javascript:alert(1)" }]
        }))),
        /absolute HTTPS URL/
    );

    assert.throws(
        () => validateProjectsPayload(validPayload(validCaseStudy({
            metaDescription: "Too short for a useful search result."
        }))),
        /at least 80 characters/
    );
});

test("renders a sitemap containing only the homepage and case-study routes", () => {
    const payload = validateProjectsPayload(validPayload());
    const sitemap = renderSitemap(payload.projects, "2026-07-29");
    const textSitemap = renderTextSitemap(payload.projects);
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    const textUrls = textSitemap.trimEnd().split("\n");

    assert.deepEqual(urls, [
        "https://meghdadfadaee.github.io/",
        "https://meghdadfadaee.github.io/projects/safe-useful/"
    ]);
    assert.deepEqual(textUrls, urls);
    assert.equal((sitemap.match(/<lastmod>2026-07-29<\/lastmod>/g) || []).length, 2);
    assert.match(textSitemap, /\n$/);
});
