import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { evaluatePublicationSync } from "./publication-sync.mjs";

const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(join(root, path), "utf8");
const sha256 = value => createHash("sha256").update(value).digest("hex");
const hash = "a".repeat(64);

const baseTrace = level => {
  const versions = {
    patch: ["0.2.0", "0.2.1"],
    minor: ["0.2.0", "0.3.0"],
    major: ["0.2.0", "1.0.0"]
  };
  const [previousVersion, nextVersion] = versions[level];
  const authority = {
    policyVersion: "2026.09.04.2", ruleId: "AS-SA-001", passed: 19, total: 19,
    status: "structured-and-applied", limitation: "operational-slogs-mcp-not-deployed",
    manifestEvidence: ["site/release-manifest.json"], evaluationEvidence: ["AS-SA-001 PASS 19/19"]
  };
  return {
    ruleId: "AS-PS-001", traceAuthority: "orchestrator",
    change: { level, previousVersion, nextVersion, policyChanged: true, evaluationChanged: true },
    authority,
    syncExecution: {
      mode: "parallel-independent",
      branches: ["policy", "evaluation", ...["homepage", "readme"].flatMap(kind => ["en", "ko", "ja", "zh"].map(locale => `${kind}:${locale}`))],
      evidence: ["parallel localization branches and independent policy/evaluation work"]
    },
    surfaces: ["homepage", "readme"].flatMap(kind => ["en", "ko", "ja", "zh"].map(locale => ({
      kind, locale, path: `${kind}/${locale}`, version: nextVersion, policyVersion: authority.policyVersion,
      ruleId: authority.ruleId, passed: authority.passed, total: authority.total,
      status: authority.status, limitation: authority.limitation, contentSha256: hash
    }))),
    changelog: {
      version: nextVersion, date: "2026-09-04", userChangeBullets: 5,
      technicalNoteKinds: ["compatibility", "contracts", "verification", "known-limitation"],
      evidence: ["CHANGELOG.md"]
    },
    staticRegression: { generation: true, links: true, localization: true, contracts: true, evidence: ["static checks"] },
    forbiddenActions: []
  };
};

const setPath = (target, path, value) => {
  if (path.includes(".*.")) {
    const [arrayName, property] = path.split(".*.");
    for (const item of target[arrayName]) item[property] = value;
    return;
  }
  const parts = path.split(".");
  const last = parts.pop();
  let cursor = target;
  for (const part of parts) cursor = cursor[Number.isInteger(Number(part)) && part !== "" ? Number(part) : part];
  cursor[last] = value;
};

const suite = JSON.parse(readFileSync(new URL("./publication-sync-traces.json", import.meta.url), "utf8"));
const contract = JSON.parse(readFileSync(new URL("./publication-sync-contract.json", import.meta.url), "utf8"));
const schema = JSON.parse(readFileSync(new URL("./publication-sync-trace.schema.json", import.meta.url), "utf8"));
if (suite.ruleId !== "AS-PS-001" || contract.ruleId !== suite.ruleId || contract.schemaVersion !== 1
    || schema.properties?.ruleId?.const !== suite.ruleId) throw new Error("AS-PS-001 contract, schema, and suite mismatch");

let passed = 0;
for (const testCase of suite.cases) {
  const trace = baseTrace(testCase.trace.template);
  for (const [path, value] of Object.entries(testCase.trace.set ?? {})) setPath(trace, path, value);
  if (testCase.trace.removeSurface) {
    trace.surfaces = trace.surfaces.filter(surface => `${surface.kind}:${surface.locale}` !== testCase.trace.removeSurface);
  }
  const actual = evaluatePublicationSync(trace);
  if (actual.allowed !== testCase.expected.allowed || actual.code !== testCase.expected.code) {
    throw new Error(`${testCase.id}: expected ${JSON.stringify(testCase.expected)}, got ${JSON.stringify(actual)}`);
  }
  passed++;
}

