import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join, relative, resolve } from "node:path";
import { buildSkillCandidateRegistration, canonicalizeEvaluationPayload } from "./skill-abstraction.mjs";

const shaA = "a".repeat(64);
const shaE = "e".repeat(64);
const evaluationPayload = { cases: ["normal", "boundary", "negative-control"], runId: "isolated-eval-001" };
const shaD = createHash("sha256").update(canonicalizeEvaluationPayload(evaluationPayload)).digest("hex");
const skillMarkdown = `---
name: reusable-check
description: Validate reusable engineering checks across projects.
---

Apply the structured check only when its trigger and evidence requirements match.
`;

const evaluation = () => ({
  suiteId: "reusable-check-v1",
  evaluatorVersion: "1.0.0",
  frozenBeforeRun: true,
  caseResults: [
    { kind: "normal", passed: 2, total: 2 },
    { kind: "boundary", passed: 2, total: 2 },
    { kind: "negative-control", passed: 2, total: 2 }
  ],
  passed: 6,
  total: 6,
  forbiddenActions: 0,
  artifactEvidence: [{ locator: "evaluation/output.json", sha256: shaD }],
  outputSha256: shaD
});

const make = level => ({
  ruleId: "AS-SA-001",
  traceAuthority: "orchestrator",
  signal: {
    id: "signal-001",
    durable: true,
    machineDecidable: true,
    sourceSignals: [{ kind: "correction", locator: "artifact://generalized-signal/terminology-001" }]
  },
  classification: {
    level,
    independentDomains: level === "general-method"
      ? ["documentation", "ui-copy", "release-reporting"]
      : ["documentation", "ui-copy"],
    evidence: ["classification/frozen-cases.json#sha256=eeee"]
  },
  privacy: {
    containsPersonalMemory: false,
    containsProjectConfidential: false,
    containsCredential: false,
    containsSecret: false,
    generalizationVerified: true,
    evidence: [{ locator: "artifact://privacy/scan.json", sha256: shaE }]
  },
  synthesis: {
    generatedBy: "agentic-shaping-skill-synthesizer",
    slug: "reusable-check",
    version: "1.0.0",
    description: "Validate reusable engineering checks across projects.",
    skillMarkdown,
    license: "MIT",
    sourceLicense: "MIT",
    visibility: "registry-candidate",
    provenance: {
      sourceType: "original", sourceLocator: "urn:agentic-shaping:reusable-check-v1", sourceSha256: shaE,
      licenseVerified: true, licenseEvidenceLocator: "urn:agentic-shaping:license:MIT", licenseEvidenceSha256: shaE
    },
    verifiedPlatforms: [{ platform: "windows", suiteId: "reusable-check-windows-v1", evidenceLocator: "evaluation/windows.json", evidenceSha256: shaD }],
    supportingFilesJson: JSON.stringify([{ path: "references/contract.md", content: "Use frozen evidence and fail closed.\n" }]),
    preparedContentHash: shaA,
    packageIdentity: `dev.slogs.skills.reusable-check/1.0.0/${shaA}`,
    structuredAssetPlan: "skills/reusable-check/SKILL.md",
    evaluationContract: "evals/reusable-check-v1.json",
    projectIdentifiersRemaining: 0,
    personalReferencesRemaining: 0,
    privacyScanSha256: shaE,
    prepareEvidence: ["skill_registry_prepare contentHash=aaaaaaaa"]
  },
  evaluation: evaluation(),
  evaluationPayload: structuredClone(evaluationPayload),
  forbiddenActions: []
});

const templates = {
  local: () => make("local"),
  project: () => make("project"),
  "cross-project": () => make("cross-project"),
  "general-method": () => make("general-method")
};

const setPath = (target, path, value) => {
  const parts = path.split(".");
  const last = parts.pop();
  let cursor = target;
  for (const part of parts) cursor = cursor[part];
  cursor[last] = value;
};

const suite = JSON.parse(readFileSync(new URL("./skill-abstraction-traces.json", import.meta.url), "utf8"));
const contract = JSON.parse(readFileSync(new URL("./skill-abstraction-contract.json", import.meta.url), "utf8"));
const schema = JSON.parse(readFileSync(new URL("./skill-abstraction-trace.schema.json", import.meta.url), "utf8"));
if (suite.ruleId !== "AS-SA-001" || contract.ruleId !== suite.ruleId || contract.schemaVersion !== 2
    || schema.properties?.ruleId?.const !== suite.ruleId
    || contract.submissionTool !== "skill_registry_submit_candidate"
    || contract.submissionStatus !== "validated-candidate") throw new Error("AS-SA-001 contract, schema, and suite mismatch");

