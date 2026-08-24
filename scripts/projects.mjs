import { readFile } from "node:fs/promises";
import { validateProjectCaseStudies } from "./case-studies.mjs";
import { caseStudyPath } from "./site-config.mjs";
import { escapeHtml } from "./text.mjs";

const ALLOWED_ICONS = new Set(["star", "heart", "coin", "trophy"]);
const ALLOWED_TAG_STYLES = new Set(["is-primary", "is-success", "is-warning", "is-error"]);
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const INTERNAL_HREF = /^(#[A-Za-z][\w:.-]*|\/(?!\/)[^\u0000-\u001F\u007F]*)$/;
const PROJECT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, path) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${path} must be a non-empty string`);
    }

    if (/[\u0000-\u001F\u007F]/.test(value)) {
        throw new TypeError(`${path} must not contain control characters`);
    }

    return value.trim();
}

function validateExternalHref(href, path) {
    let url;

    try {
        url = new URL(href);
    } catch {
        throw new TypeError(`${path} must be an absolute HTTPS URL`);
    }

    if (url.protocol !== "https:" || url.username || url.password) {
        throw new TypeError(`${path} must be an absolute HTTPS URL without credentials`);
    }
}

export function validateProjectsPayload(payload) {
    if (!isPlainObject(payload)) {
        throw new TypeError("Project payload must be an object");
    }

    if (payload.version !== 3) {
        throw new TypeError(`Unsupported project payload version: ${String(payload.version)}`);
    }

    if (!Array.isArray(payload.projects) || payload.projects.length === 0) {
        throw new TypeError("Project payload must contain at least one project");
    }

    const seenIds = new Set();

    const projects = payload.projects.map((project, projectIndex) => {
        const path = `projects[${projectIndex}]`;

        if (!isPlainObject(project)) {
            throw new TypeError(`${path} must be an object`);
        }

        const id = requireString(project.id, `${path}.id`);
        if (!PROJECT_ID.test(id)) throw new TypeError(`${path}.id must be a lowercase URL-safe ID`);
        if (seenIds.has(id)) throw new TypeError(`${path}.id duplicates another project ID`);
        seenIds.add(id);
        const title = requireString(project.title, `${path}.title`);

        const summary = requireString(project.summary, `${path}.summary`);
        const accent = requireString(project.accent, `${path}.accent`);
        if (!HEX_COLOR.test(accent)) {
            throw new TypeError(`${path}.accent must be a six-digit hexadecimal color`);
        }

        const icon = requireString(project.icon, `${path}.icon`);
        if (!ALLOWED_ICONS.has(icon)) {
            throw new TypeError(`${path}.icon is not supported`);
        }

        if (!Array.isArray(project.tags) || project.tags.length === 0) {
            throw new TypeError(`${path}.tags must contain at least one tag`);
        }

        const tags = project.tags.map((tag, tagIndex) => {
            const tagPath = `${path}.tags[${tagIndex}]`;
            if (!isPlainObject(tag)) {
                throw new TypeError(`${tagPath} must be an object`);
            }

            const style = requireString(tag.style, `${tagPath}.style`);
            if (!ALLOWED_TAG_STYLES.has(style)) {
                throw new TypeError(`${tagPath}.style is not supported`);
            }

            return {
                group: requireString(tag.group, `${tagPath}.group`),
                label: requireString(tag.label, `${tagPath}.label`),
                style
            };
        });

        if (!isPlainObject(project.cta)) {
            throw new TypeError(`${path}.cta must be an object`);
        }

        const cta = {
            label: requireString(project.cta.label, `${path}.cta.label`),
            href: requireString(project.cta.href, `${path}.cta.href`),
            external: project.cta.external
        };

        if (typeof cta.external !== "boolean") {
            throw new TypeError(`${path}.cta.external must be a boolean`);
        }

        if (cta.external) {
            validateExternalHref(cta.href, `${path}.cta.href`);
        } else if (!INTERNAL_HREF.test(cta.href)) {
            throw new TypeError(`${path}.cta.href must be a fragment or root-relative URL`);
        }

        const normalizedProject = {
            id,
            title,
            summary,
            accent,
            icon,
            tags,
            cta
        };

        if (project.caseStudy !== undefined) {
            normalizedProject.caseStudy = project.caseStudy;
        }

        return normalizedProject;
    });

    return validateProjectCaseStudies({
        ...payload,
        projects
    });
}

export async function loadProjects(filePath) {
    let payload;

    try {
        payload = JSON.parse(await readFile(filePath, "utf8"));
    } catch (error) {
        throw new Error(`Unable to read project data from ${filePath}: ${error.message}`, { cause: error });
    }

    return validateProjectsPayload(payload);
}

function interpolate(pattern, values) {
    return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, value), pattern);
}

export function renderProjectCards(projects, locale, ui) {
    return projects.map((project, index) => {
        const titleId = `project-${index + 1}-${project.id}`;
        const cardHref = project.caseStudy ? caseStudyPath(locale, project.caseStudy.slug) : project.cta.href;
        const cardLabel = project.caseStudy ? ui.viewQuest : project.cta.label;
        const cardIsExternal = project.caseStudy ? false : project.cta.external;
        const ariaLabel = project.caseStudy
            ? interpolate(ui.viewQuestAria, { title: project.caseStudy.headline })
            : interpolate(ui.ctaAria, { label: project.cta.label, title: project.title });
        const externalAttributes = cardIsExternal
            ? ' target="_blank" rel="noopener noreferrer"'
            : "";
        const badges = project.tags.map((tag) => `
                        <span class="nes-badge is-icon">
                            <span class="is-dark">${escapeHtml(tag.group)}</span>
                            <span class="${escapeHtml(tag.style)} w-24">${escapeHtml(tag.label)}</span>
                        </span>`).join("");

        return `            <article class="nes-container is-rounded is-dark flex flex-col project-card" data-project-card aria-labelledby="${escapeHtml(titleId)}">
                <div class="flex justify-between items-start gap-4 mb-4">
                    <h3 id="${escapeHtml(titleId)}" class="leading-relaxed text-sm" style="color: ${escapeHtml(project.accent)}">${escapeHtml(project.title)}</h3>
                    <i class="nes-icon ${escapeHtml(project.icon)} is-small" aria-hidden="true"></i>
                </div>
                <p class="text-xs min-h-20 text-gray-300 leading-7">${escapeHtml(project.summary)}</p>
                <div class="mt-4 mb-4 flex flex-wrap gap-2" aria-label="${escapeHtml(ui.technologyTagsAria)}">${badges}
                </div>
                <a class="nes-btn is-primary w-full mt-auto" href="${escapeHtml(cardHref)}" aria-label="${escapeHtml(ariaLabel)}"${externalAttributes}>${escapeHtml(cardLabel)}</a>
            </article>`;
    }).join("\n");
}

export { escapeHtml };
