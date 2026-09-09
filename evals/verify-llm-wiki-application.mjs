import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateLlmWikiApplication as evaluate,
  llmWikiApplicationContract as contract
} from "./llm-wiki-application.mjs";

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
process.stdout.write(`[LLM Wiki application] PASS ${suite.cases.length}/${suite.cases.length}; rule ${contract.ruleId}.\n`);
