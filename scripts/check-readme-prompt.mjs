import { readFileSync } from "node:fs";

const normalize = value => value.replaceAll("\r\n", "\n").trim();
const decodeHtml = value => value
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&#39;", "'");

const pairs = [
  { locale: "en", htmlPath: "index.html", readmePath: "README.md" },
  { locale: "ko", htmlPath: "ko/index.html", readmePath: "README.ko.md" },
  { locale: "ja", htmlPath: "ja/index.html", readmePath: "README.ja.md" },
  { locale: "zh", htmlPath: "zh/index.html", readmePath: "README.zh-CN.md" },
];

let sharedVersion;
for (const pair of pairs) {
  const html = readFileSync(pair.htmlPath, "utf8");
  const readme = readFileSync(pair.readmePath, "utf8");
  const version = html.match(/<meta\s+name="application-version"\s+content="(v\d+\.\d+)"\s*\/>/)?.[1];
  if (!version) throw new Error(`${pair.htmlPath}에서 공개 버전 메타를 찾지 못했습니다.`);
  sharedVersion ??= version;
  if (version !== sharedVersion) throw new Error(`${pair.locale} 공개 버전이 ${sharedVersion}과 다릅니다.`);
  if (!readme.includes(`**${version}**`)) throw new Error(`${pair.readmePath} 공개 버전이 ${version}과 다릅니다.`);
  if ((html.match(/data-site-version/g) ?? []).length < 2) {
    throw new Error(`${pair.htmlPath}의 헤더와 푸터에 공개 버전 표시가 모두 필요합니다.`);
  }

  const htmlPrompt = html.match(/<pre id="starter">([\s\S]*?)<\/pre>/)?.[1];
  const readmePrompt = readme.match(/```text\r?\n(Agentic Shaping v\d+\.\d+[\s\S]*?)\r?\n```/)?.[1];
  if (!htmlPrompt || !readmePrompt) throw new Error(`${pair.locale} 공개 적용 프롬프트를 찾지 못했습니다.`);
  if (normalize(decodeHtml(htmlPrompt)) !== normalize(readmePrompt)) {
    throw new Error(`${pair.readmePath}의 적용 프롬프트가 ${pair.htmlPath}과 다릅니다.`);
  }
  if (!normalize(readmePrompt).startsWith(`Agentic Shaping ${version}\n\n`)) {
    throw new Error(`${pair.locale} 공개 적용 프롬프트 첫 줄에 Agentic Shaping ${version}이 필요합니다.`);
  }
}

const koreanHtml = readFileSync("ko/index.html", "utf8");
const koreanReadme = readFileSync("README.ko.md", "utf8");
for (const contract of [
  "CONTEXT-SCALABLE ANALYSIS",
  "원문 위치와 버전/해시",
  "작은 근거 묶음",
  "오래된 인덱스는 조용히 사용하지 않고 실패",
]) {
  if (!koreanHtml.includes(contract)) throw new Error(`한국어 홈페이지에서 분석 확장 계약을 찾지 못했습니다: ${contract}`);
}
for (const contract of ["문서와 소스코드가 커지면 분석 방식도 진화합니다", "분석 표면"]) {
  if (!koreanReadme.includes(contract)) throw new Error(`한국어 README에서 분석 확장 안내를 찾지 못했습니다: ${contract}`);
}

console.log(`4개 언어의 README 적용 프롬프트, 분석 확장 계약 및 공개 버전 ${sharedVersion} 검사 통과`);
