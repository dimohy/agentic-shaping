import { readFileSync } from "node:fs";

const normalize = (value) => value.replaceAll("\r\n", "\n").trim();

const html = readFileSync("index.html", "utf8");
const readme = readFileSync("README.md", "utf8");

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

console.log("README 적용 프롬프트 일치 검사 통과");
