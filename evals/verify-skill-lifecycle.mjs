import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { evaluateSkillLifecycle } from "./skill-lifecycle.mjs";

const shaA = "a".repeat(64);
const shaC = "c".repeat(64);
const shaD = "d".repeat(64);

const candidate = () => ({
  slug: "korean-software-terminology",
  version: "1.0.0",
  contentHash: shaA,
  reusableAcrossProjects: true,
  generalized: true,
  sourceSignals: [{ kind: "correction", locator: "evaluation/case-001" }],
  structuredAssetPlan: "skills/korean-software-terminology/SKILL.md",
  evaluationContract: "evals/korean-software-terminology.json"
});

const privacy = () => ({
  containsPersonalMemory: false,
  containsProjectConfidential: false,
  containsCredential: false,
  containsSecret: false,
  generalizationVerified: true,
  evidence: [{ locator: "artifact://privacy/scan.json", sha256: shaC }]
});

const evaluation = () => ({
  suiteId: "korean-software-terminology-v1",
  evaluatorVersion: "1.0.0",
  frozenBeforeRun: true,
  caseResults: [
    { kind: "normal", passed: 2, total: 2 },
    { kind: "boundary", passed: 1, total: 1 },
    { kind: "negative-control", passed: 2, total: 2 }
  ],
  passed: 5,
  total: 5,
  forbiddenActions: 0,
  artifactEvidence: [{ locator: "evaluation/output.json", sha256: shaD }],
  outputSha256: shaD
});

const publication = () => ({
  registry: "slogs-skill-registry",
  status: "validated",
  slug: "korean-software-terminology",
  version: "1.0.0",
  contentHash: shaA,
  publishedBy: "authorized-owner",
  validationReportHash: shaD
});

const base = phase => ({
  ruleId: "AS-SK-001",
  traceAuthority: "orchestrator",
  phase,
  candidate: candidate(),
  privacy: privacy(),
  forbiddenActions: []
});

const templates = {
  discovery: () => base("discovery"),
  promotion: () => ({ ...base("promotion"), evaluation: evaluation(), publication: publication() }),
  "first-use": () => ({
    ...base("resolution"), evaluation: evaluation(), publication: publication(), packageContentReleased: false,
    selection: { firstUseDecisionRequired: true }
  }),
  "project-latest": () => ({
    ...base("resolution"), evaluation: evaluation(), publication: publication(), packageContentReleased: true,
    selection: {
      firstUseDecisionRequired: false, choicePrompted: true, scopeKind: "project", projectKey: "project/example",
      autoUpdate: true, decisionEvidence: ["explicit user scope choice event"]
    },
    resolution: {
      registry: "slogs-skill-registry", status: "validated",
      latestValidatedVersion: "1.1.0", resolvedVersion: "1.1.0", resolvedContentHash: shaC,
      contentReleased: true, registryEvidence: ["skill_registry_resolve_latest event"]
    }
  }),
  "global-latest": () => {
    const trace = templates["project-latest"]();
    trace.selection.scopeKind = "global";
    delete trace.selection.projectKey;
    return trace;
  },
  "project-pinned": () => {
    const trace = templates["project-latest"]();
    trace.selection.autoUpdate = false;
    trace.selection.pinnedVersion = "1.0.0";
    trace.resolution.resolvedVersion = "1.0.0";
    trace.resolution.resolvedContentHash = shaA;
    return trace;
  },
  disabled: () => ({
    ...base("resolution"), evaluation: evaluation(), publication: publication(), packageContentReleased: false,
    selection: {
      firstUseDecisionRequired: false, choicePrompted: true, scopeKind: "disabled", autoUpdate: false,
      decisionEvidence: ["explicit user disabled choice event"]
    }
  })
};

const setPath = (target, path, value) => {
  const parts = path.split(".");
  const last = parts.pop();
  let cursor = target;
  for (const part of parts) cursor = cursor[part];
  cursor[last] = value;
};

const deletePath = (target, path) => {
  const parts = path.split(".");
  const last = parts.pop();
  let cursor = target;
  for (const part of parts) cursor = cursor[part];
  delete cursor[last];
};

const suite = JSON.parse(readFileSync(new URL("./skill-lifecycle-traces.json", import.meta.url), "utf8"));
const contract = JSON.parse(readFileSync(new URL("./skill-lifecycle-contract.json", import.meta.url), "utf8"));
const schema = JSON.parse(readFileSync(new URL("./skill-lifecycle-trace.schema.json", import.meta.url), "utf8"));
if (suite.ruleId !== "AS-SK-001" || contract.ruleId !== suite.ruleId || contract.schemaVersion !== 3
    || schema.properties?.ruleId?.const !== suite.ruleId
    || !contract.requiredCaseKinds?.includes("negative-control")
    || !contract.scopeKinds?.includes("disabled")) throw new Error("AS-SK-001 contract, schema, and suite mismatch");

const direct = spawnSync(process.execPath, [resolve(import.meta.dirname, "skill-lifecycle.mjs")], { encoding: "utf8" });
if (direct.status !== 64 || !(direct.stdout + direct.stderr).includes("--trace <path>")) {
  throw new Error(`AS-SK-001 runtime did not fail closed without trace: ${direct.status}`);
}

let passed = 0;
for (const testCase of suite.cases) {
  const trace = templates[testCase.trace.template]();
  for (const [path, value] of Object.entries(testCase.trace.set ?? {})) setPath(trace, path, value);
  if (testCase.trace.delete) deletePath(trace, testCase.trace.delete);
  if (testCase.trace.removeCaseKind) {
    trace.evaluation.caseResults = trace.evaluation.caseResults.filter(value => value.kind !== testCase.trace.removeCaseKind);
    trace.evaluation.passed = trace.evaluation.caseResults.reduce((sum, value) => sum + value.passed, 0);
    trace.evaluation.total = trace.evaluation.caseResults.reduce((sum, value) => sum + value.total, 0);
  }
  const actual = evaluateSkillLifecycle(trace);
  if (actual.allowed !== testCase.expected.allowed || actual.code !== testCase.expected.code) {
    throw new Error(`${testCase.id}: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}`);
  }
  passed++;
}

process.stdout.write(`AS-SK-001 skill lifecycle PASS ${passed}/${suite.cases.length}\n`);
