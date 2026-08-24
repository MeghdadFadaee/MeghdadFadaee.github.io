import { readFile } from "node:fs/promises";
import { validateProjectsPayload } from "./projects.mjs";

function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

function validateShape(reference, candidate, path = "content") {
    if (typeof reference === "string") {
        if (typeof candidate !== "string" || candidate.trim() === "") throw new TypeError(`${path} must be a non-empty translated string`);
        return;
    }
    if (Array.isArray(reference)) {
        if (!Array.isArray(candidate) || candidate.length !== reference.length) throw new TypeError(`${path} must contain exactly ${reference.length} items`);
        reference.forEach((item, index) => validateShape(item, candidate[index], `${path}[${index}]`));
        return;
    }
    if (isObject(reference)) {
        if (!isObject(candidate)) throw new TypeError(`${path} must be an object`);
        const expected = Object.keys(reference).sort();
        const actual = Object.keys(candidate).sort();
        if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new TypeError(`${path} keys do not match the default locale`);
        for (const key of expected) validateShape(reference[key], candidate[key], `${path}.${key}`);
    }
}

export async function loadLocaleContent(filePath) {
    let payload;
    try { payload = JSON.parse(await readFile(filePath, "utf8")); }
    catch (error) { throw new Error(`Unable to read locale content from ${filePath}: ${error.message}`, { cause: error }); }
    const validated = validateProjectsPayload(payload);
    if (typeof validated.locale !== "string" || !validated.locale) throw new TypeError("Locale content must declare locale");
    if (!isObject(validated.home) || !isObject(validated.caseUi)) throw new TypeError("Locale content must include home and caseUi objects");
    return validated;
}

function invariant(condition, message) { if (!condition) throw new TypeError(message); }

export function validateLocaleSet(site, payloads) {
    invariant(payloads.length === site.locales.length, "Every registered locale must have one content file");
    const byCode = new Map(payloads.map((payload) => [payload.locale, payload]));
    invariant(byCode.size === payloads.length, "Locale content codes must be unique");
    for (const locale of site.locales) invariant(byCode.has(locale.code), `Missing content/${locale.code}.json`);
    const reference = byCode.get(site.defaultLocale);
    for (const locale of site.locales) {
        const payload = byCode.get(locale.code);
        validateShape(reference.home, payload.home, `${locale.code}.home`);
        validateShape(reference.caseUi, payload.caseUi, `${locale.code}.caseUi`);
        invariant(payload.projects.length === reference.projects.length, `${locale.code} project count differs from default locale`);
        payload.projects.forEach((project, index) => {
            const base = reference.projects[index];
            invariant(project.id === base.id, `${locale.code} project ID/order mismatch at index ${index}`);
            invariant(project.accent === base.accent && project.icon === base.icon, `${locale.code}.${project.id} visual configuration mismatch`);
            invariant(project.cta.href === base.cta.href && project.cta.external === base.cta.external, `${locale.code}.${project.id} CTA configuration mismatch`);
            invariant(project.tags.length === base.tags.length && project.tags.every((tag, i) => tag.style === base.tags[i].style), `${locale.code}.${project.id} tag configuration mismatch`);
            invariant(Boolean(project.caseStudy) === Boolean(base.caseStudy), `${locale.code}.${project.id} case-study mismatch`);
            if (base.caseStudy) {
                const current = project.caseStudy;
                invariant(current.slug === base.caseStudy.slug, `${locale.code}.${project.id} case-study slug mismatch`);
                invariant(JSON.stringify(current.metrics.map((item) => item.value)) === JSON.stringify(base.caseStudy.metrics.map((item) => item.value)), `${locale.code}.${project.id} metric values mismatch`);
                invariant(JSON.stringify(current.stack) === JSON.stringify(base.caseStudy.stack), `${locale.code}.${project.id} stack mismatch`);
                invariant(JSON.stringify(current.links.map((item) => item.href)) === JSON.stringify(base.caseStudy.links.map((item) => item.href)), `${locale.code}.${project.id} proof links mismatch`);
                for (const key of ["metrics", "architecture", "battlePlan", "bossFight", "rewards", "links"]) invariant(current[key].length === base.caseStudy[key].length, `${locale.code}.${project.id}.${key} length mismatch`);
            }
        });
    }
    return site.locales.map((locale) => ({ locale, payload: byCode.get(locale.code) }));
}
