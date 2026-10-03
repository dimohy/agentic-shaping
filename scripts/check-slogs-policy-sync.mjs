import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const versionMatch = html.match(/HOMEPAGE v[0-9.]+ ↔ SLOGS ([0-9.]+)/);
if (!versionMatch) throw new Error("홈페이지에서 Slogs 정책 버전을 찾을 수 없습니다.");
const expectedVersion = JSON.parse(readFileSync(join(root,'site/release-manifest.json'),'utf8')).policyVersion;
if (versionMatch[1] !== expectedVersion) throw new Error('Homepage policy version differs from the authoritative release manifest.');

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
    "모든 요청 목표축",
    "정형화의 효과와 반복 진단 비용",
    "누적 전체 실행 예산",
    "AS-DC-001",
    "원래 완료 기준",
    "정형화 자산·검사·문서가 늘어난 사실",
    "비용 발생 전 실행 장치로 차단",
    "기억 저장은 강제 적용 증거가 아니다",
    "공개는 사용자의 명시 요청에서만",
  ]],
  ["en", english, [
    `Prompt Version: ${expectedVersion}`,
    "all requested goal axes",
    "Structured outcomes and repeated diagnostic cost",
    "cumulative whole-input run budget",
    "AS-DC-001",
    "original acceptance criteria",
    "Growth in assets, checks or documentation",
    "before incurring cost",
    "memory writes are not hard-enforcement evidence",
    "Publish only upon explicit request",
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
