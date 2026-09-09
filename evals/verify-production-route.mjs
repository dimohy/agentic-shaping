import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateProductionRouteEvidence as evaluate,
  productionRouteContract as contract
} from "./production-route.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const suite = JSON.parse(readFileSync(join(here, "production-route-cases.json"), "utf8"));
const hash = value => value.repeat(64);
const route = capability => [
  { kind: "command", id: "sollang windows --jobs 24" },
  { kind: "driver", id: "compiler entrypoints" },
  { kind: "api", id: "typedIr.lowerResolvedContextParallel" },
  { kind: "capability", id: capability }
];
const samples = count => Array.from({ length: count }, (_, index) => ({
  wallMs: 1000 - index * 10,
  cpuMs: 900 - index * 10,
  peakWorkingSetBytes: 1048576 + index
}));

function validEvidence() {
  return {
    claimId: "sollang-c82-native-emission",
    claimMode: "acceptance",
    routeEvidenceSource: "harness-events",
    baseline: {
      compilerFingerprint: hash("a"),
      inputFingerprint: hash("c"),
      declaredProductionRoute: route("sequential-loop"),
      observedRoute: route("sequential-loop"),
      output: { sha256: hash("d"), bytes: 4096 },
      samples: samples(3)
    },
    candidate: {
      compilerFingerprint: hash("b"),
      inputFingerprint: hash("c"),
      declaredProductionRoute: route("compute-pool"),
      observedRoute: route("compute-pool"),
      output: { sha256: hash("d"), bytes: 4096 },
      samples: samples(3)
    }
  };
}

function fixture(name) {
  const value = validEvidence();
  if (name === "valid") return value;
  if (name === "diagnostic-wrapper") {
    value.claimMode = "diagnostic";
    value.baseline.declaredProductionRoute = route("sequential-loop");
    value.candidate.declaredProductionRoute = route("compute-pool");
    value.baseline.observedRoute = route("sequential-wrapper");
    value.candidate.observedRoute = route("sequential-wrapper");
  } else if (name === "route-mismatch") {
    value.candidate.observedRoute = route("sequential-wrapper");
  } else if (name === "input-mismatch") {
    value.candidate.inputFingerprint = hash("e");
  } else if (name === "output-mismatch") {
    value.candidate.output.sha256 = hash("e");
  } else if (name === "same-compiler") {
    value.candidate.compilerFingerprint = value.baseline.compilerFingerprint;
  } else if (name === "insufficient-samples") {
    value.candidate.samples = samples(1);
  } else if (name === "wrong-evidence-source") {
    value.routeEvidenceSource = "model-claim";
  } else if (name === "unknown-field") {
    value.unverifiedNote = "looks equivalent";
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
  process.stderr.write(`[production route] FAIL ${failures}/${suite.cases.length}\n`);
  process.exit(1);
}

process.stdout.write(`[production route] PASS ${suite.cases.length}/${suite.cases.length}; minimum ${contract.minimumSamplesPerVariant} samples per variant.\n`);
