import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateExpensiveGateEvidence as evaluate,
  expensiveGateContract as contract
} from "./expensive-gate.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const suite = JSON.parse(readFileSync(join(here, "expensive-gate-cases.json"), "utf8"));
const hash = value => value.repeat(64);

function validEvidence() {
  return {
    gateId: "sollang-stage2",
    estimatedCostMs: 700000,
    evidenceSource: "harness-events",
    inputFingerprintBefore: hash("a"),
    inputFingerprintAfter: hash("a"),
    changedContracts: ["partial-move-cleanup"],
    declaredConsumers: [
      { contractId: "partial-move-cleanup", consumerId: "owned-drop-scan" },
      { contractId: "partial-move-cleanup", consumerId: "field-drop-glue" }
    ],
    consumerAudits: [
      { contractId: "partial-move-cleanup", consumerId: "owned-drop-scan", outcome: "pass", evidenceId: "source:container-control" },
      { contractId: "partial-move-cleanup", consumerId: "field-drop-glue", outcome: "pass", evidenceId: "source:ownership" }
    ],
    probes: [
      { probeId: "whole-drop-absent", kind: "positive", outcome: "pass", evidenceId: "llvm:fixed" },
      { probeId: "old-whole-drop-detected", kind: "negative", outcome: "pass", evidenceId: "llvm:broken" }
    ]
  };
}

function fixture(name) {
  const value = validEvidence();
  if (name === "valid") return value;
  if (name === "not-applicable") {
    value.estimatedCostMs = 1000;
    value.changedContracts = [];
    value.declaredConsumers = [];
    value.consumerAudits = [];
    value.probes = [];
  } else if (name === "input-drift") {
    value.inputFingerprintAfter = hash("b");
  } else if (name === "no-change") {
    value.changedContracts = [];
    value.declaredConsumers = [];
    value.consumerAudits = [];
  } else if (name === "incomplete-map") {
    value.changedContracts.push("ast-edge-cutoff");
  } else if (name === "consumer-mismatch") {
    value.consumerAudits.pop();
  } else if (name === "failed-audit") {
    value.consumerAudits[1].outcome = "fail";
  } else if (name === "missing-negative") {
    value.probes = value.probes.filter(probe => probe.kind !== "negative");
  } else if (name === "failed-probe") {
    value.probes[1].outcome = "fail";
  } else if (name === "wrong-authority") {
    value.evidenceSource = "model-claim";
  } else if (name === "unknown-field") {
    value.readyBecause = "looks complete";
  } else {
    throw new Error(`Unknown fixture: ${name}`);
  }
  return value;
}

const evidenceOption = process.argv.indexOf("--evidence");
if (evidenceOption >= 0) {
  const evidencePath = process.argv[evidenceOption + 1];
  if (!evidencePath) {
    process.stderr.write("--evidence requires a JSON path\n");
    process.exit(64);
  }
  const result = evaluate(JSON.parse(readFileSync(evidencePath, "utf8")));
  process.stdout.write(`${JSON.stringify({ ruleId: contract.ruleId, ...result })}\n`);
  process.exit(result.allowed ? 0 : 2);
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
  process.stderr.write(`[expensive gate] FAIL ${failures}/${suite.cases.length}\n`);
  process.exit(1);
}

process.stdout.write(`[expensive gate] PASS ${suite.cases.length}/${suite.cases.length}; threshold ${contract.minimumCostMs}ms.\n`);
