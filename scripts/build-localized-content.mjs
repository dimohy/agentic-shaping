import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const siteDir = join(root, "site");
const localeDir = join(siteDir, "locales");
const htmlSource = readFileSync(join(siteDir, "index.ko.source.html"), "utf8");
const readmeSource = readFileSync(join(siteDir, "README.ko.source.md"), "utf8");
const refresh = process.argv.includes("--refresh");
const check = process.argv.includes("--check");
const hasHangul = value => /[가-힣]/.test(value);

const units = new Map();
const addUnit = (value, format) => {
  const text = value.trim();
  if (hasHangul(text) && !units.has(text)) units.set(text, format);
};

for (const match of htmlSource.matchAll(/>([^<>]*[가-힣][^<>]*)</gs)) addUnit(match[1], "html-text");
for (const match of htmlSource.matchAll(/(?:content|alt|aria-label)="([^"]*[가-힣][^"]*)"/g)) addUnit(match[1], "html-attribute");

let inFence = false;
for (const line of readmeSource.split(/\r?\n/)) {
  if (line.trimStart().startsWith("```")) inFence = !inFence;
  addUnit(line, inFence ? "code-line" : "markdown-line");
}

const schema = {
  type: "object",
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "integer" }, text: { type: "string" } },
        required: ["id", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["translations"],
  additionalProperties: false,
};

