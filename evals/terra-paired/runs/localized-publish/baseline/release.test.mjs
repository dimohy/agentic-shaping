import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { promoteRelease } from "./release.mjs";

const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const js = "console.log('안녕');";
const css = "body { color: red; }";
const script = `site-assets/app.${hash(js)}.js`;
const style = `site-assets/site.${hash(css)}.css`;
const active = Object.freeze({ version: "old" });
function fixture() {
  return {
    version: "v0.8.2",
    assets: { [script]: js, [style]: css },
    pages: Object.fromEntries(["en", "ko", "ja", "zh"].map((locale) => {
      const prefix = locale === "en" ? "./" : "../";
      return [locale, `<meta content="v0.8.2" name="application-version"><span data-site-version>  v0.8.2 \n</span><script src="${prefix}${script}"></script><link href="${prefix}${style}" rel="stylesheet">`];
    })),
  };
}
function rejected(candidate) {
  const before = structuredClone(candidate);
  const result = promoteRelease(active, candidate);
  assert.equal(result.ok, false);
  assert.equal(result.active, active);
  assert.ok(result.errors.length);
  assert.deepEqual(candidate, before);
}
test("promotes a complete bundle without mutation", () => {
  const candidate = fixture();
  const before = structuredClone(candidate);
  assert.deepEqual(promoteRelease(active, candidate), { ok: true, active: candidate, errors: [] });
  assert.deepEqual(candidate, before);
});
test("rejects invalid versions and locales", () => {
  for (const version of ["v0.8", "v0.8.2-beta", "0.8.2", "v-1.0.0", "v1.2.3.4", "v1.2.3\n"]) {
    const c = fixture(); c.version = version; rejected(c);
  }
  let c = fixture(); delete c.pages.ko; rejected(c);
  c = fixture(); c.pages.fr = c.pages.en; rejected(c);
  rejected(null);
});
test("rejects missing, mismatched, or duplicate version markers", () => {
  for (const mutate of [
    (h) => h.replace('content="v0.8.2"', 'content="v0.8.3"'),
    (h) => h.replace('v0.8.2 \n</span>', 'v0.8.3 \n</span>'),
    (h) => h + '<meta name="application-version" content="v0.8.2">',
    (h) => h + '<span data-site-version>v0.8.2</span>',
    (h) => h.replace('data-site-version', 'data-other'),
  ]) { const c = fixture(); c.pages.ja = mutate(c.pages.ja); rejected(c); }
});
test("rejects bad asset references and content", () => {
  for (const replacement of [
    `https://other.example/${script}`, `//other.example/${script}`, `../${script}?v=1`,
    `../site-assets/app.000000000000.js`, `../${style}`,
  ]) {
    const c = fixture(); c.pages.ko = c.pages.ko.replace(`../${script}`, replacement); rejected(c);
  }
  let c = fixture(); delete c.assets[style]; rejected(c);
  c = fixture(); c.assets[script] += "changed"; rejected(c);
  c = fixture(); c.pages.zh += `<script src="../${script}"></script>`; rejected(c);
  c = fixture(); c.pages.en += `<link rel="stylesheet" href="./${style}">`; rejected(c);
});

