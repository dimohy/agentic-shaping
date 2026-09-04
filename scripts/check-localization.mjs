import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const fail = message => { throw new Error(message); };
const read = path => readFileSync(join(root, path), "utf8");
const release = JSON.parse(read("site/release-manifest.json"));
const pages = [
  { path: "index.html", locale: "en", lang: "en", siteRoot: "./", canonical: "https://agentic-shaping.slogs.dev/" },
  { path: "ko/index.html", locale: "ko", lang: "ko", siteRoot: "../", canonical: "https://agentic-shaping.slogs.dev/ko/" },
  { path: "ja/index.html", locale: "ja", lang: "ja", siteRoot: "../", canonical: "https://agentic-shaping.slogs.dev/ja/" },
  { path: "zh/index.html", locale: "zh", lang: "zh-Hans", siteRoot: "../", canonical: "https://agentic-shaping.slogs.dev/zh/" },
];
const alternates = [
  ["en", "https://agentic-shaping.slogs.dev/"],
  ["ko", "https://agentic-shaping.slogs.dev/ko/"],
  ["ja", "https://agentic-shaping.slogs.dev/ja/"],
  ["zh-Hans", "https://agentic-shaping.slogs.dev/zh/"],
  ["x-default", "https://agentic-shaping.slogs.dev/"],
];
const sectionIds = ["start", "loop", "scale", "memory", "prompts", "validation"];
const languageLinks = "[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md)";
const policyVersion = read("site/index.ko.source.html").match(/HOMEPAGE \{\{PUBLIC_VERSION\}\} ↔ SLOGS ([0-9.]+)/)?.[1];
if (!policyVersion) fail("한국어 홈페이지 권위 소스에서 Slogs 정책 버전을 찾지 못했습니다.");
const headerContract = JSON.parse(read("site/header-layout-contract.json"));
const assetManifest = JSON.parse(read("site-assets/manifest.json"));
const sha256 = content => createHash("sha256").update(content).digest("hex");
for (const [kind, sourcePath] of [["styles", "styles.css"], ["script", "script.js"]]) {
  const source = read(sourcePath);
  const generated = read(`site-assets/${assetManifest[kind].file}`);
  if (generated !== source || assetManifest[kind].sha256 !== sha256(source)) fail(`${kind} 해시 자산 동기화 실패`);
}
if (headerContract.locales.join(",") !== "en,ko,ja,zh") fail("헤더 계약의 언어 행렬 불일치");
if (headerContract.viewportWidthsPx.length !== 21 || !headerContract.viewportWidthsPx.includes(320)
  || !headerContract.viewportWidthsPx.includes(headerContract.brandTitleHiddenMaxTestWidthPx)
  || !headerContract.viewportWidthsPx.includes(headerContract.brandTitleVisibleMinWidthPx)
  || !headerContract.viewportWidthsPx.includes(headerContract.versionHiddenMaxTestWidthPx)
  || !headerContract.viewportWidthsPx.includes(headerContract.versionVisibleMinWidthPx)
  || !headerContract.viewportWidthsPx.includes(1281) || !headerContract.viewportWidthsPx.includes(1440)) {
  fail("헤더 계약의 화면 폭 행렬 불일치");
}

for (const page of pages) {
  const html = read(page.path);
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.path}: html lang 불일치`);
  if (!html.includes(`<body data-locale="${page.locale}">`)) fail(`${page.path}: data-locale 불일치`);
  if (!html.includes(`<meta name="site-root" content="${page.siteRoot}" />`)) fail(`${page.path}: site-root 불일치`);
  if (!html.includes(`<link rel="canonical" href="${page.canonical}" />`)) fail(`${page.path}: canonical 누락`);
  if (!html.includes(`${page.siteRoot}site-assets/${assetManifest.styles.file}`)) fail(`${page.path}: 해시 CSS 자산 누락`);
  if (!html.includes(`${page.siteRoot}site-assets/${assetManifest.script.file}`)) fail(`${page.path}: 해시 JavaScript 자산 누락`);
  for (const [lang, href] of alternates) {
    if (!html.includes(`hreflang="${lang}" href="${href}"`)) fail(`${page.path}: hreflang ${lang} 누락`);
  }
  if ((html.match(/data-language="(?:en|ko|ja|zh)"/g) ?? []).length !== 4) fail(`${page.path}: 언어 선택기 항목 수 불일치`);
  for (const id of sectionIds) if (!html.includes(`id="${id}"`)) fail(`${page.path}: 핵심 섹션 #${id} 누락`);
  if (!html.includes(release.displayVersion) || !html.includes(`SLOGS ${policyVersion}`)) fail(`${page.path}: 공개 버전 계약 누락`);
  if (!html.includes('href="https://github.com/dimohy/agentic-shaping"')) fail(`${page.path}: 현재 GitHub 저장소 링크 누락`);
  if (html.includes("github.com/dimohy/vibe-compiler")) fail(`${page.path}: 폐기된 GitHub 저장소 링크 잔류`);
  if (/\b(?:undefined|null|\[object Object\])\b/.test(html)) fail(`${page.path}: 미해결 생성 값 발견`);
  if (page.locale === "en") {
    for (const path of ['src="./assets/', 'href="./evals/']) {
      if (!html.includes(path)) fail(`${page.path}: 루트 자산 경로 누락 ${path}`);
    }
  } else {
    for (const path of ['src="../assets/', 'href="../evals/']) {
      if (!html.includes(path)) fail(`${page.path}: 지역 자산 경로 누락 ${path}`);
    }
  }
  if (page.locale !== "ko" && /[가-힣]/.test(html.replaceAll("한국어", ""))) {
    fail(`${page.path}: 언어 선택기 밖의 한글 잔류`);
  }
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = match[1].split(/[?#]/, 1)[0];
    if (!href || /^(?:https?:|mailto:|tel:|data:)/.test(href)) continue;
    const target = resolve(root, dirname(page.path), href);
    const resolvedTarget = href.endsWith("/") ? join(target, "index.html") : target;
    if (!existsSync(resolvedTarget)) fail(`${page.path}: 존재하지 않는 내부 링크 ${match[1]}`);
  }
}