const translate = (items, locale) => {
  const catalogPath = join(localeDir, `${locale.code}.json`);
  const existing = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, "utf8")) : {};
  const translated = refresh ? {} : { ...existing };
  const pending = refresh ? [...items] : [...items].filter(([text]) => !translated[text]);
  if (check && pending.length > 0) {
    throw new Error(`${locale.code} catalog is missing ${pending.length} source units; run the generator without --check.`);
  }
  if (pending.length === 0) return translated;
  const batches = [];
  let batch = [], chars = 0;
  for (const [text, format] of pending) {
    if (batch.length && chars + text.length > 6500) { batches.push(batch); batch = []; chars = 0; }
    batch.push({ id: batch.length, text, format });
    chars += text.length;
  }
  if (batch.length) batches.push(batch);

  const temp = mkdtempSync(join(tmpdir(), "agentic-shaping-i18n-"));
  try {
    const schemaPath = join(temp, "schema.json");
    writeFileSync(schemaPath, JSON.stringify(schema));
    batches.forEach((current, batchIndex) => {
      const outputPath = join(temp, `output-${batchIndex}.json`);
      const prompt = `Translate every item from Korean into ${locale.name}. Return exactly one translation for every id.\n\nRules:\n- Preserve Agentic Shaping, Slogs LLM Wiki, GPT-5.6 Luna, Codex CLI, URLs, code spans, file paths, version strings, action IDs, and Markdown/HTML entities.\n- Keep Markdown structure, list markers, table pipes, emphasis, and links unchanged for markdown-line items. For code-line items, translate only natural-language prose while preserving indentation, identifiers, punctuation, and code tokens.\n- Use natural public technical-documentation language, not literal word order.\n- Do not add explanations.\n\nItems:\n${JSON.stringify(current)}`;
      const proc = spawnSync("codex", ["exec", "--ephemeral", "--ignore-user-config", "--strict-config", "--skip-git-repo-check", "--sandbox", "read-only", "-m", "gpt-5.6-luna", "-c", 'model_reasoning_effort="high"', "--output-schema", schemaPath, "-o", outputPath, prompt], {
        cwd: temp,
        encoding: "utf8",
        timeout: 300000,
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (proc.status !== 0) throw new Error(`${locale.code} batch ${batchIndex + 1} failed: ${proc.stderr.slice(-4000)}`);
      const response = JSON.parse(readFileSync(outputPath, "utf8"));
      if (response.translations.length !== current.length) throw new Error(`${locale.code} batch ${batchIndex + 1} returned ${response.translations.length}/${current.length}`);
      for (const row of response.translations) {
        const source = current[row.id]?.text;
        if (!source || !row.text.trim()) throw new Error(`${locale.code} batch ${batchIndex + 1} has an invalid id/text`);
        translated[source] = row.text.trim();
      }
      process.stdout.write(`${locale.code}: batch ${batchIndex + 1}/${batches.length}\n`);
    });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
  writeFileSync(catalogPath, JSON.stringify(translated, null, 2) + "\n");
  return translated;
};

const locales = [
  { code: "en", name: "English", htmlLang: "en", directory: "", rootHref: "./" },
  { code: "ja", name: "Japanese", htmlLang: "ja", directory: "ja", rootHref: "../" },
  { code: "zh-CN", name: "Simplified Chinese", htmlLang: "zh-Hans", directory: "zh", rootHref: "../" },
];
const catalogs = Object.fromEntries(locales.map(locale => [locale.code, translate(units, locale)]));

const replaceCatalog = (source, catalog) => Object.entries(catalog)
  .sort((a, b) => b[0].length - a[0].length)
  .reduce((result, [from, to]) => result.replaceAll(from, to), source);

const languageLinks = `<div class="language-switcher" data-language-switcher role="group" aria-label="Language">
          <a data-language="en" href="#">EN</a>
          <a data-language="ko" href="#">한국어</a>
          <a data-language="ja" href="#">日本語</a>
          <a data-language="zh" href="#">中文</a>
        </div>`;

const buildHtml = (locale, catalog) => {
  let output = locale.code === "ko" ? htmlSource : replaceCatalog(htmlSource, catalog);
  output = output.replace('<html lang="ko">', `<html lang="${locale.htmlLang}">`);
  output = output.replace("<body>", `<body data-locale="${locale.code === "zh-CN" ? "zh" : locale.code}">`);
  output = output.replace('<meta name="viewport" content="width=device-width,initial-scale=1" />', `<meta name="viewport" content="width=device-width,initial-scale=1" />\n    <meta name="site-root" content="${locale.rootHref}" />\n    <link rel="alternate" hreflang="en" href="https://agentic-shaping.slogs.dev/" />\n    <link rel="alternate" hreflang="ko" href="https://agentic-shaping.slogs.dev/ko/" />\n    <link rel="alternate" hreflang="ja" href="https://agentic-shaping.slogs.dev/ja/" />\n    <link rel="alternate" hreflang="zh-Hans" href="https://agentic-shaping.slogs.dev/zh/" />\n    <link rel="alternate" hreflang="x-default" href="https://agentic-shaping.slogs.dev/" />`);
  const canonicalPath = locale.directory ? `${locale.directory}/` : "";
  output = output.replace('<link rel="alternate" hreflang="en"', `<link rel="canonical" href="https://agentic-shaping.slogs.dev/${canonicalPath}" />\n    <link rel="alternate" hreflang="en"`);
  output = output.replace('<a class="pill" href="#start">', `${languageLinks}\n        <a class="pill" href="#start">`);
  const titles = {
    en: "Agentic Shaping — An AI Work Method That Evolves",
    ko: "Agentic Shaping — 스스로 발견하고 진화하는 AI 작업법",
    ja: "Agentic Shaping — 自ら発見し進化するAIワークメソッド",
    "zh-CN": "Agentic Shaping — 主动发现并持续进化的 AI 工作方法",
  };
  output = output.replace(/<title>[\s\S]*?<\/title>/, `<title>${titles[locale.code]}</title>`);
  output = output.replaceAll("styles.css?v=20260825.3", `${locale.rootHref}styles.css?v=20260825.7`);
  output = output.replaceAll("script.js?v=20260825.3", `${locale.rootHref}script.js?v=20260825.4`);
  output = output.replaceAll('src="assets/', `src="${locale.rootHref}assets/`);
  output = output.replaceAll('href="evals/', `href="${locale.rootHref}evals/`);
  return output.replace(/[ \t]+(?=\r?$)/gm, "");
};

const koreanLocale = { code: "ko", htmlLang: "ko", directory: "ko", rootHref: "../" };
const emit = (path, content) => {
  if (check) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) {
      throw new Error(`${path.slice(root.length + 1)} is not synchronized with the localization source.`);
    }
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};
for (const locale of [locales[0], koreanLocale, locales[1], locales[2]]) {
  const outputPath = locale.directory ? join(root, locale.directory, "index.html") : join(root, "index.html");
  emit(outputPath, buildHtml(locale, catalogs[locale.code] || {}));
}

const readmeLinks = "[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)";
const buildReadme = catalog => {
  let output = catalog ? replaceCatalog(readmeSource, catalog) : readmeSource;
  return output.replace("# Agentic Shaping", `# Agentic Shaping\n\n${readmeLinks}`);
};
emit(join(root, "README.md"), buildReadme(catalogs.en));
emit(join(root, "README.ko.md"), buildReadme(null));
emit(join(root, "README.ja.md"), buildReadme(catalogs.ja));
emit(join(root, "README.zh-CN.md"), buildReadme(catalogs["zh-CN"]));

process.stdout.write(`${check ? "Verified" : "Generated"} 4 homepages and 4 READMEs from ${units.size} localized source units.\n`);
