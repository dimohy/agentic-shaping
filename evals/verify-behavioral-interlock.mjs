import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  behavioralInterlockContract as contract,
  evaluateBehavioralInterlock as evaluate
} from "./behavioral-interlock.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const suite = JSON.parse(readFileSync(join(here, "behavioral-interlock-traces.json"), "utf8"));
const runtimePath = join(here, "behavioral-interlock.mjs");

const traceOption = process.argv.indexOf("--trace");
if (traceOption >= 0) {
  const tracePath = process.argv[traceOption + 1];
  if (!tracePath) {
    process.stderr.write("--trace requires a JSON path\n");
    process.exit(64);
  }
  const trace = JSON.parse(readFileSync(tracePath, "utf8"));
  if (trace === null || typeof trace !== "object" || Array.isArray(trace) ||
      Object.keys(trace).some(key => key !== "events") ||
      !Array.isArray(trace.events)) {
    process.stderr.write("trace JSON must match the behavioral interlock trace schema\n");
    process.exit(64);
  }
  const result = evaluate(trace.events);
  process.stdout.write(`${JSON.stringify({ ruleId: contract.ruleId, ...result })}\n`);
  process.exit(result.allowed ? 0 : 2);
}

let failures = 0;

function verifyRuntimeCli(id, args, expectedStatus, expectedOutput, stream = "stdout") {
  const run = spawnSync(process.execPath, [runtimePath, ...args], { encoding: "utf8" });
  const actual = stream === "stderr" ? run.stderr : run.stdout;
  if (run.status !== expectedStatus || !actual.includes(expectedOutput)) {
    failures += 1;
    process.stderr.write(
      `${id}: expected exit ${expectedStatus} and ${stream} containing ${JSON.stringify(expectedOutput)}, ` +
      `got exit ${run.status}, stdout=${JSON.stringify(run.stdout)}, stderr=${JSON.stringify(run.stderr)}\n`
    );
  } else {
    process.stdout.write(`${id}: PASS exit ${run.status}\n`);
  }
}

verifyRuntimeCli(
  "runtime-direct-no-args-fails-closed",
  [],
  64,
  "--trace <runtime-trace.json>",
  "stderr"
);
verifyRuntimeCli(
  "runtime-direct-allowed-trace",
  ["--trace", join(here, "fixtures", "interlock", "allowed.json")],
  0,
  '"allowed":true'
);
verifyRuntimeCli(
  "runtime-direct-blocked-trace",
  ["--trace", join(here, "fixtures", "interlock", "blocked.json")],
  2,
  '"code":"AS-BI-001-IDLE-WAIT"'
);

for (const testCase of suite.cases) {
  const actual = evaluate(testCase.events);
  if (actual.allowed !== testCase.expected.allowed || actual.code !== testCase.expected.code) {
    failures += 1;
    process.stderr.write(`${testCase.id}: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}\n`);
  } else {
    process.stdout.write(`${testCase.id}: PASS ${actual.code}\n`);
  }
}

const invalidEvidenceDiagnostic = evaluate([
  { kind: "start", runId: "diagnostic", pendingSafeWork: 1, nextActionId: "review" },
  {
    kind: "evidence",
    evidenceKind: "verification-contract",
    actionId: "review",
    nextActionId: "",
    conflictsActiveInputs: false,
    competesHighLoad: false
  }
]);
if (typeof invalidEvidenceDiagnostic.guidance !== "string" ||
    !invalidEvidenceDiagnostic.guidance.includes("declared evidenceKind") ||
    !Array.isArray(invalidEvidenceDiagnostic.allowedEvidenceKinds) ||
    !invalidEvidenceDiagnostic.allowedEvidenceKinds.includes("contract-review") ||
    !invalidEvidenceDiagnostic.allowedEvidenceKinds.includes("system-evolution-audit") ||
    invalidEvidenceDiagnostic.allowedEvidenceKinds.includes("status-only-message")) {
  failures += 1;
  process.stderr.write(
    `invalid-evidence-guidance: expected actionable declared evidence kinds, got ${JSON.stringify(invalidEvidenceDiagnostic)}\n`
  );
} else {
  process.stdout.write("invalid-evidence-guidance: PASS actionable allowed evidence kinds\n");
}

if (failures > 0) {
  process.stderr.write(`[behavioral interlock] FAIL ${failures}/${suite.cases.length}\n`);
  process.exit(1);
}

process.stdout.write(`[behavioral interlock] PASS ${suite.cases.length + 4}/${suite.cases.length + 4}; state budget ${contract.maxInjectedStateBytes} bytes.\n`);
