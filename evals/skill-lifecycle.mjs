import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const hash = /^[a-f0-9]{64}$/i;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const semver = /^\d+\.\d+\.\d+$/;
const caseKinds = new Set(["normal", "boundary", "negative-control"]);
const phases = new Set(["discovery", "promotion", "resolution"]);
const scopes = new Set(["project", "global", "disabled"]);
const fail = code => ({ allowed: false, code });
const text = value => typeof value === "string" && value.trim().length > 0;
const evidence = value => Array.isArray(value) && value.length > 0 && value.every(text);
const artifactEvidence = value => Array.isArray(value) && value.length > 0
  && value.every(item => text(item?.locator) && hash.test(item?.sha256 ?? ""));

const validCandidate = candidate => candidate
  && slug.test(candidate.slug ?? "")
  && semver.test(candidate.version ?? "")
  && hash.test(candidate.contentHash ?? "")
  && candidate.reusableAcrossProjects === true
  && candidate.generalized === true
  && Array.isArray(candidate.sourceSignals) && candidate.sourceSignals.length > 0
  && candidate.sourceSignals.every(value => text(value?.kind) && text(value?.locator))
  && text(candidate.structuredAssetPlan)
  && text(candidate.evaluationContract);

export const isSkillPrivacySafe = privacy => privacy
  && privacy.containsPersonalMemory === false
  && privacy.containsProjectConfidential === false
  && privacy.containsCredential === false
  && privacy.containsSecret === false
  && privacy.generalizationVerified === true
  && artifactEvidence(privacy.evidence);

export const isPassingSkillEvaluation = evaluation => {
  if (!evaluation || !text(evaluation.suiteId) || !text(evaluation.evaluatorVersion)
      || evaluation.frozenBeforeRun !== true || !hash.test(evaluation.outputSha256 ?? "")
      || !Number.isInteger(evaluation.passed) || !Number.isInteger(evaluation.total)
      || evaluation.total < 1 || evaluation.passed !== evaluation.total
      || evaluation.forbiddenActions !== 0 || !artifactEvidence(evaluation.artifactEvidence)
      || !Array.isArray(evaluation.caseResults)) return false;
  const kinds = new Set(evaluation.caseResults.map(value => value.kind));
  if (kinds.size !== caseKinds.size || [...caseKinds].some(kind => !kinds.has(kind))) return false;
  if (evaluation.caseResults.some(value => !caseKinds.has(value.kind)
      || !Number.isInteger(value.passed) || !Number.isInteger(value.total)
      || value.total < 1 || value.passed !== value.total)) return false;
  const totals = evaluation.caseResults.reduce((sum, value) => sum + value.total, 0);
  const passed = evaluation.caseResults.reduce((sum, value) => sum + value.passed, 0);
  return totals === evaluation.total && passed === evaluation.passed;
};

const validPublication = (publication, candidate, evaluation) => publication
  && publication.registry === "slogs-skill-registry"
  && publication.status === "validated"
  && publication.slug === candidate.slug
  && publication.version === candidate.version
  && publication.contentHash?.toLowerCase() === candidate.contentHash.toLowerCase()
  && text(publication.publishedBy)
  && hash.test(publication.validationReportHash ?? "")
  && publication.validationReportHash.toLowerCase() === evaluation.outputSha256.toLowerCase();

const validSelection = selection => selection
  && selection.firstUseDecisionRequired === false
  && selection.choicePrompted === true
  && scopes.has(selection.scopeKind)
  && typeof selection.autoUpdate === "boolean"
  && evidence(selection.decisionEvidence)
  && (selection.scopeKind !== "project" || text(selection.projectKey))
  && (selection.scopeKind === "project" || selection.projectKey === undefined)
  && !(selection.autoUpdate && selection.pinnedVersion !== undefined)
  && (selection.pinnedVersion === undefined || semver.test(selection.pinnedVersion));

