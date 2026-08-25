import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const versionMatch = html.match(/HOMEPAGE v0\.2 ↔ SLOGS ([0-9.]+)/);
if (!versionMatch) throw new Error("홈페이지에서 Slogs 정책 버전을 찾을 수 없습니다.");
const expectedVersion = versionMatch[1];

const get = async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} 응답 실패: ${response.status}`);
  return (await response.text()).trim();
};

const [version, korean, english] = await Promise.all([
  get("https://slogs.dev/prompts/slogs-mcp.version"),
  get("https://slogs.dev/prompts/slogs-mcp.ko.md"),
  get("https://slogs.dev/prompts/slogs-mcp.en.md"),
]);

if (version !== expectedVersion) throw new Error(`정책 버전 불일치: page=${expectedVersion}, server=${version}`);
for (const [language, prompt, fragments] of [
  ["ko", korean, [
    `Prompt Version: ${expectedVersion}`,
    "현재 결과 완성",
    "명시적 일회성 작업",
    "관련 하드코딩을 모두 교체",
    "일반 작업 품질·안전 회귀와 Agentic Shaping 고유 발동 평가는 분리",
  ]],
  ["en", english, [
    `Prompt Version: ${expectedVersion}`,
    "complete the current result",
    "explicit one-off work",
    "replace all related hardcodes",
    "Separate general task-quality and safety regression from Agentic Shaping activation evaluation",
  ]],
]) {
  for (const fragment of fragments) {
    if (!prompt.includes(fragment)) throw new Error(`${language} 정책 계약 누락: ${fragment}`);
  }
}

process.stdout.write(`Slogs LLM Wiki 한·영 최종 정책 ${expectedVersion} 동기화 검사 통과\n`);
