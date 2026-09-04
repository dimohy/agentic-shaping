import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const expensiveGateContract = JSON.parse(
  readFileSync(join(here, "expensive-gate-contract.json"), "utf8")
);

const sha256Pattern = /^[A-Fa-f0-9]{64}$/;
const rootKeys = new Set([
  "gateId", "estimatedCostMs", "evidenceSource", "inputFingerprintBefore",
  "inputFingerprintAfter", "changedContracts", "declaredConsumers",
  "consumerAudits", "probes"
]);
const consumerKeys = new Set(["contractId", "consumerId"]);
const auditKeys = new Set(["contractId", "consumerId", "outcome", "evidenceId"]);
const probeKeys = new Set(["probeId", "kind", "outcome", "evidenceId"]);

function fail(code) {
  return { allowed: false, code };
}

function hasOnlyKeys(value, allowed) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).every(key => allowed.has(key));
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validConsumer(value) {
  return hasOnlyKeys(value, consumerKeys) &&
    nonEmpty(value.contractId) && nonEmpty(value.consumerId);
}

function validAudit(value) {
  return hasOnlyKeys(value, auditKeys) &&
    nonEmpty(value.contractId) && nonEmpty(value.consumerId) &&
    ["pass", "fail"].includes(value.outcome) && nonEmpty(value.evidenceId);
}

function validProbe(value) {
  return hasOnlyKeys(value, probeKeys) && nonEmpty(value.probeId) &&
    expensiveGateContract.requiredProbeKinds.includes(value.kind) &&
    ["pass", "fail"].includes(value.outcome) && nonEmpty(value.evidenceId);
}

function pairKey(value) {
  return `${value.contractId}\u0000${value.consumerId}`;
}

export function evaluateExpensiveGateEvidence(evidence) {
  if (!hasOnlyKeys(evidence, rootKeys) || !nonEmpty(evidence.gateId) ||
      !Number.isInteger(evidence.estimatedCostMs) || evidence.estimatedCostMs < 0 ||
      evidence.evidenceSource !== expensiveGateContract.evidenceAuthority ||
      !sha256Pattern.test(evidence.inputFingerprintBefore ?? "") ||
      !sha256Pattern.test(evidence.inputFingerprintAfter ?? "") ||
      !Array.isArray(evidence.changedContracts) ||
      !evidence.changedContracts.every(nonEmpty) ||
      new Set(evidence.changedContracts).size !== evidence.changedContracts.length ||
      !Array.isArray(evidence.declaredConsumers) ||
      !evidence.declaredConsumers.every(validConsumer) ||
      !Array.isArray(evidence.consumerAudits) ||
      !evidence.consumerAudits.every(validAudit) ||
      !Array.isArray(evidence.probes) || !evidence.probes.every(validProbe)) {
    return fail("AS-EG-001-INVALID-EVIDENCE");
  }

  if (evidence.estimatedCostMs < expensiveGateContract.minimumCostMs) {
    return { allowed: true, code: "OK-NOT-APPLICABLE" };
  }
  if (evidence.inputFingerprintBefore !== evidence.inputFingerprintAfter) {
    return fail("AS-EG-001-INPUT-DRIFT");
  }
  if (evidence.changedContracts.length === 0) {
    return fail("AS-EG-001-NO-CHANGED-CONTRACT");
  }

  const changed = new Set(evidence.changedContracts);
  const declaredKeys = evidence.declaredConsumers.map(pairKey);
  const auditKeys = evidence.consumerAudits.map(pairKey);
  if (declaredKeys.length === 0 ||
      evidence.declaredConsumers.some(item => !changed.has(item.contractId)) ||
      evidence.changedContracts.some(contractId =>
        !evidence.declaredConsumers.some(item => item.contractId === contractId)) ||
      new Set(declaredKeys).size !== declaredKeys.length ||
      new Set(auditKeys).size !== auditKeys.length) {
    return fail("AS-EG-001-INCOMPLETE-CONSUMER-MAP");
  }

  const declared = new Set(declaredKeys);
  const audited = new Set(auditKeys);
  if (declared.size !== audited.size ||
      [...declared].some(key => !audited.has(key)) ||
      [...audited].some(key => !declared.has(key))) {
    return fail("AS-EG-001-CONSUMER-MISMATCH");
  }
  if (evidence.consumerAudits.some(audit => audit.outcome !== "pass")) {
    return fail("AS-EG-001-FAILED-AUDIT");
  }

  const probeKinds = new Set(evidence.probes.map(probe => probe.kind));
  if (expensiveGateContract.requiredProbeKinds.some(kind => !probeKinds.has(kind))) {
    return fail("AS-EG-001-MISSING-CONTROL");
  }
  if (evidence.probes.some(probe => probe.outcome !== "pass")) {
    return fail("AS-EG-001-FAILED-PROBE");
  }

  return { allowed: true, code: "OK" };
}
