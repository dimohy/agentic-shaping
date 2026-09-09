import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const productionRouteContract = JSON.parse(
  readFileSync(join(here, "production-route-contract.json"), "utf8")
);

const sha256Pattern = /^[A-Fa-f0-9]{64}$/;
const rootKeys = new Set([
  "claimId", "claimMode", "routeEvidenceSource", "baseline", "candidate"
]);
const executionKeys = new Set([
  "compilerFingerprint", "inputFingerprint", "declaredProductionRoute", "observedRoute", "output", "samples"
]);
const stageKeys = new Set(["kind", "id"]);
const outputKeys = new Set(["sha256", "bytes"]);
const sampleKeys = new Set(["wallMs", "cpuMs", "peakWorkingSetBytes"]);

function fail(code) {
  return { allowed: false, code };
}

function hasOnlyKeys(value, allowed) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).every(key => allowed.has(key));
}

function validRoute(route) {
  return Array.isArray(route) &&
    route.length === productionRouteContract.routeStages.length &&
    route.every((stage, index) =>
      hasOnlyKeys(stage, stageKeys) &&
      stage.kind === productionRouteContract.routeStages[index] &&
      typeof stage.id === "string" && stage.id.trim().length > 0
    );
}

function validExecution(execution) {
  return hasOnlyKeys(execution, executionKeys) &&
    sha256Pattern.test(execution.compilerFingerprint ?? "") &&
    sha256Pattern.test(execution.inputFingerprint ?? "") &&
    validRoute(execution.declaredProductionRoute) &&
    validRoute(execution.observedRoute) &&
    hasOnlyKeys(execution.output, outputKeys) &&
    sha256Pattern.test(execution.output.sha256 ?? "") &&
    Number.isInteger(execution.output.bytes) && execution.output.bytes > 0 &&
    Array.isArray(execution.samples) && execution.samples.length > 0 &&
    execution.samples.every(sample =>
      hasOnlyKeys(sample, sampleKeys) &&
      Number.isInteger(sample.wallMs) && sample.wallMs > 0 &&
      Number.isInteger(sample.cpuMs) && sample.cpuMs > 0 &&
      Number.isInteger(sample.peakWorkingSetBytes) && sample.peakWorkingSetBytes > 0
    );
}

function sameRoute(left, right) {
  return left.every((stage, index) =>
    stage.kind === right[index].kind && stage.id === right[index].id
  );
}

export function evaluateProductionRouteEvidence(evidence) {
  if (!hasOnlyKeys(evidence, rootKeys) ||
      typeof evidence.claimId !== "string" || evidence.claimId.trim().length === 0 ||
      !["acceptance", "diagnostic"].includes(evidence.claimMode) ||
      evidence.routeEvidenceSource !== productionRouteContract.routeEvidenceAuthority ||
      !validExecution(evidence.baseline) ||
      !validExecution(evidence.candidate)) {
    return fail("AS-PR-001-INVALID-EVIDENCE");
  }

  if (evidence.claimMode === "diagnostic") {
    return { allowed: true, code: "OK-DIAGNOSTIC" };
  }

  if (!sameRoute(evidence.baseline.observedRoute, evidence.baseline.declaredProductionRoute) ||
      !sameRoute(evidence.candidate.observedRoute, evidence.candidate.declaredProductionRoute)) {
    return fail("AS-PR-001-ROUTE-MISMATCH");
  }
  if (evidence.baseline.inputFingerprint !== evidence.candidate.inputFingerprint) {
    return fail("AS-PR-001-INPUT-MISMATCH");
  }
  if (evidence.baseline.output.sha256 !== evidence.candidate.output.sha256 ||
      evidence.baseline.output.bytes !== evidence.candidate.output.bytes) {
    return fail("AS-PR-001-OUTPUT-MISMATCH");
  }
  if (evidence.baseline.compilerFingerprint === evidence.candidate.compilerFingerprint) {
    return fail("AS-PR-001-COMPILER-NOT-CHANGED");
  }
  if (evidence.baseline.samples.length < productionRouteContract.minimumSamplesPerVariant ||
      evidence.candidate.samples.length < productionRouteContract.minimumSamplesPerVariant) {
    return fail("AS-PR-001-INSUFFICIENT-SAMPLES");
  }

  return { allowed: true, code: "OK" };
}
