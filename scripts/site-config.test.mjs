import assert from "node:assert/strict";
import test from "node:test";
import { renderSiteUrlTemplate, validateSiteConfig } from "./site-config.mjs";

test("normalizes a valid site origin", () => {
    assert.deepEqual(validateSiteConfig({ url: "https://megh.dad/" }), {
        url: "https://megh.dad/",
        hostname: "megh.dad"
    });
});

test("rejects insecure URLs and URLs with paths", () => {
    assert.throws(() => validateSiteConfig({ url: "http://megh.dad/" }), /HTTPS origin/);
    assert.throws(() => validateSiteConfig({ url: "https://megh.dad/portfolio/" }), /HTTPS origin/);
});

test("renders the configured URL into source templates", () => {
    assert.equal(
        renderSiteUrlTemplate("{{SITE_URL}} and {{SITE_URL}}assets/icon.png", "https://megh.dad/"),
        "https://megh.dad/ and https://megh.dad/assets/icon.png"
    );
});
