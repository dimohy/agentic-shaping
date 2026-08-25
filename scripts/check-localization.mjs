import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const fail = message => { throw new Error(message); };
const read = path => readFileSync(join(root, path), "utf8");
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

for (const page of pages) {
  const html = read(page.path);
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.path}: html lang 불일치`);
  if (!html.includes(`<body data-locale="${page.locale}">`)) fail(`${page.path}: data-locale 불일치`);
  if (!html.includes(`<meta name="site-root" content="${page.siteRoot}" />`)) fail(`${page.path}: site-root 불일치`);
  if (!html.includes(`<link rel="canonical" href="${page.canonical}" />`)) fail(`${page.path}: canonical 누락`);
  for (const [lang, href] of alternates) {
    if (!html.includes(`hreflang="${lang}" href="${href}"`)) fail(`${page.path}: hreflang ${lang} 누락`);
  }
  if ((html.match(/data-language="(?:en|ko|ja|zh)"/g) ?? []).length !== 4) fail(`${page.path}: 언어 선택기 항목 수 불일치`);
  for (const id of sectionIds) if (!html.includes(`id="${id}"`)) fail(`${page.path}: 핵심 섹션 #${id} 누락`);
  if (!html.includes("v0.2") || !html.includes("SLOGS 2026.08.25.3")) fail(`${page.path}: 공개 버전 계약 누락`);
  if (!html.includes('href="https://github.com/dimohy/agentic-shaping"')) fail(`${page.path}: 현재 GitHub 저장소 링크 누락`);
  if (html.includes("github.com/dimohy/vibe-compiler")) fail(`${page.path}: 폐기된 GitHub 저장소 링크 잔류`);
  if (/\b(?:undefined|null|\[object Object\])\b/.test(html)) fail(`${page.path}: 미해결 생성 값 발견`);
  if (page.locale === "en") {
    for (const path of ["./styles.css", "./script.js", 'src="./assets/', 'href="./evals/']) {
      if (!html.includes(path)) fail(`${page.path}: 루트 자산 경로 누락 ${path}`);
    }
  } else {
    for (const path of ["../styles.css", "../script.js", 'src="../assets/', 'href="../evals/']) {
      if (!html.includes(path)) fail(`${page.path}: 지역 자산 경로 누락 ${path}`);
    }
  }
  if (page.locale !== "ko" && /[가-힣]/.test(html.replaceAll("한국어", ""))) {
    fail(`${page.path}: 언어 선택기 밖의 한글 잔류`);
  }
}

const readmes = ["README.md", "README.ko.md", "README.ja.md", "README.zh-CN.md"];
for (const path of readmes) {
  const markdown = read(path);
  if (!markdown.includes(languageLinks)) fail(`${path}: README 언어 링크 누락`);
  if (!markdown.includes("Agentic Shaping v0.2")) fail(`${path}: 버전이 표시된 프롬프트 누락`);
  if (path !== "README.ko.md" && /[가-힣]/.test(markdown.replaceAll("한국어", ""))) fail(`${path}: 언어 링크 밖의 한글 잔류`);
}
if (!read("README.md").includes("## Language") || !read("README.md").includes("Current public version: **v0.2**")) {
  fail("README.md가 영어 기본 문서가 아닙니다.");
}
if (!/[ぁ-んァ-ヶ]/.test(read("ja/index.html"))) fail("일본어 홈페이지에 일본어 문자가 없습니다.");
if (!/[\u4e00-\u9fff]/.test(read("zh/index.html"))) fail("중국어 홈페이지에 한자가 없습니다.");

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
