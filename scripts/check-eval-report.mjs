import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(join(root, "ko", "index.html"), "utf8");
const readme = readFileSync(join(root, "README.ko.md"), "utf8");
const activation = JSON.parse(readFileSync(join(root, "evals", "activation-latest-results.json"), "utf8"));
const regression = JSON.parse(readFileSync(join(root, "evals", "latest-results.json"), "utf8"));
const execution = JSON.parse(readFileSync(join(root, "evals", "latest-execution-results.json"), "utf8"));
const policy = JSON.parse(readFileSync(join(root, "evals", "slogs-policy-smoke-luna-max.json"), "utf8"));
const release = JSON.parse(readFileSync(join(root, "site", "release-manifest.json"), "utf8"));
const fail = message => { throw new Error(message); };
const structuredGate = spawnSync(process.execPath, [join(root, "evals", "verify-unstructured-to-structured.mjs")], { encoding: "utf8" });
if (structuredGate.status !== 0) fail(`AS-US-001 gate failed: ${structuredGate.stderr || structuredGate.stdout}`);
const structuredActivation = spawnSync(process.execPath, [join(root, "evals", "verify-unstructured-to-structured-activation.mjs")], { encoding: "utf8" });
if (structuredActivation.status !== 0) fail(`AS-US-001 activation evidence failed: ${structuredActivation.stderr || structuredActivation.stdout}`);
for (const [name, script] of [
  ["skill abstraction", "verify-skill-abstraction.mjs"],
  ["skill lifecycle", "verify-skill-lifecycle.mjs"],
  ["publication sync", "verify-publication-sync.mjs"],
]) {
  const check = spawnSync(process.execPath, [join(root, "evals", script)], { encoding: "utf8" });
  if (check.status !== 0) fail(`${name} contract failed: ${check.stderr || check.stdout}`);
}
for (const [name, script, args = []] of [
  ["prompt snapshot", "verify-prompt-snapshot.mjs"],
  ["run identity", "verify-run-identity.mjs"],
  ["historical sidecar", "verify-eval-provenance.mjs"],
  ["completed provenance", "verify-completed-eval-provenance.mjs"],
]) {
  const check = spawnSync(process.execPath, [join(root, "evals", script), ...args], { encoding: "utf8" });
  if (check.status !== 0) fail(`${name} gate failed: ${check.stderr || check.stdout}`);
}
const policyVersion = html.match(/HOMEPAGE v[0-9.]+ ↔ SLOGS ([0-9.]+)/)?.[1];
if (!policyVersion) fail("공개 페이지에서 현재 Slogs 정책 버전을 찾지 못했습니다.");

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
  "90% <i>→</i> 100%",
  `HOMEPAGE ${release.displayVersion} ↔ SLOGS ${policyVersion}`,
  "현재 결과 완성 · 안전 경계 · durable 개선을 독립 실행",
];
for (const fragment of requiredHtml) if (!html.includes(fragment)) fail(`index.html 공개 평가 문구 누락: ${fragment}`);
const requiredReadme = [
  "기본군 16/26(61.5%), 적용군 25/26(96.2%)",
  "기본군 82/105(78.1%), 적용군 104/105(99.0%)",
  "기본군 3/5(60%), 적용군 5/5(100%)",
  "양쪽 27/27, 금지 행동: 양쪽 0건",
  "기본군 94/98(95.9%), 적용군 96/98(98.0%), 금지 행동 0건",
  `현재 정책 버전은 \`${policyVersion}\``,
  "기본군 18/20(90%)에서 정책 적용군 20/20(100%)",
];
for (const fragment of requiredReadme) if (!readme.includes(fragment)) fail(`README 공개 평가 문구 누락: ${fragment}`);
for (const pagePath of ["index.html", join("ko", "index.html"), join("ja", "index.html"), join("zh", "index.html")]) {
  const page = readFileSync(join(root, pagePath), "utf8");
  for (const invariant of ["61.5%", "96.2%", "82/105", "104/105", "90%", "100%", `SLOGS ${policyVersion}`]) {
    if (!page.includes(invariant)) fail(`${pagePath} 평가 불변값 누락: ${invariant}`);
  }
}
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
const policyBaseline = policy.summary.find(row => row.variant === "baseline");
const policyShaped = policy.summary.find(row => row.variant === "shaped");
if (!policy.passed || policy.promptSource !== "https://slogs.dev/prompts/slogs-mcp.ko.md"
  || policy.method.caseCount !== 5 || policy.method.agentRunCount !== 10
  || policyBaseline.hits !== 18 || policyBaseline.expected !== 20
  || policyShaped.hits !== 20 || policyShaped.expected !== 20
  || policyBaseline.forbidden !== 0 || policyShaped.forbidden !== 0) {
  fail("라이브 Slogs LLM Wiki 최종 정책 행동 회귀가 공개 계약과 다릅니다.");
}
process.stdout.write("공개 차별 평가, 최종 holdout, 일반 회귀, 라이브 정책 회귀, 작업·안전 게이트 및 실제 실행 결과 동기화 검사 통과\n");
