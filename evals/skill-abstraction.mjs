import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { isPassingSkillEvaluation, isSkillPrivacySafe } from "./skill-lifecycle.mjs";

const hash = /^[a-f0-9]{64}$/i;
const slug = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const semver = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const safeLocator = /^(?:(?:artifact|file):\/\/\S+|https:\/\/\S+|urn:\S+)$/;
const signalKinds = new Set(["correction", "repeated-failure", "manual-judgment", "successful-pattern"]);
const levels = new Set(["local", "project", "cross-project", "general-method"]);
const shareable = new Set(["cross-project", "general-method"]);
const minimumDomains = { "cross-project": 2, "general-method": 3 };
const text = value => typeof value === "string" && value.trim().length > 0;
const evidence = value => Array.isArray(value) && value.length > 0 && value.every(text);
const fail = code => ({ allowed: false, code });
const sha256 = value => createHash("sha256").update(value).digest("hex");
const sortJson = value => Array.isArray(value)
  ? value.map(sortJson)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sortJson(value[key])]))
    : value;
export const canonicalizeEvaluationPayload = value => JSON.stringify(sortJson(value));

const validSignal = signal => signal
  && text(signal.id)
  && signal.durable === true
  && signal.machineDecidable === true
  && Array.isArray(signal.sourceSignals) && signal.sourceSignals.length > 0
  && signal.sourceSignals.every(value => signalKinds.has(value?.kind)
    && safeLocator.test(value.locator ?? "")
    && !value.locator.split("/").includes("..")
    && !hasObviousSensitiveText(value.locator));

const validClassification = classification => classification
  && levels.has(classification.level)
  && Array.isArray(classification.independentDomains)
  && new Set(classification.independentDomains).size === classification.independentDomains.length
  && classification.independentDomains.every(text)
  && evidence(classification.evidence);

const hasObviousSensitiveText = value => [
  /\b[A-Za-z]:[\\/]/,
  /(?:^|\s)\/(?:Users|home)\//,
  /\b(?:api[_-]?key|password|secret|bearer)\s*[:=]/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
].some(pattern => pattern.test(value));

const validSynthesis = synthesis => {
  if (!synthesis || synthesis.generatedBy !== "agentic-shaping-skill-synthesizer"
      || !slug.test(synthesis.slug ?? "") || !semver.test(synthesis.version ?? "")
      || !text(synthesis.description) || synthesis.description.length < 10 || synthesis.description.length > 500
      || !text(synthesis.skillMarkdown)
      || !/^[A-Za-z0-9.+-]+$/.test(synthesis.license ?? "")
      || synthesis.sourceLicense !== synthesis.license
      || synthesis.visibility !== "registry-candidate"
      || !validProvenance(synthesis.provenance)
      || !validPlatforms(synthesis.verifiedPlatforms)
      || !(synthesis.supportingFilesJson === null || typeof synthesis.supportingFilesJson === "string")
      || !hash.test(synthesis.preparedContentHash ?? "") || !hash.test(synthesis.privacyScanSha256 ?? "")
      || synthesis.projectIdentifiersRemaining !== 0 || synthesis.personalReferencesRemaining !== 0
      || !text(synthesis.structuredAssetPlan) || !text(synthesis.evaluationContract)
      || !evidence(synthesis.prepareEvidence)) return false;
  if (synthesis.packageIdentity !== `dev.slogs.skills.${synthesis.slug}/${synthesis.version}/${synthesis.preparedContentHash.toLowerCase()}`) return false;
  if (hasObviousSensitiveText(`${synthesis.description}\n${synthesis.skillMarkdown}`)) return false;
  const frontmatterName = synthesis.skillMarkdown.match(/^---\s*\n[\s\S]*?^name:\s*([^\n]+)\s*$/m)?.[1]?.trim();
  if (frontmatterName !== synthesis.slug) return false;
  if (synthesis.supportingFilesJson !== null) {
    try {
      const files = JSON.parse(synthesis.supportingFilesJson);
      if (!Array.isArray(files) || files.some(file => !text(file?.path) || !text(file?.content)
          || file.path.startsWith("/") || file.path.includes("\\")
          || file.path.split("/").some(segment => !segment || segment === "." || segment === ".."))) return false;
      if (new Set(files.map(file => file.path)).size !== files.length) return false;
      if (files.some(file => hasObviousSensitiveText(file.content))) return false;
    } catch {
      return false;
    }
  }
  return true;
};

