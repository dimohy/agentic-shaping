import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const goldenDriftContract = JSON.parse(
  readFileSync(join(here, "golden-drift-contract.json"), "utf8")
);

const sha256Pattern = /^[A-Fa-f0-9]{64}$/;
const rootKeys = new Set(["failureId", "evidenceSource", "expectedHashBefore", "actualHash", "updatedHash", "artifactChecks", "referenceBehavior", "updatePath"]);
const checkKeys = new Set(["kind", "outcome", "evidenceId"]);
const evidenceKeys = new Set(["outcome", "evidenceId"]);

function fail(code) { return { allowed: false, code }; }
function nonEmpty(value) { return typeof value === "string" && value.trim().length > 0; }
function hasOnlyKeys(value, allowed) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).every(key => allowed.has(key));
}
function validEvidence(value) {
  return hasOnlyKeys(value, evidenceKeys) && ["pass", "fail"].includes(value.outcome) && nonEmpty(value.evidenceId);
}
function validCheck(value) {
  return hasOnlyKeys(value, checkKeys) &&
    goldenDriftContract.requiredArtifactChecks.includes(value.kind) &&
    ["pass", "fail"].includes(value.outcome) && nonEmpty(value.evidenceId);
}

export function evaluateGoldenDriftEvidence(evidence) {
  if (!hasOnlyKeys(evidence, rootKeys) || !nonEmpty(evidence.failureId) ||
      evidence.evidenceSource !== goldenDriftContract.evidenceAuthority ||
      !sha256Pattern.test(evidence.expectedHashBefore ?? "") ||
      !sha256Pattern.test(evidence.actualHash ?? "") ||
      !sha256Pattern.test(evidence.updatedHash ?? "") ||
      !Array.isArray(evidence.artifactChecks) || !evidence.artifactChecks.every(validCheck) ||
      !validEvidence(evidence.referenceBehavior) ||
      !hasOnlyKeys(evidence.updatePath, checkKeys) ||
      evidence.updatePath.kind !== goldenDriftContract.updateAuthority ||
      !["pass", "fail"].includes(evidence.updatePath.outcome) || !nonEmpty(evidence.updatePath.evidenceId)) {
    return fail("AS-GD-001-INVALID-EVIDENCE");
  }
  if (evidence.expectedHashBefore === evidence.actualHash) return fail("AS-GD-001-NO-DRIFT");
  const kinds = evidence.artifactChecks.map(check => check.kind);
  if (new Set(kinds).size !== kinds.length ||
      goldenDriftContract.requiredArtifactChecks.some(kind => !kinds.includes(kind))) {
    return fail("AS-GD-001-INCOMPLETE-ARTIFACT-CHECKS");
  }
  if (evidence.artifactChecks.some(check => check.outcome !== "pass")) return fail("AS-GD-001-INVALID-ARTIFACT");
  if (evidence.referenceBehavior.outcome !== "pass") return fail("AS-GD-001-REFERENCE-MISMATCH");
  if (evidence.updatePath.outcome !== "pass") return fail("AS-GD-001-UNTRUSTED-UPDATE");
  if (evidence.updatedHash !== evidence.actualHash) return fail("AS-GD-001-PUBLISHED-BYTES-MISMATCH");
  return { allowed: true, code: "OK" };
}
