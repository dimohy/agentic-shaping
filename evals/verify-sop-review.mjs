import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { evaluateSopReview } from "./sop-review.mjs";
const suite = JSON.parse(readFileSync(new URL("./sop-review-cases.json", import.meta.url), "utf8"));
let passed = 0;
for (const c of suite.cases) {
  const result = evaluateSopReview(c.report);
  if (result.allowed !== c.expected.allowed || result.code !== c.expected.code) throw new Error(`${c.id}: ${JSON.stringify(result)}`);
  passed++;
}
const input = structuredClone(suite.cases[0].report);
const partial = structuredClone(input); partial.steps = partial.steps.slice(0, 2); delete partial.mechanical;
if (evaluateSopReview(partial).allowed || !evaluateSopReview(partial, { through: "review" }).allowed)
  throw new Error("Partial review must not grant final verification");
const selection = { strategy: "reuse-existing", newCodeBenefit: "unknown", rationale: "Reuse SOP and current checks", mandatoryChecksPreserved: true,
  reviewWorkflow: suite.cases.find(c => c.id === "mechanical-promoted-to-semantic").report };
const route = spawnSync(process.execPath, [new URL("./unstructured-to-structured.mjs", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"), "--cost-selection", "-"],
  { input: JSON.stringify(selection), encoding: "utf8" });
if (route.status !== 2 || JSON.parse(route.stdout).code !== "AS-SOP-001-CLAIM-OVERREACH")
  throw new Error(`Actual AS-US-001 consumer did not reject the overclaim: ${route.stdout} ${route.stderr}`);
const runSelection = value => spawnSync(process.execPath,
  [new URL("./unstructured-to-structured.mjs", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"), "--cost-selection", "-"],
  { input: JSON.stringify(value), encoding: "utf8" });
const normal = runSelection({ ...selection, reviewWorkflow: input, deliveryPlan: { qualitySensitive: true } });
if (normal.status !== 0 || JSON.parse(normal.stdout).allowed !== true)
  throw new Error(`Valid review blocked by actual consumer: ${normal.stdout} ${normal.stderr}`);
const missing = runSelection({ ...selection, reviewWorkflow: undefined, deliveryPlan: { qualitySensitive: true } });
if (missing.status !== 2 || JSON.parse(missing.stdout).code !== "AS-SOP-001-REVIEW-REQUIRED")
  throw new Error("Quality-sensitive delivery bypassed its review requirement");
console.log(`AS-SOP-001 PASS ${passed}/${suite.cases.length}; partial/final separation and AS-US-001 consumer PASS`);
