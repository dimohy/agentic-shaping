import { createHash } from "node:crypto";

const locales = ["en", "ko", "ja", "zh"];

function attributes(tag) {
  const attrs = new Map();
  const pattern = /\s+([^\s=/>]+)\s*=\s*"([^"]*)"/g;
  for (const match of tag.matchAll(pattern)) {
    const name = match[1];
    if (attrs.has(name)) return null;
    attrs.set(name, match[2]);
  }
  return attrs;
}

export function promoteRelease(active, candidate) {
  const errors = [];
  const fail = (message) => errors.push(message);
  if (!candidate || typeof candidate !== "object") {
    return { ok: false, active, errors: ["candidate must be an object"] };
  }
  const { version, pages, assets } = candidate;
  if (typeof version !== "string" || !/^v[0-9]+\.[0-9]+\.[0-9]+(?![\s\S])/.test(version)) {
    fail("version must have three nonnegative integer components");
  }
  if (!pages || typeof pages !== "object" || Array.isArray(pages)) {
    fail("pages must contain exactly en, ko, ja, and zh");
  } else {
    const keys = Object.keys(pages);
    if (keys.length !== locales.length || locales.some((locale) => !Object.hasOwn(pages, locale))) {
      fail("pages must contain exactly en, ko, ja, and zh");
    }
  }
  if (!assets || typeof assets !== "object" || Array.isArray(assets)) {
    fail("assets must be a bundle of UTF-8 strings");
  }

  function checkResource(locale, reference, kind) {
    if (typeof reference !== "string" || !reference || /[\\?#]/.test(reference) || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) {
      fail(`${locale}: invalid ${kind} URL`);
      return;
    }
    let url;
    try {
      url = new URL(reference, `https://release.invalid/${locale === "en" ? "" : `${locale}/`}`);
    } catch {
      fail(`${locale}: invalid ${kind} URL`);
      return;
    }
    if (url.origin !== "https://release.invalid" || url.search || url.hash) {
      fail(`${locale}: invalid ${kind} URL`);
      return;
    }
    const path = url.pathname.slice(1);
    const namePattern = kind === "script"
      ? /^site-assets\/(?:[^/]+\/)*app\.([0-9a-f]{12})\.js$/
      : /^site-assets\/(?:[^/]+\/)*site\.([0-9a-f]{12})\.css$/;
    const match = namePattern.exec(path);
    if (!match) {
      fail(`${locale}: invalid ${kind} asset path`);
      return;
    }
    if (!assets || !Object.hasOwn(assets, path) || typeof assets[path] !== "string") {
      fail(`${locale}: missing ${kind} asset ${path}`);
      return;
    }
    const fingerprint = createHash("sha256").update(assets[path], "utf8").digest("hex").slice(0, 12);
    if (match[1] !== fingerprint) fail(`${locale}: incorrect fingerprint for ${path}`);
  }

  for (const locale of locales) {
    if (!pages || typeof pages !== "object" || !Object.hasOwn(pages, locale) || typeof pages[locale] !== "string") {
      fail(`${locale}: missing page`);
      continue;
    }
    const html = pages[locale];
    const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => attributes(m[0])).filter((a) => a?.get("name") === "application-version");
    if (metas.length !== 1 || metas[0].get("content") !== version) fail(`${locale}: invalid application-version meta`);
    const spanOpenings = [...html.matchAll(/<span\b[^>]*\sdata-site-version(?=\s|=|>|\/)[^>]*>/g)];
    const spans = [...html.matchAll(/<span data-site-version>\s*([^<]*?)\s*<\/span>/g)];
    if (spanOpenings.length !== 1 || spans.length !== 1 || spans[0][1].trim() !== version) fail(`${locale}: invalid site version span`);
    const scripts = [...html.matchAll(/<script\b[^>]*>\s*<\/script>/g)].map((m) => attributes(m[0])).filter((a) => a?.has("src"));
    const scriptOpenings = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => attributes(m[0])).filter((a) => a?.has("src"));
    if (scripts.length !== 1 || scriptOpenings.length !== 1) fail(`${locale}: expected one script with src`);
    else checkResource(locale, scripts[0].get("src"), "script");
    const links = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => attributes(m[0])).filter((a) => a?.get("rel") === "stylesheet");
    if (links.length !== 1 || !links[0].has("href")) fail(`${locale}: expected one stylesheet link`);
    else checkResource(locale, links[0].get("href"), "stylesheet");
  }
  return errors.length ? { ok: false, active, errors } : { ok: true, active: candidate, errors: [] };
}


