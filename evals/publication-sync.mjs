import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const levels = new Set(["patch", "minor", "major"]);
const locales = ["en", "ko", "ja", "zh"];
const kinds = ["homepage", "readme"];
const technicalKinds = new Set(["compatibility", "contracts", "verification", "known-limitation"]);
const parallelBranches = new Set(["policy", "evaluation", ...kinds.flatMap(kind => locales.map(locale => `${kind}:${locale}`))]);
const versionPattern = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const hash = /^[a-f0-9]{64}$/i;
const text = value => typeof value === "string" && value.trim().length > 0;
const evidence = value => Array.isArray(value) && value.length > 0 && value.every(text);
const fail = code => ({ allowed: false, code });

const nextVersion = (previous, level) => {
  const match = versionPattern.exec(previous ?? "");
  if (!match) return null;
  const [major, minor, patch] = match.slice(1).map(Number);
  if (level === "patch") return `${major}.${minor}.${patch + 1}`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  if (level === "major") return `${major + 1}.0.0`;
  return null;
};

export function evaluatePublicationSync(trace) {
  if (!trace || trace.ruleId !== "AS-PS-001" || trace.traceAuthority !== "orchestrator"
      || !Array.isArray(trace.forbiddenActions) || !levels.has(trace.change?.level)
      || trace.change.policyChanged !== true || trace.change.evaluationChanged !== true
      || !versionPattern.test(trace.change.previousVersion ?? "")
      || !versionPattern.test(trace.change.nextVersion ?? "")) return fail("AS-PS-001-INVALID-TRACE");
  if (trace.forbiddenActions.length > 0) return fail("AS-PS-001-FORBIDDEN-ACTION");
  if (trace.change.nextVersion !== nextVersion(trace.change.previousVersion, trace.change.level)) {
    return fail("AS-PS-001-SEMVER-MISMATCH");
  }
  if (trace.syncExecution?.mode !== "parallel-independent" || !Array.isArray(trace.syncExecution.branches)
      || new Set(trace.syncExecution.branches).size !== parallelBranches.size
      || [...parallelBranches].some(branch => !trace.syncExecution.branches.includes(branch))
      || !evidence(trace.syncExecution.evidence)) return fail("AS-PS-001-PARALLEL-SYNC-MISSING");

  const authority = trace.authority;
  if (!authority || !text(authority.policyVersion) || !text(authority.ruleId)
      || !Number.isInteger(authority.passed) || !Number.isInteger(authority.total)
      || authority.passed !== authority.total || !text(authority.status) || !text(authority.limitation)
      || !evidence(authority.manifestEvidence) || !evidence(authority.evaluationEvidence)) {
    return fail("AS-PS-001-INVALID-AUTHORITY");
  }

  if (!Array.isArray(trace.surfaces) || trace.surfaces.length !== 8) return fail("AS-PS-001-SURFACE-MATRIX-MISSING");
  const expectedKeys = new Set(kinds.flatMap(kind => locales.map(locale => `${kind}:${locale}`)));
  const actualKeys = new Set(trace.surfaces.map(surface => `${surface.kind}:${surface.locale}`));
  if (actualKeys.size !== 8 || [...expectedKeys].some(key => !actualKeys.has(key))) return fail("AS-PS-001-SURFACE-MATRIX-MISSING");
  for (const surface of trace.surfaces) {
    if (!text(surface.path) || !hash.test(surface.contentSha256 ?? "")
        || surface.version !== trace.change.nextVersion
        || surface.policyVersion !== authority.policyVersion
        || surface.ruleId !== authority.ruleId
        || surface.passed !== authority.passed || surface.total !== authority.total
        || surface.status !== authority.status || surface.limitation !== authority.limitation) {
      return fail("AS-PS-001-PUBLICATION-DRIFT");
    }
  }

  const changelog = trace.changelog;
  if (!changelog || changelog.version !== trace.change.nextVersion || !/^\d{4}-\d{2}-\d{2}$/.test(changelog.date ?? "")
      || !Number.isInteger(changelog.userChangeBullets) || changelog.userChangeBullets < 4 || changelog.userChangeBullets > 6
      || !Array.isArray(changelog.technicalNoteKinds)
      || new Set(changelog.technicalNoteKinds).size !== technicalKinds.size
      || [...technicalKinds].some(kind => !changelog.technicalNoteKinds.includes(kind))
      || !evidence(changelog.evidence)) return fail("AS-PS-001-CHANGELOG-INCOMPLETE");

  const regression = trace.staticRegression;
  if (!regression || regression.generation !== true || regression.links !== true
      || regression.localization !== true || regression.contracts !== true
      || !evidence(regression.evidence)) return fail("AS-PS-001-STATIC-REGRESSION-MISSING");
  return { allowed: true, code: "AS-PS-001-SYNCHRONIZED" };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf("--trace");
  if (index < 0 || !process.argv[index + 1]) {
    process.stderr.write("AS-PS-001 requires --trace <path>\n");
    process.exit(64);
  }
  const result = evaluatePublicationSync(JSON.parse(readFileSync(process.argv[index + 1], "utf8")));
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.allowed) process.exitCode = 2;
}
