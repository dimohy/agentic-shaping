import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { buildEvaluationRunKey, sha256 } from "./run-identity.mjs";

const args = process.argv.slice(2);
const requireCurrentPrompt = args.includes("--require-current-prompt");
const checkCurrentPrompt = requireCurrentPrompt || args.includes("--check-current-prompt");
const resultName = args.find(arg => !arg.startsWith("--")) || "llm-wiki-application-v0.2-development-luna-max.json";
if (basename(resultName) !== resultName || !resultName.endsWith(".json")) {
  throw new Error("Expected an evaluation result filename inside evals/");
}

const resultBytes = readFileSync(join(import.meta.dirname, resultName));
const result = JSON.parse(resultBytes.toString("utf8"));
if (!result.provenance) throw new Error("Completed result has no embedded provenance");
if (basename(result.suiteSource) !== result.suiteSource) throw new Error("Invalid suiteSource");

const suiteText = readFileSync(join(import.meta.dirname, result.suiteSource), "utf8");
const suite = JSON.parse(suiteText);
const actual = {
  suiteSha256: sha256(suiteText),
};
let currentPromptSha256 = null;
let promptMatchesCurrent = null;

if (result.provenance.promptSnapshot) {
  const snapshotName = result.provenance.promptSnapshot;
  if (basename(snapshotName) !== snapshotName || !/^prompt-[0-9a-f]{64}\.md$/.test(snapshotName)) {
    throw new Error("Invalid promptSnapshot filename");
  }
  const snapshot = readFileSync(join(import.meta.dirname, snapshotName), "utf8");
  actual.promptSha256 = sha256(snapshot);
  actual.runKey = buildEvaluationRunKey({
    algorithmVersion: result.provenance.runKeyAlgorithmVersion ?? 1,
    suite: result.suiteSource,
    suiteText,
    suiteVersion: suite.version,
    caseIds: suite.cases.map(testCase => testCase.id),
    starter: snapshot,
    evalModel: result.runtime.model,
    reasoningEffort: result.runtime.reasoningEffort,
    promptSource: result.promptSource,
  });
}

if (checkCurrentPrompt) {
  if (!result.promptSource.startsWith("https://")) {
    throw new Error("Current-prompt verification requires an HTTPS prompt source");
  }
  const prompt = await fetch(result.promptSource).then(response => {
    if (!response.ok) throw new Error(`Prompt fetch failed: ${response.status}`);
    return response.text();
  });
  currentPromptSha256 = sha256(prompt);
  promptMatchesCurrent = currentPromptSha256 === result.provenance.promptSha256;
  if (promptMatchesCurrent && !result.provenance.promptSnapshot) {
    actual.runKey = buildEvaluationRunKey({
      algorithmVersion: result.provenance.runKeyAlgorithmVersion ?? 1,
      suite: result.suiteSource,
      suiteText,
      suiteVersion: suite.version,
      caseIds: suite.cases.map(testCase => testCase.id),
      starter: prompt,
      evalModel: result.runtime.model,
      reasoningEffort: result.runtime.reasoningEffort,
      promptSource: result.promptSource,
    });
  }
}

const runKeyAlgorithmVersion = result.provenance.runKeyAlgorithmVersion ?? 1;
if (![1, 2].includes(runKeyAlgorithmVersion)) throw new Error("Unsupported runKey algorithm version");

for (const [field, value] of Object.entries(actual)) {
  if (value !== result.provenance[field]) {
    throw new Error(`${field} mismatch: expected ${result.provenance[field]}, actual ${value}`);
  }
}
for (const field of ["promptSha256", "runKey"]) {
  if (!/^[0-9a-f]{64}$/.test(result.provenance[field])) throw new Error(`Invalid ${field}`);
}
if (result.evalVersion !== suite.version) throw new Error("Result and suite versions differ");
if (requireCurrentPrompt && !promptMatchesCurrent) {
  throw new Error(`promptSha256 mismatch: historical ${result.provenance.promptSha256}, current ${currentPromptSha256}`);
}

const currentPrompt = promptMatchesCurrent === null ? "unchecked" : String(promptMatchesCurrent);
process.stdout.write(`PASS completed evaluation integrity: result=${resultName} resultSha256=${sha256(resultBytes)} currentPrompt=${currentPrompt}\n`);
