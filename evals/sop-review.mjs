import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const hash = value => createHash("sha256").update(value, "utf8").digest("hex");
const digest = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const text = value => typeof value === "string" && value.trim().length > 0;
const compact = value => value.replace(/\s+/gu, "");
const paragraphs = value => value.trim().split(/\r?\n\s*\r?\n/u).map(v => v.trim());
export function reviewSentences(value) {
  const ends = [...value.matchAll(/[.!?。？！][”’"']*(?=\s|$)/gu)].map(m => m.index + m[0].length);
  const result = []; let start = 0;
  for (const end of [...ends, value.length]) {
    const part = value.slice(start, end).trim();
    if (part) result.push(part);
    start = end;
  }
  return result;
}

// Validates submitted records. It cannot prove thought, execution authenticity, or prose quality.
export function evaluateSopReview(report, { through = "verify" } = {}) {
  const finish = (allowed, suffix) => ({ allowed, code: `AS-SOP-001-${suffix}`,
    validationScope: "submitted-snapshots-and-records", semanticQualityCertified: false,
    agentReadingProven: false, allAgentsAutomaticallyEnforced: false });
  const fail = suffix => finish(false, suffix);
  if (!report || report.schemaVersion !== 1 || report.contractId !== "AS-SOP-001") return fail("INVALID-REPORT");
  if (!report.sop || !text(report.sop.id) || !digest(report.sop.sha256)) return fail("SOP-REFERENCE");
  const a = report.artifact;
  if (!a || !text(a.beforeText) || !text(a.afterText) || a.beforeSha256 !== hash(a.beforeText)
      || a.afterSha256 !== hash(a.afterText)) return fail("ARTIFACT-HASH");
  const units = report.review?.units;
  if (report.review?.method !== "agent-close-reading" || !Array.isArray(units) || units.length === 0) return fail("REVIEW-UNITS");
  const expected = paragraphs(a.afterText);
  if (units.length !== expected.length || units.some((u, i) => !u || u.index !== i + 1 || u.after !== expected[i])) return fail("AFTER-COVERAGE");
  if (units.some(u => !text(u.before) || !a.beforeText.includes(u.before))
      || compact(units.map(u => u.before).join("")) !== compact(a.beforeText)) return fail("BEFORE-COVERAGE");
  const observations = new Map();
  for (const u of units) {
    if (!text(u.observation) || !["keep", "revise"].includes(u.decision)
        || (u.decision === "keep") !== (u.before === u.after)) return fail("UNIT-DECISION");
    const key = compact(u.observation);
    if (observations.has(key) && observations.get(key) !== u.after) return fail("REPEATED-ASSESSMENT");
    observations.set(key, u.after);
    const sentences = reviewSentences(u.after);
    if (!Array.isArray(u.sentences) || u.sentences.length !== sentences.length
        || u.sentences.some((s, i) => s?.text !== sentences[i])) return fail("SENTENCE-COVERAGE");
    for (const s of u.sentences) {
      if (!text(s.focus) || !s.text.includes(s.focus) || !text(s.observation)
          || !s.observation.includes(s.focus)) return fail("SENTENCE-OBSERVATION");
    }
  }
  if (!report.claims || ["semanticQualityCertified", "independentReviewPerformed", "allAgentsAutomaticallyEnforced"]
      .some(k => report.claims[k] !== false)) return fail("CLAIM-OVERREACH");
  if (report.scopePreserved !== true) return fail("SCOPE-EXPANDED");
  const required = through === "review" ? ["capture", "review"] : ["capture", "review", "check", "verify"];
  if (!Array.isArray(report.steps) || report.steps.length !== required.length
      || report.steps.some((s, i) => s?.id !== required[i] || s.status !== "completed")) return fail("STEP-ORDER");
  if (through !== "review" && through !== "verify") return fail("INVALID-REPORT");
  if (report.steps[0].evidenceSha256 !== a.beforeSha256 || report.steps[1].evidenceSha256 !== a.afterSha256)
    return fail("STEP-EVIDENCE");
  if (through === "review") return finish(true, "REVIEW-RECORDED");
  const m = report.mechanical;
  if (!m || m.executed !== true || m.exitCode !== 0 || !text(m.command)) return fail("MECHANICAL-NOT-EXECUTED");
  if (m.inputSha256 !== a.afterSha256) return fail("MECHANICAL-STALE");
  if (m.scope !== "known-patterns-only" || ["toolSha256", "rulesSha256", "stdoutSha256", "stderrSha256"].some(k => !digest(m[k])))
    return fail("MECHANICAL-EVIDENCE");
  if (report.steps[2].evidenceSha256 !== m.stdoutSha256 || report.steps[3].evidenceSha256 !== a.afterSha256)
    return fail("STEP-EVIDENCE");
  return finish(true, "RECORD-VALID");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf("--report");
  if (index < 0 || !process.argv[index + 1]) {
    process.stderr.write("AS-SOP-001 requires --report <path|-> [--through review]\n"); process.exitCode = 64;
  } else {
    try {
      const throughIndex = process.argv.indexOf("--through");
      const report = JSON.parse(readFileSync(process.argv[index + 1] === "-" ? 0 : process.argv[index + 1], "utf8"));
      const result = evaluateSopReview(report, { through: throughIndex < 0 ? "verify" : process.argv[throughIndex + 1] });
      process.stdout.write(JSON.stringify(result) + "\n"); if (!result.allowed) process.exitCode = 2;
    } catch {
      process.stdout.write(JSON.stringify({ allowed: false, code: "AS-SOP-001-INVALID-REPORT" }) + "\n"); process.exitCode = 2;
    }
  }
}