const readmes = ["README.md", "README.ko.md", "README.ja.md", "README.zh-CN.md"];
const behavioralEvidenceKinds = [
  "artifact",
  "contract-review",
  "fixture-design",
  "inventory",
  "low-load-analysis",
  "verification",
  "system-evolution-audit",
  "system-evolution-contract",
];
for (const path of readmes) {
  const markdown = read(path);
  if (!markdown.includes(languageLinks)) fail(`${path}: README 언어 링크 누락`);
  if (!markdown.includes(`Agentic Shaping ${release.displayVersion}`)) fail(`${path}: 버전이 표시된 프롬프트 누락`);
  for (const evidenceKind of behavioralEvidenceKinds) {
    if (!markdown.includes(`\`${evidenceKind}\``)) fail(`${path}: AS-BI-001 증거 enum 누락 ${evidenceKind}`);
  }
  if (path !== "README.ko.md" && /[가-힣]/.test(markdown.replaceAll("한국어", ""))) fail(`${path}: 언어 링크 밖의 한글 잔류`);
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1].split(/[?#]/, 1)[0];
    if (!href || /^(?:https?:|mailto:|tel:)/.test(href)) continue;
    if (!existsSync(resolve(root, dirname(path), href))) fail(`${path}: 존재하지 않는 내부 링크 ${match[1]}`);
  }
}
if (!read("README.md").includes("## Language") || !read("README.md").includes(`Current public version: **${release.displayVersion}**`)) {
  fail("README.md가 영어 기본 문서가 아닙니다.");
}
if (!/[ぁ-んァ-ヶ]/.test(read("ja/index.html"))) fail("일본어 홈페이지에 일본어 문자가 없습니다.");
if (!/[\u4e00-\u9fff]/.test(read("zh/index.html"))) fail("중국어 홈페이지에 한자가 없습니다.");
for (const path of ["ko/index.html", "README.ko.md"]) {
  if (read(path).includes("관문")) fail(`${path}: 공개 한국어 표면에 금지 용어가 남아 있습니다.`);
}

const script = read("script.js");
for (const contract of [
  "navigator.languages",
  "agentic-shaping-language",
  'const routes = { en: "", ko: "ko/", ja: "ja/", zh: "zh/" }',
  "location.replace(target)",
  "requestedLocale || (isRootPage ? savedLocale || detectedLocale : locale)",
]) {
  if (!script.includes(contract)) fail(`script.js 지역 감지 계약 누락: ${contract}`);
}
const css = read("styles.css");
for (const contract of ['html[lang="ko"] body', "word-break: keep-all", "Noto Sans JP", "Noto Sans KR", "Noto Sans SC"]) {
  if (!css.includes(contract)) fail(`styles.css 다국어 계약 누락: ${contract}`);
}
if (!/\.language-switcher a\s*{[\s\S]*?white-space:\s*nowrap/.test(css)) fail("언어 선택기 한 줄 표시 계약 누락");
if (!/nav a\s*{[\s\S]*?white-space:\s*nowrap/.test(css)) fail("전체 헤더 링크 한 줄 표시 계약 누락");
const compactPattern = new RegExp(`@media \\(max-width: ${headerContract.compactMaxWidthPx}px\\)[\\s\\S]*?\\.pill\\s*{\\s*display:\\s*none`);
if (!compactPattern.test(css)) fail("중간 폭 CTA 숨김 계약 누락");
const versionPattern = new RegExp(`@media \\(max-width: ${headerContract.versionCssMaxWidthPx}px\\)[\\s\\S]*?\\.brand \\.site-version\\s*{\\s*display:\\s*none`);
if (!versionPattern.test(css)) fail("좁은 폭에서 제목보다 버전을 먼저 축약하는 계약 누락");
const titlePattern = new RegExp(`@media \\(max-width: ${headerContract.brandTitleCssMaxWidthPx}px\\)[\\s\\S]*?\\.brand > span:not\\(\\.site-version\\)\\s*{\\s*display:\\s*none`);
if (!titlePattern.test(css)) fail("실제 공간이 부족한 초소형 폭에서만 브랜드 제목을 축약하는 계약 누락");
if (headerContract.invariants.compactBrandPriority.join(",") !== "mark,title,version") fail("compact 헤더 브랜드 우선순위 계약 불일치");
for (const url of pages.map(page => `<loc>${page.canonical}</loc>`)) {
  if (!read("sitemap.xml").includes(url)) fail(`sitemap.xml URL 누락: ${url}`);
}
if (!read("robots.txt").includes("Sitemap: https://agentic-shaping.slogs.dev/sitemap.xml")) fail("robots.txt sitemap 계약 누락");

const generated = spawnSync(process.execPath, [join(root, "scripts", "build-localized-content.mjs"), "--check"], {
  cwd: root,
  encoding: "utf8",
});
if (generated.status !== 0) fail(`생성 산출물 동기화 실패: ${generated.stderr || generated.stdout}`);

process.stdout.write("영어 기본 문서, 4개 홈페이지/README, 지역 감지, SEO 및 생성 동기화 검사 통과\n");
