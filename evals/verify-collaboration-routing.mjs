import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  collaborationRoutingContract as contract,
  evaluateCollaborationRouting as evaluate
} from "./collaboration-routing.mjs";

const traceIndex = process.argv.indexOf("--trace");
if (traceIndex >= 0) {
  const tracePath = process.argv[traceIndex + 1];
  if (!tracePath) {
    process.stderr.write("--trace requires a JSON path\n");
    process.exit(1);
  }
  const verdict = evaluate(JSON.parse(readFileSync(resolve(tracePath), "utf8")));
  process.stdout.write(`${JSON.stringify({ ruleId: contract.ruleId, ...verdict })}\n`);
  process.exit(verdict.allowed ? 0 : 2);
}

const suite = JSON.parse(readFileSync(join(import.meta.dirname, "collaboration-routing-traces.json"), "utf8"));
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
  process.stderr.write(`[collaboration routing] FAIL ${failures}/${suite.cases.length}\n`);
  process.exit(1);
}
process.stdout.write(`[collaboration routing] PASS ${suite.cases.length}/${suite.cases.length}; rule ${contract.ruleId}.\n`);