export function evaluateSkillLifecycle(trace) {
  if (!trace || trace.ruleId !== "AS-SK-001" || trace.traceAuthority !== "orchestrator"
      || !phases.has(trace.phase) || !Array.isArray(trace.forbiddenActions)) return fail("AS-SK-001-INVALID-TRACE");
  if (trace.forbiddenActions.length > 0) return fail("AS-SK-001-FORBIDDEN-ACTION");
  if (!validCandidate(trace.candidate)) return fail("AS-SK-001-INVALID-CANDIDATE");
  if (!isSkillPrivacySafe(trace.privacy)) return fail("AS-SK-001-PRIVATE-SOURCE-BLOCKED");

  if (trace.phase === "discovery") {
    if (trace.evaluation || trace.publication || trace.selection || trace.resolution || trace.packageContentReleased === true) {
      return fail("AS-SK-001-DISCOVERY-SCOPE-EXPANDED");
    }
    return { allowed: true, code: "AS-SK-001-CANDIDATE-DISCOVERED" };
  }

  if (!isPassingSkillEvaluation(trace.evaluation)) return fail("AS-SK-001-EVALUATION-FAILED");
  if (!validPublication(trace.publication, trace.candidate, trace.evaluation)) return fail("AS-SK-001-PUBLICATION-MISMATCH");
  if (trace.phase === "promotion") {
    if (trace.selection || trace.resolution || trace.packageContentReleased === true) return fail("AS-SK-001-PROMOTION-SCOPE-EXPANDED");
    return { allowed: true, code: "AS-SK-001-PROMOTED" };
  }

  if (trace.selection?.firstUseDecisionRequired === true) {
    if (trace.packageContentReleased === true || trace.resolution?.contentReleased === true) {
      return fail("AS-SK-001-FIRST-USE-BYPASSED");
    }
    return { allowed: true, code: "AS-SK-001-FIRST-USE-DECISION-REQUIRED" };
  }
  if (!validSelection(trace.selection)) return fail("AS-SK-001-INVALID-SCOPE-SELECTION");

  if (trace.selection.scopeKind === "disabled") {
    if (trace.packageContentReleased === true || trace.resolution?.contentReleased === true) return fail("AS-SK-001-DISABLED-SKILL-RELEASED");
    return { allowed: true, code: "AS-SK-001-DISABLED" };
  }

  const resolution = trace.resolution;
  if (!resolution || resolution.registry !== "slogs-skill-registry" || resolution.status !== "validated"
      || !semver.test(resolution.latestValidatedVersion ?? "")
      || !semver.test(resolution.resolvedVersion ?? "") || !hash.test(resolution.resolvedContentHash ?? "")
      || resolution.contentReleased !== true || trace.packageContentReleased !== true
      || !evidence(resolution.registryEvidence)) return fail("AS-SK-001-INVALID-RESOLUTION");
  const expectedVersion = trace.selection.autoUpdate
    ? resolution.latestValidatedVersion
    : (trace.selection.pinnedVersion ?? trace.publication.version);
  if (resolution.resolvedVersion !== expectedVersion) return fail("AS-SK-001-STALE-OR-WRONG-VERSION");
  if (resolution.resolvedVersion === trace.publication.version
      && resolution.resolvedContentHash.toLowerCase() !== trace.publication.contentHash.toLowerCase()) {
    return fail("AS-SK-001-CONTENT-HASH-MISMATCH");
  }
  return { allowed: true, code: trace.selection.autoUpdate ? "AS-SK-001-LATEST-RESOLVED" : "AS-SK-001-PINNED-RESOLVED" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf("--trace");
  if (index < 0 || !process.argv[index + 1]) {
    process.stderr.write("AS-SK-001 requires --trace <path>\n");
    process.exit(64);
  }
  const result = evaluateSkillLifecycle(JSON.parse(readFileSync(process.argv[index + 1], "utf8")));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.allowed) process.exitCode = 2;
}
