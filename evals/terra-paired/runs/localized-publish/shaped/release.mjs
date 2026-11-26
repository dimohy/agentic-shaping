import { createHash } from "node:crypto";

const locales = ["en", "ko", "ja", "zh"];

function attributes(tag) {
  const result = Object.create(null);
  for (const match of tag.matchAll(/\s([a-zA-Z][\w:-]*)="([^"]*)"/g)) {
    (result[match[1]] ??= []).push(match[2]);
  }
  return result;
}

export function promoteRelease(active, candidate) {
  const errors = [];
  const version = candidate?.version;
  if (typeof version !== "string" || !/^v[0-9]+\.[0-9]+\.[0-9]+(?![\s\S])/.test(version)) {
    errors.push("version must have three nonnegative integer components");
  }
  const pages = candidate?.pages;
  if (!pages || typeof pages !== "object" || Array.isArray(pages) ||
      Object.keys(pages).length !== locales.length ||
      locales.some(locale => !Object.hasOwn(pages, locale))) {
    errors.push("pages must contain exactly en, ko, ja, and zh");
  }
  const assets = candidate?.assets;
  if (!assets || typeof assets !== "object" || Array.isArray(assets)) {
    errors.push("assets must be a path-keyed bundle");
  } else if (Object.keys(assets).some(path => !path || path.startsWith("/") ||
      /[?#\\]/.test(path) || path.split("/").some(part => !part || part === "." || part === ".."))) {
    errors.push("asset keys must be site-root-relative paths");
  }

  function checkResource(locale, value, kind) {
    if (typeof value !== "string" || !value || /[?#\\]/.test(value) ||
        /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) {
      errors.push(`${locale}: invalid ${kind} URL`);
      return;
    }
    let url;
    try {
      url = new URL(value, `https://release.invalid/${locale === "en" ? "" : `${locale}/`}`);
    } catch {
      errors.push(`${locale}: invalid ${kind} URL`);
      return;
    }
    const path = url.pathname.slice(1);
    const pattern = kind === "script"
      ? /^site-assets\/(?:[^/]+\/)*app\.([0-9a-f]{12})\.js$/
      : /^site-assets\/(?:[^/]+\/)*site\.([0-9a-f]{12})\.css$/;
    const match = pattern.exec(path);
    if (url.origin !== "https://release.invalid" || !match) {
      errors.push(`${locale}: invalid ${kind} asset path`);
      return;
    }
    if (!assets || !Object.hasOwn(assets, path) || typeof assets[path] !== "string") {
      errors.push(`${locale}: missing ${kind} asset ${path}`);
      return;
    }
    const fingerprint = createHash("sha256").update(assets[path], "utf8").digest("hex").slice(0, 12);
    if (match[1] !== fingerprint) errors.push(`${locale}: ${kind} fingerprint mismatch for ${path}`);
  }

  for (const locale of locales) {
    if (!pages || !Object.hasOwn(pages, locale) || typeof pages[locale] !== "string") {
      errors.push(`${locale}: missing page`);
      continue;
    }
    const html = pages[locale];
    const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map(m => attributes(m[0]))
      .filter(attrs => attrs.name?.includes("application-version"));
    if (metas.length !== 1 || metas[0].name.length !== 1 || metas[0].content?.length !== 1 || metas[0].content[0] !== version) {
      errors.push(`${locale}: expected one matching application-version meta`);
    }
    const spanOpenings = [...html.matchAll(/<span\b[^>]*\bdata-site-version\b[^>]*>/g)];
    const spans = [...html.matchAll(/<span data-site-version>([^<]*)<\/span>/g)];
    if (spanOpenings.length !== 1 || spans.length !== 1 || spans[0][1].trim() !== version) {
      errors.push(`${locale}: expected one matching site-version span`);
    }
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)];
    const scriptBlocks = [...html.matchAll(/<script\b[^>]*><\/script>/g)];
    const scriptAttrs = scripts.length === 1 ? attributes(scripts[0][0]) : {};
    if (scripts.length !== 1 || scriptBlocks.length !== 1 || scriptAttrs.src?.length !== 1) {
      errors.push(`${locale}: expected one empty script with src`);
    } else {
      checkResource(locale, scriptAttrs.src[0], "script");
    }
    const styles = [...html.matchAll(/<link\b[^>]*>/g)].map(m => attributes(m[0]))
      .filter(attrs => attrs.rel?.includes("stylesheet"));
    if (styles.length !== 1 || styles[0].rel.length !== 1 || styles[0].href?.length !== 1) {
      errors.push(`${locale}: expected one stylesheet link`);
    } else {
      checkResource(locale, styles[0].href[0], "stylesheet");
    }
  }
  return errors.length ? { ok: false, active, errors } : { ok: true, active: candidate, errors: [] };
}
