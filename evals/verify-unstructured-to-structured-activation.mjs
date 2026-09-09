import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(import.meta.dirname, "unstructured-to-structured-activation-v0.4-full-development-luna-max.json");
const result = JSON.parse(readFileSync(path, "utf8"));
const baseline = result.summary.find(row => row.variant === "baseline");
const shaped = result.summary.find(row => row.variant === "shaped");
if (!result.passed
    || result.suiteSource !== "unstructured-to-structured-activation-cases.json"
    || result.method.caseCount !== 4 || result.method.agentRunCount !== 8
    || baseline.hits !== 12 || baseline.expected !== 13
    || shaped.hits !== 13 || shaped.expected !== 13
    || baseline.taskHits !== 4 || baseline.taskExpected !== 5
    || shaped.taskHits !== 5 || shaped.taskExpected !== 5
    || baseline.forbidden !== 0 || shaped.forbidden !== 0
    || result.pairedOutcome.shapedBetter !== 1
    || result.pairedOutcome.tied !== 3
    || result.pairedOutcome.shapedWorse !== 0) {
  throw new Error("AS-US-001 activation development evidence is stale or failed");
}
process.stdout.write("AS-US-001 activation development evidence PASS 4 pairs; baseline 12/13, shaped 13/13\n");
