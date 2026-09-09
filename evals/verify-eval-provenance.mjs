import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { buildEvaluationRunKey, sha256 } from "./run-identity.mjs";

const args = process.argv.slice(2);
const requireCurrentPrompt = args.includes("--require-current-prompt");
const checkCurrentPrompt = requireCurrentPrompt || args.includes("--check-current-prompt");
const sidecarName = args.find(arg => !arg.startsWith("--")) || "llm-wiki-application-development-luna-max.provenance.json";
if (basename(sidecarName) !== sidecarName || !sidecarName.endsWith(".provenance.json")) {
  throw new Error("Expected a provenance sidecar filename inside evals/");
}

const sidecar = JSON.parse(readFileSync(join(import.meta.dirname, sidecarName), "utf8"));
if (sidecar.schemaVersion !== 1) throw new Error("Unsupported evaluation provenance schema");
for (const field of ["result", "suite", "runSuiteIdentity"]) {
  if (basename(sidecar[field]) !== sidecar[field]) throw new Error(`Invalid ${field} filename`);
}

const resultBytes = readFileSync(join(import.meta.dirname, sidecar.result));
const suiteText = readFileSync(join(import.meta.dirname, sidecar.suite), "utf8");
const result = JSON.parse(resultBytes.toString("utf8"));
const suite = JSON.parse(suiteText);
const actual = {
  suiteSha256: sha256(suiteText),
  resultSha256: sha256(resultBytes),
};
let currentPromptSha256 = null;
let promptMatchesCurrent = null;

if (sidecar.promptSnapshot) {
  if (basename(sidecar.promptSnapshot) !== sidecar.promptSnapshot || !/^prompt-[0-9a-f]{64}\.md$/.test(sidecar.promptSnapshot)) {
    throw new Error("Invalid promptSnapshot filename");
  }
  const snapshot = readFileSync(join(import.meta.dirname, sidecar.promptSnapshot), "utf8");
  actual.promptSha256 = sha256(snapshot);
  actual.runKey = buildEvaluationRunKey({
    algorithmVersion: sidecar.runKeyAlgorithmVersion,
    suite: sidecar.runSuiteIdentity,
    suiteText,
    suiteVersion: suite.version,
    caseIds: suite.cases.map(testCase => testCase.id),
    starter: snapshot,
    evalModel: result.runtime.model,
    reasoningEffort: result.runtime.reasoningEffort,
    promptSource: sidecar.promptSource,
  });
}

if (checkCurrentPrompt) {
  const prompt = await fetch(sidecar.promptSource).then(response => {
    if (!response.ok) throw new Error(`Prompt fetch failed: ${response.status}`);
    return response.text();
  });
  currentPromptSha256 = sha256(prompt);
  promptMatchesCurrent = currentPromptSha256 === sidecar.promptSha256;
  if (promptMatchesCurrent && !sidecar.promptSnapshot) {
    actual.runKey = buildEvaluationRunKey({
      algorithmVersion: sidecar.runKeyAlgorithmVersion,
      suite: sidecar.runSuiteIdentity,
      suiteText,
      suiteVersion: suite.version,
      caseIds: suite.cases.map(testCase => testCase.id),
      starter: prompt,
      evalModel: result.runtime.model,
      reasoningEffort: result.runtime.reasoningEffort,
      promptSource: sidecar.promptSource,
    });
  }
}

if (![1, 2].includes(sidecar.runKeyAlgorithmVersion)) throw new Error("Unsupported runKey algorithm version");

for (const [field, value] of Object.entries(actual)) {
  if (value !== sidecar[field]) throw new Error(`${field} mismatch: expected ${sidecar[field]}, actual ${value}`);
}
for (const field of ["promptSha256", "runKey"]) {
  if (!/^[0-9a-f]{64}$/.test(sidecar[field])) throw new Error(`Invalid ${field}`);
}
if (result.evalVersion !== suite.version) throw new Error("Result and suite versions differ");
if (result.promptSource !== sidecar.promptSource) throw new Error("Result and prompt source differ");
if (result.suiteSource !== sidecar.runSuiteIdentity) throw new Error("Result and run suite identities differ");
if (result.provenance) {
  for (const field of ["runKeyAlgorithmVersion", "runKey", "suiteSha256", "promptSha256", "promptSnapshot"]) {
    if (field === "promptSnapshot" && result.provenance[field] === undefined && sidecar[field] === undefined) continue;
    const resultValue = field === "runKeyAlgorithmVersion"
      ? result.provenance[field] ?? 1
      : result.provenance[field];
    if (resultValue !== sidecar[field]) throw new Error(`Result and sidecar ${field} differ`);
  }
}
if (requireCurrentPrompt && !promptMatchesCurrent) {
  throw new Error(`promptSha256 mismatch: historical ${sidecar.promptSha256}, current ${currentPromptSha256}`);
}

const currentPrompt = promptMatchesCurrent === null ? "unchecked" : String(promptMatchesCurrent);
process.stdout.write(`PASS historical evaluation integrity: result=${sidecar.result} runKey=${sidecar.runKey} currentPrompt=${currentPrompt}\n`);