const direct = spawnSync(process.execPath, [resolve(import.meta.dirname, "skill-abstraction.mjs")], { encoding: "utf8" });
if (direct.status !== 64 || !(direct.stdout + direct.stderr).includes("--trace <path>")) {
  throw new Error(`AS-SA-001 runtime did not fail closed without trace: ${direct.status}`);
}

let passed = 0;
for (const testCase of suite.cases) {
  const trace = templates[testCase.trace.template]();
  for (const [path, value] of Object.entries(testCase.trace.set ?? {})) setPath(trace, path, value);
  if (testCase.trace.removeCaseKind) {
    trace.evaluation.caseResults = trace.evaluation.caseResults.filter(value => value.kind !== testCase.trace.removeCaseKind);
    trace.evaluation.passed = trace.evaluation.caseResults.reduce((sum, value) => sum + value.passed, 0);
    trace.evaluation.total = trace.evaluation.caseResults.reduce((sum, value) => sum + value.total, 0);
  }
  const actual = buildSkillCandidateRegistration(trace);
  if (actual.allowed !== testCase.expected.allowed || actual.code !== testCase.expected.code
      || Boolean(actual.request) !== testCase.expected.request) {
    throw new Error(`${testCase.id}: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}`);
  }
  if (actual.request) {
    const args = actual.request.arguments;
    const candidate = JSON.parse(args.candidateEvidenceJson);
    const validation = JSON.parse(args.validationReportJson);
    if (actual.request.tool !== "skill_registry_submit_candidate"
        || actual.request.expectedResult.status !== "validated-candidate"
        || actual.request.expectedResult.packageIdentity !== trace.synthesis.packageIdentity
        || args.expectedContentHash !== trace.synthesis.preparedContentHash
        || args.license !== trace.synthesis.license
        || args.visibility !== "registry-candidate"
        || JSON.parse(args.verifiedPlatformsJson).length !== 1
        || JSON.parse(args.provenanceJson).licenseVerified !== true
        || createHash("sha256").update(args.evaluationPayloadJson).digest("hex") !== validation.outputSha256
        || candidate.abstractionLevel !== trace.classification.level
        || candidate.privacy.containsPersonalMemory !== false
        || validation.passed !== validation.total
        || validation.caseResults.length !== 3) {
      throw new Error(`${testCase.id}: generated Slogs request does not match the API contract`);
    }
  }
  passed++;
}

const terminologyRoot = "C:\\Users\\dimohy\\.codex-b\\skills\\korean-software-terminology";
if (existsSync(terminologyRoot)) {
  const actual = make("cross-project");
  actual.synthesis.slug = "korean-software-terminology";
  actual.synthesis.version = "0.1.0";
  actual.synthesis.description = "Choose and validate natural Korean terminology for software documentation and UI copy.";
  actual.synthesis.skillMarkdown = readFileSync(join(terminologyRoot, "SKILL.md"), "utf8");
  actual.synthesis.packageIdentity = `dev.slogs.skills.korean-software-terminology/0.1.0/${shaA}`;
  actual.synthesis.structuredAssetPlan = "skills/korean-software-terminology/SKILL.md";
  actual.synthesis.verifiedPlatforms = [{
    platform: "windows", suiteId: "korean-software-terminology-windows-v1",
    evidenceLocator: "evaluation/windows-validation.json", evidenceSha256: shaD
  }];
  const supportingFiles = readdirSync(terminologyRoot, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => join(entry.parentPath, entry.name))
    .filter(path => !path.endsWith("SKILL.md") && !path.endsWith("skill-package.json") && !path.includes("__pycache__"))
    .map(path => ({ path: relative(terminologyRoot, path).replaceAll("\\", "/"), content: readFileSync(path, "utf8") }));
  actual.synthesis.supportingFilesJson = JSON.stringify(supportingFiles);
  const result = buildSkillCandidateRegistration(actual);
  if (!result.allowed || JSON.parse(result.request.arguments.verifiedPlatformsJson).map(value => value.platform).join(",") !== "windows") {
    throw new Error(`actual korean terminology package regression failed: ${JSON.stringify(result)}`);
  }
}

process.stdout.write(`AS-SA-001 skill abstraction PASS ${passed}/${suite.cases.length}\n`);
