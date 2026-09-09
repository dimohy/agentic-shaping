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
    gateOrdinal: 5,
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
    ],
    priorLateFailures: [],
    outcomeObservability: {
      durableLogPath: "artifacts/stage2.log",
      completionRecordPath: "artifacts/stage2.result.json",
      recordSchemaVersion: 1,
      capturesExitCode: true,
      capturesFailureIds: true,
      executionMode: "detached-supervisor",
      survivesObserverDisconnect: true,
      waitsOnSupervisedProcessOnly: true,
      writesCompletionRecordOnTermination: true,
      successRequiresEmptyFailureIds: true,
      failureIdsRequireFailureContext: true
    }
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
  } else if (name === "promoted-late-failure") {
    value.probes.push({ probeId: "partition-single-drop", kind: "positive", outcome: "pass", evidenceId: "runtime:partition-fixed" });
    value.priorLateFailures.push({ failureId: "partition-double-free", discoveredGateOrdinal: 5, promotedGateOrdinal: 2, probeId: "partition-single-drop", evidenceId: "asan:double-free" });
  } else if (name === "late-failure-not-promoted") {
    value.priorLateFailures.push({ failureId: "partition-double-free", discoveredGateOrdinal: 5, promotedGateOrdinal: 5, probeId: "missing-partition-probe", evidenceId: "asan:double-free" });
  } else if (name === "missing-exit-code") {
    value.outcomeObservability.capturesExitCode = false;
  } else if (name === "missing-failure-ids") {
    value.outcomeObservability.capturesFailureIds = false;
  } else if (name === "aliased-outcome-paths") {
    value.outcomeObservability.completionRecordPath = value.outcomeObservability.durableLogPath;
  } else if (name === "attached-runner") {
    value.outcomeObservability.executionMode = "foreground-session";
  } else if (name === "observer-disconnect-stops-runner") {
    value.outcomeObservability.survivesObserverDisconnect = false;
  } else if (name === "process-tree-wait") {
    value.outcomeObservability.waitsOnSupervisedProcessOnly = false;
  } else if (name === "missing-termination-record") {
    value.outcomeObservability.writesCompletionRecordOnTermination = false;
  } else if (name === "success-allows-failure-ids") {
    value.outcomeObservability.successRequiresEmptyFailureIds = false;
  } else if (name === "failure-ids-ignore-context") {
    value.outcomeObservability.failureIdsRequireFailureContext = false;
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
