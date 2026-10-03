import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { evaluateUnstructuredToStructured } from "./unstructured-to-structured.mjs";

const root = resolve(import.meta.dirname, "..");
const suite = JSON.parse(readFileSync(new URL("./unstructured-to-structured-traces.json", import.meta.url), "utf8"));
const contract = JSON.parse(readFileSync(new URL("./unstructured-to-structured-contract.json", import.meta.url), "utf8"));
const traceSchemaText = readFileSync(new URL("./unstructured-to-structured-trace.schema.json", import.meta.url), "utf8");
if (suite.ruleId !== contract.ruleId || contract.ruleId !== "AS-US-001") throw new Error("AS-US-001 contract/suite mismatch");
if (contract.schemaVersion !== 6
    || contract.costSelection?.reusableCodeRequires !== "supported"
    || !traceSchemaText.includes('"costSelection"')
    || !contract.claimLevels?.["signal-observed"]
    || !contract.claimLevels?.["structured-and-applied"]
    || !contract.claimLevels?.["measured-improvement"]
    || !traceSchemaText.includes('"measurementPlan"')
    || !traceSchemaText.includes('"claimLevel"')
    || !traceSchemaText.includes('"orchestratorEvidence"')
    || !traceSchemaText.includes('"executedCommands"')
    || !traceSchemaText.includes('"outputSha256"')) {
  throw new Error("AS-US-001 three-level lifecycle contract is missing or stale");
}
const direct = spawnSync(process.execPath, [resolve(import.meta.dirname, "unstructured-to-structured.mjs")], { encoding: "utf8" });
if (direct.status !== 64 || !(direct.stdout + direct.stderr).includes("--trace <path>")) {
  throw new Error(`AS-US-001 runtime did not fail closed without trace: ${direct.status} ${direct.stdout}${direct.stderr}`);
}
let passed = 0;
for (const testCase of suite.cases) {
  const actual = evaluateUnstructuredToStructured(testCase.trace);
  if (actual.allowed !== testCase.expected.allowed || actual.code !== testCase.expected.code) {
    throw new Error(`${testCase.id}: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}`);
  }
  if (testCase.runtimeCheck) {
    const runtime = spawnSync(process.execPath,
      [resolve(import.meta.dirname, "unstructured-to-structured.mjs"), "--trace", "-"],
      { input: JSON.stringify(testCase.trace), encoding: "utf8" });
    const runtimeResult = JSON.parse(runtime.stdout);
    if (runtime.status !== (testCase.expected.allowed ? 0 : 2)
        || runtimeResult.allowed !== actual.allowed || runtimeResult.code !== actual.code) {
      throw new Error(`${testCase.id}: runtime differs from the decision gate: ${runtime.status} ${runtime.stdout}${runtime.stderr}`);
    }
  }
  passed++;
}
const koreanPrompt = readFileSync(resolve(root, "site", "README.ko.source.md"), "utf8");
for (const phrase of ["비정형→정형 전환 게이트", "signal-observed", "structured-and-applied", "measured-improvement", "실제 소비 경로", "전후 지표", "실행 증거", "저장소 revision", "측정 명령", "정확히 일치"]) {
  if (!koreanPrompt.includes(phrase)) throw new Error(`public policy is missing: ${phrase}`);
}
process.stdout.write(`AS-US-001 unstructured-to-structured gate PASS ${passed}/${suite.cases.length}\n`);
