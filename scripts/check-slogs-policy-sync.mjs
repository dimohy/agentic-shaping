import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const versionMatch = html.match(/HOMEPAGE v[0-9.]+ ↔ SLOGS ([0-9.]+)/);
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
    "협업과 시스템 진화 라우팅",
    "기억 저장은 Agentic Shaping 또는 Slogs LLM Wiki 시스템 개선의 완료 증거가 아니다",
    "모든 목표축",
    "모든 wait/poll 전에",
    "첫 poll을 포함한",
    "안전한 비충돌 동반 작업",
    "진행률 보고·기억 capture/write·Agent 주장은 증거가 아니다",
    "인터록이 노출되지 않으면 강제 적용을 주장하지 말고",
    "진행 중 단계",
  ]],
  ["en", english, [
    `Prompt Version: ${expectedVersion}`,
    "complete the current result",
    "explicit one-off work",
    "replace all related hardcodes",
    "Separate general task-quality and safety regression from Agentic Shaping activation evaluation",
    "Collaboration And System-Evolution Routing",
    "Memory storage is not completion evidence for Agentic Shaping or Slogs LLM Wiki system improvement",
    "every harness-declared goal axis",
    "before every wait/poll",
    "including the first poll",
    "safe non-conflicting companion work",
    "a progress message, memory capture/write, or Agent claim is not evidence",
    "When no interlock is exposed, do not claim hard enforcement",
    "During an in-progress phase",
  ]],
]) {
  for (const fragment of fragments) {
    if (!prompt.includes(fragment)) throw new Error(`${language} 정책 계약 누락: ${fragment}`);
  }
}

if (korean.includes("첫 poll은 허용")) {
  throw new Error("ko 정책에 첫 poll 예외가 포함되어 있습니다.");
}
if (/orientation poll/i.test(english)) {
  throw new Error("en policy contains an orientation-poll exception.");
}

process.stdout.write(`Slogs LLM Wiki 한·영 최종 정책 ${expectedVersion} 동기화 검사 통과\n`);
