import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const assetKinds = new Set(["schema", "type", "enum", "manifest", "index", "invariant", "validator", "fixture", "pipeline"]);
const metrics = new Set(["manualJudgments", "reanalysisUnits", "lateFailures", "retries", "elapsedMs", "contextTokens", "misses"]);
const claimLevels = new Set(["structured-and-applied", "measured-improvement"]);
const hash = /^[a-f0-9]{64}$/i;
const revision = /^[a-f0-9]{7,64}$/i;
const evidencePurposes = new Set(["validator", "consumer", "baseline", "candidate", "measurement"]);
const costStrategies = new Set(["model-direct", "reuse-existing", "reusable-code"]);
const newCodeBenefits = new Set(["supported", "unknown", "negative"]);
const fail = code => ({ allowed: false, code });

// Classify the declared plan; this does not attest that its checks executed.
export function evaluateCostSelection(selection) {
  if (!selection || !costStrategies.has(selection.strategy)
      || !newCodeBenefits.has(selection.newCodeBenefit)
      || typeof selection.rationale !== "string" || !selection.rationale.trim()) {
    return fail("AS-US-001-INVALID-COST-SELECTION");
  }
  if (selection.mandatoryChecksPreserved !== true) return fail("AS-US-001-MANDATORY-CHECKS-NOT-PRESERVED");
  const diagnosis = selection.diagnosis;
  if (diagnosis !== undefined) {
    if (!diagnosis || !["sufficient", "insufficient", "unsupported"].includes(diagnosis.structuredOutcome)) {
      return fail("AS-US-001-INVALID-DIAGNOSIS");
    }
    if (diagnosis.structuredOutcome !== "sufficient") {
      const inspection = diagnosis.sourceInspection;
      if (!inspection || !Array.isArray(inspection.references) || inspection.references.length === 0
          || inspection.references.some(value => typeof value !== "string" || !value.trim())
          || typeof inspection.finding !== "string" || !inspection.finding.trim()
          || typeof inspection.nextAction !== "string" || !inspection.nextAction.trim()) {
        return fail("AS-US-001-DIRECT-INSPECTION-REQUIRED");
      }
    }
  }
  if (selection.strategy === "reusable-code" && selection.newCodeBenefit !== "supported") {
    return fail("AS-US-001-NEW-CODE-BENEFIT-UNSUPPORTED");
  }
  return { allowed: true, code: "AS-US-001-COST-SELECTED" };
}

const validExecutedCommand = value => value
  && evidencePurposes.has(value.purpose)
  && typeof value.command === "string" && value.command.trim()
  && Number.isInteger(value.exitCode)
  && Number.isInteger(value.expectedExitCode ?? 0)
  && value.exitCode === (value.expectedExitCode ?? 0)
  && (value.purpose === "baseline" || (value.expectedExitCode ?? 0) === 0)
  && typeof value.outputSha256 === "string" && hash.test(value.outputSha256);

const validOrchestratorEvidence = (evidence, inputFingerprint, claimLevel) => {
  if (!evidence || evidence.runner !== "agentic-shaping-orchestrator"
      || typeof evidence.runId !== "string" || !evidence.runId.trim()
      || typeof evidence.targetRepository !== "string" || !evidence.targetRepository.trim()
      || typeof evidence.targetRevision !== "string" || !revision.test(evidence.targetRevision)
      || typeof evidence.inputFingerprint !== "string" || !hash.test(evidence.inputFingerprint)
      || evidence.inputFingerprint.toLowerCase() !== inputFingerprint.toLowerCase()
      || !Array.isArray(evidence.executedCommands)
      || evidence.executedCommands.some(value => !validExecutedCommand(value))) return false;
  const purposes = new Set(evidence.executedCommands.map(value => value.purpose));
  if (claimLevel === "signal-observed") return purposes.has("baseline");
  if (!purposes.has("validator") || !purposes.has("consumer")) return false;
  return claimLevel !== "measured-improvement"
    || (purposes.has("baseline") && purposes.has("candidate"));
};