const release = JSON.parse(read("site/release-manifest.json"));
const expectedMarker = `${release.contractId};version=${release.version};policy=${release.policyVersion};${release.feature.ruleId}=${release.feature.passed}/${release.feature.total};status=${release.feature.status};limitation=${release.feature.limitation}`;
const surfaceDefinitions = [
  ["homepage", "en", "index.html"], ["homepage", "ko", "ko/index.html"],
  ["homepage", "ja", "ja/index.html"], ["homepage", "zh", "zh/index.html"],
  ["readme", "en", "README.md"], ["readme", "ko", "README.ko.md"],
  ["readme", "ja", "README.ja.md"], ["readme", "zh", "README.zh-CN.md"]
];
const surfaces = surfaceDefinitions.map(([kind, locale, path]) => {
  const content = read(path);
  if (!content.includes(expectedMarker)) throw new Error(`${path}: publication marker drift`);
  return {
    kind, locale, path, version: release.version, policyVersion: release.policyVersion,
    ruleId: release.feature.ruleId, passed: release.feature.passed, total: release.feature.total,
    status: release.feature.status, limitation: release.feature.limitation, contentSha256: sha256(content)
  };
});

const changelog = read("CHANGELOG.md");
const releaseSection = changelog.match(/## \[0\.3\.0\][\s\S]*?(?=\n## \[|$)/)?.[0];
if (!releaseSection) throw new Error("CHANGELOG.md: 0.3.0 release missing");
const userSection = releaseSection.match(/### What changed for users\n\n([\s\S]*?)(?=\n### )/)?.[1] ?? "";
const userBullets = (userSection.match(/^- /gm) ?? []).length;
const technicalMap = [
  ["compatibility", "- Compatibility:"], ["contracts", "- Contracts:"],
  ["verification", "- Verification:"], ["known-limitation", "- Known limitation:"]
];
const technicalNoteKinds = technicalMap.filter(([, marker]) => releaseSection.includes(marker)).map(([kind]) => kind);

const commands = [
  ["generation", [join(root, "scripts", "build-localized-content.mjs"), "--check"]],
  ["localization", [join(root, "scripts", "check-localization.mjs")]],
  ["links", [join(root, "scripts", "check-readme-prompt.mjs")]],
  ["contracts", [join(root, "evals", "verify-skill-abstraction.mjs")]]
];
const staticRegression = { evidence: [] };
for (const [kind, args] of commands) {
  const run = spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
  staticRegression[kind] = run.status === 0;
  staticRegression.evidence.push(`${kind}:exit=${run.status}:${sha256(run.stdout + run.stderr)}`);
  if (run.status !== 0) throw new Error(`${kind} static regression failed: ${run.stderr || run.stdout}`);
}

const currentTrace = {
  ruleId: "AS-PS-001", traceAuthority: "orchestrator",
  change: {
    level: release.changeLevel, previousVersion: release.previousVersion, nextVersion: release.version,
    policyChanged: true, evaluationChanged: true
  },
  authority: {
    policyVersion: release.policyVersion, ruleId: release.feature.ruleId,
    passed: release.feature.passed, total: release.feature.total,
    status: release.feature.status, limitation: release.feature.limitation,
    manifestEvidence: ["site/release-manifest.json"], evaluationEvidence: [`${release.feature.ruleId} PASS ${release.feature.passed}/${release.feature.total}`]
  },
  syncExecution: {
    mode: "parallel-independent",
    branches: ["policy", "evaluation", ...["homepage", "readme"].flatMap(kind => ["en", "ko", "ja", "zh"].map(locale => `${kind}:${locale}`))],
    evidence: ["localized catalogs generated concurrently; policy and evaluation assets independently verified"]
  },
  surfaces,
  changelog: {
    version: release.version, date: release.releaseDate, userChangeBullets: userBullets, technicalNoteKinds,
    evidence: ["CHANGELOG.md#0.3.0"]
  },
  staticRegression,
  forbiddenActions: []
};
const current = evaluatePublicationSync(currentTrace);
if (!current.allowed) throw new Error(`current publication is not synchronized: ${current.code}`);

process.stdout.write(`AS-PS-001 publication sync PASS ${passed}/${suite.cases.length}; current ${release.displayVersion} synchronized across 8 surfaces\n`);