function validProvenance(value) {
  return value && ["original", "adapted"].includes(value.sourceType)
    && text(value.sourceLocator) && !hasObviousSensitiveText(value.sourceLocator)
    && hash.test(value.sourceSha256 ?? "") && value.licenseVerified === true
    && text(value.licenseEvidenceLocator) && !hasObviousSensitiveText(value.licenseEvidenceLocator)
    && hash.test(value.licenseEvidenceSha256 ?? "");
}

function validPlatforms(values) {
  return Array.isArray(values) && values.length > 0
    && new Set(values.map(value => value.platform)).size === values.length
    && values.every(value => ["windows", "linux", "macos"].includes(value.platform)
      && text(value.suiteId) && text(value.evidenceLocator) && hash.test(value.evidenceSha256 ?? ""));
}

const candidateEvidence = trace => ({
  ruleId: "AS-SK-001",
  traceAuthority: "orchestrator",
  abstractionLevel: trace.classification.level,
  reusableAcrossProjects: true,
  generalized: true,
  sourceSignals: trace.signal.sourceSignals,
  structuredAssetPlan: trace.synthesis.structuredAssetPlan,
  evaluationContract: trace.synthesis.evaluationContract,
  privacy: trace.privacy
});

export function evaluateSkillAbstraction(trace) {
  if (!trace || trace.ruleId !== "AS-SA-001" || trace.traceAuthority !== "orchestrator"
      || !Array.isArray(trace.forbiddenActions) || !validSignal(trace.signal)
      || !validClassification(trace.classification)) return fail("AS-SA-001-INVALID-TRACE");
  if (trace.forbiddenActions.length > 0) return fail("AS-SA-001-FORBIDDEN-ACTION");
  if (!isSkillPrivacySafe(trace.privacy)) return fail("AS-SA-001-PRIVATE-SOURCE-BLOCKED");
  if (!shareable.has(trace.classification.level)) return fail("AS-SA-001-PROJECT-SPECIFIC-BLOCKED");
  if (trace.classification.independentDomains.length < minimumDomains[trace.classification.level]) {
    return fail("AS-SA-001-INSUFFICIENT-GENERALIZATION");
  }
  if (!validSynthesis(trace.synthesis)) return fail("AS-SA-001-SYNTHESIS-INVALID");
  if (!isPassingSkillEvaluation(trace.evaluation)) return fail("AS-SA-001-EVALUATION-FAILED");
  if (!trace.evaluationPayload || typeof trace.evaluationPayload !== "object" || Array.isArray(trace.evaluationPayload)
      || sha256(canonicalizeEvaluationPayload(trace.evaluationPayload)) !== trace.evaluation.outputSha256.toLowerCase()) {
    return fail("AS-SA-001-EVALUATION-PAYLOAD-MISMATCH");
  }
  return { allowed: true, code: "AS-SA-001-VALIDATED-CANDIDATE-READY" };
}

export function buildSkillCandidateRegistration(trace) {
  const verdict = evaluateSkillAbstraction(trace);
  if (!verdict.allowed) return { ...verdict, request: null };
  return {
    ...verdict,
    request: {
      tool: "skill_registry_submit_candidate",
      arguments: {
        slug: trace.synthesis.slug,
        version: trace.synthesis.version,
        description: trace.synthesis.description,
        skillMarkdown: trace.synthesis.skillMarkdown,
        license: trace.synthesis.license,
        visibility: trace.synthesis.visibility,
        provenanceJson: JSON.stringify(trace.synthesis.provenance),
        verifiedPlatformsJson: JSON.stringify(trace.synthesis.verifiedPlatforms),
        supportingFilesJson: trace.synthesis.supportingFilesJson,
        candidateEvidenceJson: JSON.stringify(candidateEvidence(trace)),
        validationReportJson: JSON.stringify(trace.evaluation),
        evaluationPayloadJson: canonicalizeEvaluationPayload(trace.evaluationPayload),
        expectedContentHash: trace.synthesis.preparedContentHash
      },
      expectedResult: {
        registry: "slogs-skill-registry",
        status: "validated-candidate",
        packageIdentity: trace.synthesis.packageIdentity
      }
    }
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf("--trace");
  if (index < 0 || !process.argv[index + 1]) {
    process.stderr.write("AS-SA-001 requires --trace <path>\n");
    process.exit(64);
  }
  const result = buildSkillCandidateRegistration(JSON.parse(readFileSync(process.argv[index + 1], "utf8")));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.allowed) process.exitCode = 2;
}
