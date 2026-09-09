import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateGoldenDriftEvidence as evaluate, goldenDriftContract as contract } from "./golden-drift.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const suite = JSON.parse(readFileSync(join(here, "golden-drift-cases.json"), "utf8"));
const hash = value => value.repeat(64);

function validEvidence() {
  return {
    failureId: "source-worker-golden-drift",
    evidenceSource: "harness-events",
    expectedHashBefore: hash("a"),
    actualHash: hash("b"),
    updatedHash: hash("b"),
    artifactChecks: [
      { kind: "assemble", outcome: "pass", evidenceId: "llvm-as:focused" },
      { kind: "link", outcome: "pass", evidenceId: "clang:focused" },
      { kind: "execute", outcome: "pass", evidenceId: "runtime:focused" }
    ],
    referenceBehavior: { outcome: "pass", evidenceId: "managed-reference:exact" },
    updatePath: { kind: "authoritative-command", outcome: "pass", evidenceId: "runner:update-expected" }
  };
}

function fixture(name) {
  const value = validEvidence();
  if (name === "valid") return value;
  if (name === "no-drift") value.actualHash = value.expectedHashBefore;
  else if (name === "missing-check") value.artifactChecks.splice(1, 1);
  else if (name === "failed-artifact") value.artifactChecks[2].outcome = "fail";
  else if (name === "reference-mismatch") value.referenceBehavior.outcome = "fail";
  else if (name === "direct-edit") value.updatePath.kind = "direct-edit";
  else if (name === "failed-update") value.updatePath.outcome = "fail";
  else if (name === "wrong-bytes") value.updatedHash = hash("c");
  else if (name === "wrong-authority") value.evidenceSource = "model-claim";
  else throw new Error(`Unknown fixture: ${name}`);
  return value;
}

let failures = 0;
for (const testCase of suite.cases) {
  const actual = evaluate(fixture(testCase.fixture));
  if (actual.allowed !== testCase.expected.allowed || actual.code !== testCase.expected.code) {
    failures += 1;
    process.stderr.write(`${testCase.id}: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}\n`);
  } else {
    process.stdout.write(`${testCase.id}: PASS ${actual.code}\n`);
  }
}
if (failures > 0) {
  process.stderr.write(`[golden drift] FAIL ${failures}/${suite.cases.length}\n`);
  process.exit(1);
}
process.stdout.write(`[golden drift] PASS ${suite.cases.length}/${suite.cases.length}; ${contract.requiredArtifactChecks.length} artifact checks.\n`);