export function evaluateUnstructuredToStructured(trace) {
  if (!trace || trace.ruleId !== "AS-US-001" || trace.traceAuthority !== "orchestrator") return fail("AS-US-001-INVALID-TRACE");
  if (typeof trace.signal?.durable !== "boolean" || typeof trace.signal?.machineDecidable !== "boolean") return fail("AS-US-001-INVALID-TRACE");
  if (typeof trace.signal.id !== "string" || !trace.signal.id.trim() || !Array.isArray(trace.signal.sourceEvidence) || trace.signal.sourceEvidence.length === 0
      || trace.signal.sourceEvidence.some(value => typeof value !== "string" || !value.trim())) return fail("AS-US-001-MISSING-SIGNAL-EVIDENCE");
  if (!Array.isArray(trace.forbiddenActions) || trace.forbiddenActions.length !== 0) return fail("AS-US-001-FORBIDDEN-ACTION");

  const mustStructure = trace.signal.durable === true && trace.signal.machineDecidable === true;
  if (!trace.decision || typeof trace.decision.structured !== "boolean" || typeof trace.decision.reason !== "string" || !trace.decision.reason.trim()) return fail("AS-US-001-INVALID-DECISION");
  const selection = trace.decision.costSelection;
  if (selection !== undefined) {
    const result = evaluateCostSelection(selection);
    if (!result.allowed) return result;
  }
  if (!trace.decision.structured) {
    if (trace.decision.claimLevel === "signal-observed") {
      const planned = trace.decision.plannedAsset;
      if (!mustStructure || trace.currentTaskComplete !== false
          || !planned || !assetKinds.has(planned.kind)
          || typeof planned.authorityPath !== "string" || !planned.authorityPath.trim()
          || typeof planned.nextGate !== "string" || !planned.nextGate.trim()) {
        return fail("AS-US-001-INVALID-SIGNAL-OBSERVED");
      }
      const fingerprint = trace.orchestratorEvidence?.inputFingerprint;
      if (!validOrchestratorEvidence(trace.orchestratorEvidence, fingerprint, "signal-observed")) {
        return fail("AS-US-001-INVALID-ORCHESTRATOR-EVIDENCE");
      }
      return { allowed: true, code: "AS-US-001-SIGNAL-OBSERVED" };
    }
    if (trace.currentTaskComplete !== true) return fail("AS-US-001-CURRENT-TASK");
    if (selection && selection.strategy !== "reusable-code") {
      if (trace.decision.claimLevel !== undefined) return fail("AS-US-001-INVALID-CLAIM-LEVEL");
      return { allowed: true, code: "AS-US-001-COST-SELECTED" };
    }
    return mustStructure ? fail("AS-US-001-UNSTRUCTURED-DURABLE-SIGNAL") : { allowed: true, code: "AS-US-001-NOT-DURABLE" };
  }

  if (trace.currentTaskComplete !== true) return fail("AS-US-001-CURRENT-TASK");

  const { asset, application, claimLevel, measurement, measurementPlan } = trace.decision;
  if (!claimLevels.has(claimLevel)) return fail("AS-US-001-INVALID-CLAIM-LEVEL");
  if (!asset || !assetKinds.has(asset.kind) || typeof asset.authorityPath !== "string" || !asset.authorityPath.trim()
      || typeof asset.inputFingerprint !== "string" || !hash.test(asset.inputFingerprint)
      || !Array.isArray(asset.validatorEvidence) || asset.validatorEvidence.length === 0
      || asset.validatorEvidence.some(value => typeof value !== "string" || !value.trim())) return fail("AS-US-001-INVALID-ASSET");
  if (application?.productionPathChanged !== true || !Array.isArray(application.consumerEvidence)
      || application.consumerEvidence.length === 0
      || application.consumerEvidence.some(value => typeof value !== "string" || !value.trim())) return fail("AS-US-001-NOT-APPLIED");
  if (claimLevel === "structured-and-applied") {
    if (measurement !== undefined) return fail("AS-US-001-CLAIM-EVIDENCE-MISMATCH");
    if (!measurementPlan || !metrics.has(measurementPlan.metric)
        || typeof measurementPlan.measurementCommand !== "string" || !measurementPlan.measurementCommand.trim()
        || !Array.isArray(measurementPlan.baselineEvidence) || measurementPlan.baselineEvidence.length === 0
        || measurementPlan.baselineEvidence.some(value => typeof value !== "string" || !value.trim())
        || !Array.isArray(measurementPlan.candidateEvidence) || measurementPlan.candidateEvidence.length === 0
        || measurementPlan.candidateEvidence.some(value => typeof value !== "string" || !value.trim())
        || !hash.test(measurementPlan.measuredInputFingerprint ?? "")) return fail("AS-US-001-INVALID-MEASUREMENT-PLAN");
    if (asset.inputFingerprint.toLowerCase() !== measurementPlan.measuredInputFingerprint.toLowerCase()) return fail("AS-US-001-INPUT-DRIFT");
    if (!validOrchestratorEvidence(trace.orchestratorEvidence, asset.inputFingerprint, claimLevel)) {
      return fail("AS-US-001-INVALID-ORCHESTRATOR-EVIDENCE");
    }
    return { allowed: true, code: "AS-US-001-STRUCTURED-AND-APPLIED" };
  }

  if (measurementPlan !== undefined) return fail("AS-US-001-CLAIM-EVIDENCE-MISMATCH");
  if (!measurement || !metrics.has(measurement.metric) || !Number.isFinite(measurement.before)
      || !Number.isFinite(measurement.after) || measurement.before < 0 || measurement.after < 0
      || !hash.test(measurement.measuredInputFingerprint ?? "")
      || typeof measurement.command !== "string" || !measurement.command.trim()
      || !hash.test(measurement.outputSha256 ?? "")) return fail("AS-US-001-INVALID-MEASUREMENT");
  if (asset.inputFingerprint.toLowerCase() !== measurement.measuredInputFingerprint.toLowerCase()) return fail("AS-US-001-INPUT-DRIFT");
  if (measurement.after >= measurement.before) return fail("AS-US-001-NO-MEASURED-IMPROVEMENT");
  if (!validOrchestratorEvidence(trace.orchestratorEvidence, asset.inputFingerprint, claimLevel)) {
    return fail("AS-US-001-INVALID-ORCHESTRATOR-EVIDENCE");
  }
  const measurementReceiptMatches = trace.orchestratorEvidence.executedCommands.some(value =>
    value.purpose === "measurement"
      && value.command === measurement.command
      && value.outputSha256.toLowerCase() === measurement.outputSha256.toLowerCase());
  if (!measurementReceiptMatches) return fail("AS-US-001-MEASUREMENT-RECEIPT-MISMATCH");
  return { allowed: true, code: "AS-US-001-STRUCTURED-IMPROVEMENT" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const traceIndex = process.argv.indexOf("--trace");
  if (traceIndex < 0 || !process.argv[traceIndex + 1]) {
    process.stderr.write("AS-US-001 requires --trace <path>\n");
    process.exit(64);
  }
  const tracePath = process.argv[traceIndex + 1];
  const result = evaluateUnstructuredToStructured(JSON.parse(readFileSync(tracePath === "-" ? 0 : tracePath, "utf8")));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.allowed) process.exitCode = 2;
}
