import { readFileSync } from "node:fs";

const normalize = (value) => value.replaceAll("\r\n", "\n").trim();

const html = readFileSync("index.html", "utf8");
const readme = readFileSync("README.md", "utf8");

const versionMatch = html.match(
  /<meta\s+name="application-version"\s+content="(v\d+\.\d+)"\s*\/>/,
);
if (!versionMatch) {
  throw new Error("index.html에서 공개 버전 메타를 찾지 못했습니다.");
}
const siteVersion = versionMatch[1];
const readmeVersionMatch = readme.match(/현재 공개 버전:\s*\*\*(v\d+\.\d+)\*\*/);
if (!readmeVersionMatch || readmeVersionMatch[1] !== siteVersion) {
  throw new Error(
    `README.md 공개 버전이 index.html과 다릅니다: ${readmeVersionMatch?.[1] ?? "없음"} != ${siteVersion}`,
  );
}
if ((html.match(/data-site-version/g) ?? []).length < 2) {
  throw new Error("홈페이지의 헤더와 푸터에 공개 버전 표시가 모두 필요합니다.");
}

const htmlMatch = html.match(/<pre id="starter">([\s\S]*?)<\/pre>/);
if (!htmlMatch) {
  throw new Error("index.html에서 공개 적용 프롬프트를 찾지 못했습니다.");
}

const readmeMatch = readme.match(
  /## 적용 프롬프트[\s\S]*?```text\r?\n([\s\S]*?)\r?\n```/,
);
if (!readmeMatch) {
  throw new Error("README.md에서 적용 프롬프트를 찾지 못했습니다.");
}

const htmlPrompt = normalize(
  htmlMatch[1]
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'"),
);
const readmePrompt = normalize(readmeMatch[1]);

if (htmlPrompt !== readmePrompt) {
  throw new Error(
    "README.md의 적용 프롬프트가 index.html의 공개 프롬프트와 다릅니다.",
  );
}

const requiredAnalysisContracts = [
  "CONTEXT-SCALABLE ANALYSIS",
  "원문 위치와 버전/해시",
  "작은 근거 묶음",
  "오래된 인덱스는 조용히 사용하지 않고 실패",
];
for (const contract of requiredAnalysisContracts) {
  if (!html.includes(contract)) {
    throw new Error(`index.html에서 분석 확장 계약을 찾지 못했습니다: ${contract}`);
  }
}

for (const contract of ["문서와 소스코드가 커지면 분석 방식도 진화합니다", "분석 표면"]) {
  if (!readme.includes(contract)) {
    throw new Error(`README.md에서 분석 확장 안내를 찾지 못했습니다: ${contract}`);
  }
}

console.log(
  `README 적용 프롬프트, 분석 확장 계약 및 공개 버전 ${siteVersion} 검사 통과`,
);
