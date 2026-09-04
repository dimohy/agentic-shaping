import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { progressReportContract as contract, evaluateProgressReport as evaluate } from "./progress-report.mjs";

const here = import.meta.dirname;
const runtimePath = join(here, "progress-report.mjs");
const suite = JSON.parse(readFileSync(join(here, "progress-report-traces.json"), "utf8"));
let failures = 0;

for (const [id, file, expectedStatus, expectedText] of [
  ["runtime-no-args-fails-closed", null, 64, "--trace <progress-report-trace.json>"],
  ["runtime-allowed-trace", join(here, "fixtures", "progress-report", "allowed.json"), 0, "multi-axis-progress-valid"],
  ["runtime-blocked-trace", join(here, "fixtures", "progress-report", "blocked.json"), 2, "required-axis-missing"]
]) {
  const args = file ? [runtimePath, "--trace", file] : [runtimePath];
  const run = spawnSync(process.execPath, args, { encoding: "utf8" });
  const output = run.stdout + run.stderr;
  if (run.status !== expectedStatus || !output.includes(expectedText)) {
    failures += 1;
    process.stderr.write(`${id}: expected exit ${expectedStatus} containing ${expectedText}, got ${run.status} ${output}\n`);
  } else process.stdout.write(`${id}: PASS exit ${run.status}\n`);
}

for (const testCase of suite.cases) {
  const actual = evaluate(testCase.trace);
  if (actual.allowed !== testCase.expected.allowed || actual.code !== testCase.expected.code) {
    failures += 1;
    process.stderr.write(`${testCase.id}: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}\n`);
  } else process.stdout.write(`${testCase.id}: PASS ${actual.code}\n`);
}

if (failures > 0) {
  process.stderr.write(`[progress report] FAIL ${failures}/${suite.cases.length + 3}\n`);
  process.exit(1);
}
process.stdout.write(`[progress report] PASS ${suite.cases.length + 3}/${suite.cases.length + 3}; rule ${contract.ruleId}.\n`);
