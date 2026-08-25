import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const readme = readFileSync(join(root, "README.md"), "utf8");
const activation = JSON.parse(readFileSync(join(root, "evals", "activation-latest-results.json"), "utf8"));
const regression = JSON.parse(readFileSync(join(root, "evals", "latest-results.json"), "utf8"));
const execution = JSON.parse(readFileSync(join(root, "evals", "latest-execution-results.json"), "utf8"));
const fail = message => { throw new Error(message); };

if (!activation.passed) fail("최신 Agentic Shaping 차별 평가가 통과하지 않았습니다.");
if (activation.suiteSource !== "activation-cases.json") fail("차별 평가 suite 출처가 다릅니다.");
if (activation.runtime.model !== "gpt-5.6-luna" || activation.runtime.reasoningEffort !== "max") {
  fail("차별 평가 모델은 GPT-5.6 Luna Max여야 합니다.");
}
if (activation.method.caseCount !== 26 || activation.method.agentRunCount !== 52) {
  fail("공개 차별 평가 표본은 26개 짝 시나리오와 52회 Agent 실행이어야 합니다.");
}
const [baseline, shaped] = activation.summary;
if (baseline.scenarioPasses !== 16 || shaped.scenarioPasses !== 25
  || baseline.hits !== 82 || shaped.hits !== 104 || shaped.expected !== 105) {
  fail("공개 차별 평가 분자/분모가 최신 결과와 다릅니다.");
}
if (baseline.taskHits !== 27 || shaped.taskHits !== 27
  || baseline.forbidden !== 0 || shaped.forbidden !== 0) {
  fail("현재 작업 완료 또는 금지 행동 게이트가 공개 계약과 다릅니다.");
}
const finalHoldout = variant => {
  const rows = activation.results.filter(result => result.controlType === "final-holdout" && result.variant === variant);
  return {
    scenarios: rows.filter(result => result.scenarioPassed).length,
    total: rows.length,
    hits: rows.reduce((sum, result) => sum + result.expectedHits.length, 0),
    expected: rows.reduce((sum, result) => sum + result.expectedCount, 0),
  };
};
const baselineHoldout = finalHoldout("baseline");
const shapedHoldout = finalHoldout("shaped");
if (baselineHoldout.scenarios !== 3 || shapedHoldout.scenarios !== 5
  || baselineHoldout.total !== 5 || shapedHoldout.total !== 5) {
  fail("최종 holdout 공개 수치가 최신 결과와 다릅니다.");
}
const caseHits = (caseId, variant) => {
  const result = activation.results.find(row => row.caseId === caseId && row.variant === variant);
  return `${result.expectedHits.length}/${result.expectedCount}`;
};
for (const [caseId, expectedText] of [
  ["activation-growing-repository", "1/5 → 5/5"],
  ["activation-temporary-script", "0/4 → 4/4"],
  ["activation-config-schema-drift", "1/4 → 4/4"],
]) {
  const actualText = `${caseHits(caseId, "baseline")} → ${caseHits(caseId, "shaped")}`;
  if (actualText !== expectedText || !html.includes(expectedText)) fail(`${caseId} 공개 예시가 최신 결과와 다릅니다.`);
}
const requiredHtml = [
  "61.5% <i>→</i> 96.2%",
  "16/26 → 25/26",
  "82/105(78.1%) → 104/105(99.0%)",
  "27/27 <i>↔</i> 27/27",
  "프롬프트뿐 아니라,<br />검증 시스템도 진화합니다.",
];
for (const fragment of requiredHtml) if (!html.includes(fragment)) fail(`index.html 공개 평가 문구 누락: ${fragment}`);
const requiredReadme = [
  "기본군 16/26(61.5%), 적용군 25/26(96.2%)",
  "기본군 82/105(78.1%), 적용군 104/105(99.0%)",
  "기본군 3/5(60%), 적용군 5/5(100%)",
  "양쪽 27/27, 금지 행동: 양쪽 0건",
  "기본군 94/98(95.9%), 적용군 96/98(98.0%), 금지 행동 0건",
];
for (const fragment of requiredReadme) if (!readme.includes(fragment)) fail(`README 공개 평가 문구 누락: ${fragment}`);
const regressionBaseline = regression.summary.find(row => row.variant === "baseline");
const regressionShaped = regression.summary.find(row => row.variant === "shaped");
if (!regression.passed || regressionBaseline.hits !== 94 || regressionShaped.hits !== 96
  || regressionBaseline.expected !== 98 || regressionShaped.expected !== 98
  || regressionBaseline.forbidden !== 0 || regressionShaped.forbidden !== 0) {
  fail("일반 품질·안전 회귀 결과가 공개 계약과 다릅니다.");
}
if (!execution.complete || !execution.passed
  || execution.runtime.model !== "gpt-5.6-luna" || execution.runtime.reasoningEffort !== "max"
  || execution.variants.some(variant => variant.checks.length !== 6 || !variant.passed)) {
  fail("실제 파일 실행 회귀 평가가 양쪽 6/6을 통과하지 않았습니다.");
}
process.stdout.write("공개 차별 평가, 최종 holdout, 일반 회귀, 작업·안전 게이트 및 실제 실행 결과 동기화 검사 통과\n");
