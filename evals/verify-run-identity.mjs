import { buildEvaluationRunKey } from "./run-identity.mjs";

const common = {
  suite: "development.json",
  suiteVersion: "1.0.0",
  caseIds: ["same-id"],
  starter: "same prompt",
  evalModel: "same model",
  reasoningEffort: "same effort",
  promptSource: "same source",
};
const originalSuite = '{"scenario":"original"}';
const editedSuite = '{"scenario":"edited"}';
const legacyOriginal = buildEvaluationRunKey({ ...common, algorithmVersion: 1, suiteText: originalSuite });
const legacyEdited = buildEvaluationRunKey({ ...common, algorithmVersion: 1, suiteText: editedSuite });
if (legacyOriginal !== legacyEdited) throw new Error("Version 1 control unexpectedly hashes suite content");
const currentOriginal = buildEvaluationRunKey({ ...common, algorithmVersion: 2, suiteText: originalSuite });
const currentEdited = buildEvaluationRunKey({ ...common, algorithmVersion: 2, suiteText: editedSuite });
if (currentOriginal === currentEdited) throw new Error("Version 2 accepted edited suite content under the same run key");

process.stdout.write("PASS run identity: v1 compatibility preserved; v2 rejects same-id suite drift\n");
