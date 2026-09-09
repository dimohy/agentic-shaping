import { createHash } from "node:crypto";

export const sha256 = value => createHash("sha256").update(value).digest("hex");

export function buildEvaluationRunKey({
  algorithmVersion,
  suite,
  suiteText,
  suiteVersion,
  caseIds,
  starter,
  evalModel,
  reasoningEffort,
  promptSource,
}) {
  if (![1, 2].includes(algorithmVersion)) throw new Error("Unsupported runKey algorithm version");
  return sha256(JSON.stringify({
    suite,
    ...(algorithmVersion === 2 ? { suiteSha256: sha256(suiteText) } : {}),
    suiteVersion,
    caseIds,
    starter,
    evalModel,
    reasoningEffort,
    promptSource,
  }));
}
