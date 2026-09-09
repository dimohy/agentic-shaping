import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { evaluateTraceCorpusCompatibility } from "./trace-corpus-compatibility.mjs";

const root = resolve(import.meta.dirname, "..");
const hash = value => value.repeat(64).slice(0, 64);
const validTrace = revision => ({
  ruleId: "AS-US-001",
  traceAuthority: "orchestrator",
  orchestratorEvidence: {
    runner: "agentic-shaping-orchestrator",
    runId: "corpus-compatibility",
    targetRepository: "P:/MyWorks/Sollang",
    targetRevision: revision,
    inputFingerprint: hash("a"),
    executedCommands: [{ purpose: "baseline", command: "run focused baseline", exitCode: 1, expectedExitCode: 1, outputSha256: hash("b") }],
  },
  signal: { id: "late-schema-drift", durable: true, machineDecidable: true, sourceEvidence: ["registered downstream trace"] },
  decision: { structured: false, claimLevel: "signal-observed", reason: "migration pending", plannedAsset: { kind: "validator", authorityPath: "evals/trace-corpus-compatibility.mjs", nextGate: "migrate and rerun" } },
  currentTaskComplete: false,
  forbiddenActions: [],
});

const temp = mkdtempSync(join(tmpdir(), "as-trace-corpus-"));
let passed = 0;
try {
  const compatible = join(temp, "compatible");
  mkdirSync(join(compatible, "nested"), { recursive: true });
  writeFileSync(join(compatible, "nested", "as-us-001.json"), JSON.stringify(validTrace("1af49d7312ee8267977d2fca155b37223a273ebe")));
  let result = evaluateTraceCorpusCompatibility([compatible]);
  if (!result.allowed || result.total !== 1 || result.passed !== 1) throw new Error(`compatible corpus failed: ${JSON.stringify(result)}`);
  passed++;

  const descriptive = join(temp, "descriptive");
  mkdirSync(descriptive);
  writeFileSync(join(descriptive, "as-us-001.json"), JSON.stringify(validTrace("integration snapshot; preserved worktree")));
  result = evaluateTraceCorpusCompatibility([descriptive]);
  if (result.allowed || result.failures[0]?.code !== "AS-US-001-INVALID-ORCHESTRATOR-EVIDENCE") throw new Error(`descriptive revision was not rejected: ${JSON.stringify(result)}`);
  passed++;

  const malformed = join(temp, "malformed");
  mkdirSync(malformed);
  writeFileSync(join(malformed, "as-us-001.json"), "{");
  result = evaluateTraceCorpusCompatibility([malformed]);
  if (result.allowed || result.failures[0]?.code !== "AS-US-COMPAT-001-MALFORMED-TRACE") throw new Error(`malformed trace was not rejected: ${JSON.stringify(result)}`);
  passed++;

  const empty = join(temp, "empty");
  mkdirSync(empty);
  result = evaluateTraceCorpusCompatibility([empty]);
  if (result.allowed || result.code !== "AS-US-COMPAT-001-EMPTY-CORPUS") throw new Error(`empty corpus was not rejected: ${JSON.stringify(result)}`);
  passed++;

  const direct = spawnSync(process.execPath, [join(root, "evals", "trace-corpus-compatibility.mjs")], { encoding: "utf8" });
  if (direct.status !== 64 || !direct.stdout.includes("AS-US-COMPAT-001-MISSING-TRACE-ROOT")) throw new Error(`missing root did not fail closed: ${direct.status} ${direct.stdout}${direct.stderr}`);
  passed++;
} finally {
  rmSync(temp, { recursive: true, force: true });
}

process.stdout.write(`AS-US-COMPAT-001 trace corpus compatibility PASS ${passed}/5\n`);
