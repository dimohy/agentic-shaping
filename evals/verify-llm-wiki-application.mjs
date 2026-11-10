import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateLlmWikiApplication as evaluate,
  llmWikiApplicationContract as contract
} from "./llm-wiki-application.mjs";

// --trace used to be silently ignored, so callers checked fixtures instead of their task.
const args = process.argv.slice(2);
if (args.length > 0) {
  if (args.length !== 2 || args[0] !== "--trace") {
    process.stderr.write("Usage: verify-llm-wiki-application.mjs [--trace TASK.json]\n");
    process.exit(2);
  }
  try {
    const result = evaluate(JSON.parse(readFileSync(args[1], "utf8")));
    process.stdout.write(JSON.stringify(result) + "\n");
    process.exit(result.allowed ? 0 : 2);
  } catch (error) {
    process.stderr.write(`Trace could not be checked: ${error.message}\n`);
    process.exit(2);
  }
}

const suite = JSON.parse(readFileSync(join(import.meta.dirname, "llm-wiki-application-traces.json"), "utf8"));
let failures = 0;
for (const testCase of suite.cases) {
  const actual = evaluate(testCase.trace);
  if (actual.allowed !== testCase.expected.allowed || actual.code !== testCase.expected.code) {
    failures += 1;
    process.stderr.write(`${testCase.id}: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}\n`);
  } else {
    process.stdout.write(`${testCase.id}: PASS ${actual.code}\n`);
  }
}
if (failures > 0) {
  process.stderr.write(`[LLM Wiki application] FAIL ${failures}/${suite.cases.length}\n`);
  process.exit(1);
}
// Required corrections come from current task context; discovery alone cannot establish coverage.
const baseline = structuredClone(suite.cases.find(value => value.id === "applied-with-plan-artifact-and-verification").trace);
baseline.requiredMemoryIds = [baseline.memories[0].id];
const checks = [
  ["required-memory-present", baseline, true, "application-trace-complete"],
  ["required-memory-omitted", { ...baseline, requiredMemoryIds: ["missing-correction"] }, false, "required-memory-missing"],
  ["required-memory-excluded", { ...baseline, memories: [{ ...baseline.memories[0], disposition: "excluded", exclusionReason: "not convenient" }] }, false, "required-memory-not-applied"],
  ["required-memory-list-invalid", { ...baseline, requiredMemoryIds: [" "] }, false, "invalid-required-memory-ids"],
];
for (const [id, trace, allowed, code] of checks) {
  const actual = evaluate(trace);
  if (actual.allowed !== allowed || actual.code !== code) throw new Error(`${id}: ${JSON.stringify(actual)}`);
  process.stdout.write(`${id}: PASS ${code}\n`);
}
process.stdout.write(`[LLM Wiki application] PASS ${suite.cases.length + checks.length}/${suite.cases.length + checks.length}; rule ${contract.ruleId}.\n`);
