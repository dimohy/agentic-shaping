import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { promoteRelease } from "./release.mjs";

const fingerprint = text => createHash("sha256").update(text).digest("hex").slice(0, 12);
const js = "console.log('안녕');";
const css = "body { color: red; }";
const script = `site-assets/app.${fingerprint(js)}.js`;
const style = `site-assets/site.${fingerprint(css)}.css`;
const active = { old: true };
const candidate = () => ({
  version: "v0.8.2",
  assets: { [script]: js, [style]: css },
  pages: Object.fromEntries(["en", "ko", "ja", "zh"].map(locale => {
    const prefix = locale === "en" ? "./" : "../";
    return [locale, `<meta content="v0.8.2" name="application-version"><span data-site-version> v0.8.2 </span><script src="${prefix}${script}"></script><link href="${prefix}${style}" rel="stylesheet">`];
  }))
});
const good = candidate();
const original = structuredClone(good);
assert.deepEqual(promoteRelease(active, good), { ok: true, active: good, errors: [] });
assert.deepEqual(good, original);
assert.deepEqual(active, { old: true });
const rootPaths = candidate();
for (const locale of Object.keys(rootPaths.pages)) {
  rootPaths.pages[locale] = rootPaths.pages[locale]
    .replace(/(?:\.\.\/|\.\/)site-assets\//g, "/site-assets/")
    .replace('<meta content="v0.8.2" name="application-version">', '<meta name="application-version" content="v0.8.2">');
}
assert.equal(promoteRelease(active, rootPaths).ok, true);
function rejects(name, alter) {
  const bundle = candidate();
  alter(bundle);
  const before = structuredClone(bundle);
  const result = promoteRelease(active, bundle);
  assert.equal(result.ok, false, name);
  assert.equal(result.active, active, name);
  assert.ok(result.errors.length && result.errors.every(x => typeof x === "string" && x.length), name);
  assert.deepEqual(bundle, before, name);
}
for (const version of ["v1.2", "v1.2.3.4", "v1.2.3-rc", "v-1.2.3", "v1.2.3\n"]) rejects(`version ${JSON.stringify(version)}`, c => c.version = version);
rejects("missing locale", c => delete c.pages.ko);
rejects("extra locale", c => c.pages.fr = c.pages.en);
rejects("wrong meta", c => c.pages.ja = c.pages.ja.replace('content="v0.8.2"', 'content="v0.8.1"'));
rejects("duplicate meta", c => c.pages.en += '<meta name="application-version" content="v0.8.2">');
rejects("duplicate span", c => c.pages.ko += '<span data-site-version>v0.8.2</span>');
rejects("wrong span", c => c.pages.zh = c.pages.zh.replace('> v0.8.2 </span>', '>v0.8.3</span>'));
rejects("external", c => c.pages.en = c.pages.en.replace(`./${script}`, `https://other.test/${script}`));
rejects("query", c => c.pages.en = c.pages.en.replace(`./${script}`, `./${script}?x=1`));
rejects("fragment", c => c.pages.en = c.pages.en.replace(`./${script}`, `./${script}#x`));
rejects("missing asset", c => delete c.assets[script]);
rejects("invalid asset key", c => c.assets["/extra.js"] = "extra");
rejects("broken hash", c => c.assets[style] += "x");
rejects("wrong directory", c => c.pages.ko = c.pages.ko.replace(`../${style}`, `./${style}`));
rejects("duplicate script", c => c.pages.en += `<script src="./${script}"></script>`);
rejects("duplicate stylesheet", c => c.pages.en += `<link rel="stylesheet" href="./${style}">`);
rejects("empty candidate", c => { delete c.pages; delete c.assets; });
assert.equal(promoteRelease(active, null).ok, false);
console.log("release tests passed");
