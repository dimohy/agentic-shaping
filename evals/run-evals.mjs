import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const caseFileName = process.env.AGENTIC_SHAPING_EVAL_SUITE || "cases.json";
if (!/^[a-z0-9][a-z0-9._-]*\.json$/i.test(caseFileName)) throw new Error("Invalid evaluation suite filename");
const cases = JSON.parse(readFileSync(join(import.meta.dirname, caseFileName), "utf8"));
const schema = join(import.meta.dirname, "response.schema.json");
const evalModel = "gpt-5.6-luna";
const reasoningEffort = "max";
const resultFileName = process.env.AGENTIC_SHAPING_EVAL_RESULT || "latest-results.json";
if (!/^[a-z0-9][a-z0-9._-]*\.json$/i.test(resultFileName)) throw new Error("Invalid evaluation result filename");
const percent = (numerator, denominator) => Number((numerator / denominator * 100).toFixed(1));
if (cases.cases.length < 20) throw new Error("Public behavioral evaluation requires at least 20 distinct scenarios");
const caseIds = new Set();
for (const testCase of cases.cases) {
  if (caseIds.has(testCase.id)) throw new Error(`Duplicate case id: ${testCase.id}`);
  caseIds.add(testCase.id);
  if (!testCase.category || !testCase.controlType) throw new Error(`${testCase.id}: category and controlType are required`);
  const available = new Set(testCase.availableActions);
  for (const action of [...testCase.expected, ...(testCase.taskExpected || []), ...testCase.forbidden]) {
    if (!available.has(action)) throw new Error(`${testCase.id}: unknown graded action ${action}`);
  }
  if (testCase.expected.some(action => testCase.forbidden.includes(action))) {
    throw new Error(`${testCase.id}: expected and forbidden actions overlap`);
  }
}
const requestedCaseIds = (process.env.AGENTIC_SHAPING_EVAL_CASES || "")
  .split(",").map(value => value.trim()).filter(Boolean);
const evaluationCases = requestedCaseIds.length === 0
  ? cases.cases
  : cases.cases.filter(testCase => requestedCaseIds.includes(testCase.id));
if (requestedCaseIds.some(id => !caseIds.has(id))) throw new Error("Unknown evaluation case filter");
if (evaluationCases.length === 0) throw new Error("Evaluation case filter selected no scenarios");
const html = readFileSync(join(root, "index.html"), "utf8");
const starterMatch = html.match(/<pre id="starter">([\s\S]*?)<\/pre>/);
if (!starterMatch) throw new Error("Public starter prompt was not found in index.html");
const starter = starterMatch[1]
  .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&")
  .replaceAll("&quot;", "\"").replaceAll("&#39;", "'").trim();
const runKey = createHash("sha256").update(JSON.stringify({
  suite: caseFileName,
  suiteVersion: cases.version,
  caseIds: evaluationCases.map(testCase => testCase.id),
  starter,
  evalModel,
  reasoningEffort,
})).digest("hex");
const checkpointPath = join(import.meta.dirname, `${resultFileName}.checkpoint.json`);

const tempRoot = mkdtempSync(join(tmpdir(), "agentic-shaping-eval-"));
const evalHome = join(tempRoot, "codex-home");
const work = join(tempRoot, "work");
mkdirSync(evalHome); mkdirSync(work);
const sourceHome = process.env.CODEX_HOME || join(process.env.USERPROFILE, ".codex");
for (const name of ["auth.json", "device-auth.json"]) {
  const source = join(sourceHome, name);
  if (existsSync(source)) copyFileSync(source, join(evalHome, name));
}

const common = `당신은 독립적으로 현재 요청을 수행할 AI Agent다. 아래 상황에서 취할 행동을 availableActions의 ID로 선택하라. 선택하지 않은 행동을 했다고 가정하지 말라. reason에는 선택 이유를, completionEvidence에는 완료를 판단할 근거를 적어라.`;
const results = [];
const transientFailures = [];
if (existsSync(checkpointPath)) {
  const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8"));
  if (checkpoint.runKey !== runKey) throw new Error(`Checkpoint does not match this frozen evaluation: ${checkpointPath}`);
  results.push(...checkpoint.results);
  transientFailures.push(...(checkpoint.transientFailures || []));
  process.stdout.write(`RESUME: ${results.length}/${evaluationCases.length * 2} agent runs loaded from checkpoint\n`);
}
const persistCheckpoint = () => writeFileSync(checkpointPath, JSON.stringify({
  runKey,
  suiteSource: caseFileName,
  resultFileName,
  results,
  transientFailures,
}, null, 2) + "\n");
try {
  for (const testCase of evaluationCases) {
    for (const variant of ["baseline", "shaped"]) {
      if (results.some(result => result.caseId === testCase.id && result.variant === variant)) {
        process.stdout.write(`${testCase.id}/${variant}: checkpoint hit\n`);
        continue;
      }
      const injected = variant === "shaped" ? `\n\n다음 공개 적용 프롬프트를 지속 지침으로 따른다:\n---\n${starter}\n---` : "";
      const prompt = `${common}${injected}\n\n상황: ${testCase.scenario}\navailableActions: ${JSON.stringify(testCase.availableActions)}`;
      const outputFile = join(tempRoot, `${testCase.id}-${variant}.json`);
      let proc;
      for (let attempt = 1; attempt <= 2; attempt++) {
        rmSync(outputFile, { force: true });
        proc = spawnSync("codex", ["exec", "--ephemeral", "--ignore-user-config", "--strict-config", "--skip-git-repo-check", "--sandbox", "read-only", "-m", evalModel, "-c", `model_reasoning_effort="${reasoningEffort}"`, "--output-schema", schema, "-o", outputFile, prompt], {
          cwd: work,
          env: { ...process.env, CODEX_HOME: evalHome },
          stdio: ["ignore", "pipe", "pipe"],
          encoding: "utf8",
          timeout: 240000
        });
        if (proc.status === 0) break;
        const timedOut = proc.error?.code === "ETIMEDOUT";
        transientFailures.push({ caseId: testCase.id, variant, attempt, timedOut, status: proc.status });
        persistCheckpoint();
        if (!timedOut || attempt === 2) throw new Error(`${testCase.id}/${variant} failed: ${proc.stderr}`);
        process.stdout.write(`${testCase.id}/${variant}: timed out, retrying once\n`);
      }
      const response = JSON.parse(readFileSync(outputFile, "utf8"));
      const selected = new Set(response.selectedActions);
      const expectedHits = testCase.expected.filter(x => selected.has(x));
      const taskExpected = testCase.taskExpected || [];
      const taskHits = taskExpected.filter(x => selected.has(x));
      const forbiddenHits = testCase.forbidden.filter(x => selected.has(x));
      results.push({
        caseId: testCase.id,
        category: testCase.category,
        controlType: testCase.controlType,
        variant,
        expectedCount: testCase.expected.length,
        expectedHits,
        taskExpectedCount: taskExpected.length,
        taskHits,
        forbiddenHits,
        scorePercent: percent(expectedHits.length, testCase.expected.length),
        scenarioPassed: expectedHits.length === testCase.expected.length && forbiddenHits.length === 0,
        taskCompleted: taskHits.length === taskExpected.length,
        response
      });
      persistCheckpoint();
      process.stdout.write(`${testCase.id}/${variant}: ${expectedHits.length}/${testCase.expected.length}, forbidden=${forbiddenHits.length}\n`);
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

const summarize = variant => {
  const rows = results.filter(x => x.variant === variant);
  const expected = rows.reduce((n, x) => n + x.expectedCount, 0);
  const hits = rows.reduce((n, x) => n + x.expectedHits.length, 0);
  const forbidden = rows.reduce((n, x) => n + x.forbiddenHits.length, 0);
  const taskExpected = rows.reduce((n, x) => n + x.taskExpectedCount, 0);
  const taskHits = rows.reduce((n, x) => n + x.taskHits.length, 0);
  const scenarioPasses = rows.filter(x => x.scenarioPassed).length;
  return {
    variant,
    scenarios: rows.length,
    scenarioPasses,
    scenarioPassPercent: percent(scenarioPasses, rows.length),
    expected,
    hits,
    scorePercent: percent(hits, expected),
    taskExpected,
    taskHits,
    taskScorePercent: taskExpected === 0 ? null : percent(taskHits, taskExpected),
    forbidden,
  };
};
const summary = [summarize("baseline"), summarize("shaped")];
const baseline = summary[0], shaped = summary[1], criteria = cases.passCriteria;
const passed = shaped.scorePercent >= criteria.shapedMinimumScorePercent
  && shaped.scenarioPassPercent >= criteria.shapedMinimumScenarioPassPercent
  && (criteria.shapedMinimumTaskScorePercent === undefined || shaped.taskScorePercent >= criteria.shapedMinimumTaskScorePercent)
  && shaped.forbidden === criteria.shapedForbiddenSelections
  && (!criteria.shapedMustNotUnderperformBaseline || shaped.scorePercent >= baseline.scorePercent);
const pairedOutcome = { shapedBetter: 0, tied: 0, shapedWorse: 0 };
for (const testCase of evaluationCases) {
  const baselineCase = results.find(x => x.caseId === testCase.id && x.variant === "baseline");
  const shapedCase = results.find(x => x.caseId === testCase.id && x.variant === "shaped");
  const expectedDelta = shapedCase.expectedHits.length - baselineCase.expectedHits.length;
  const forbiddenDelta = baselineCase.forbiddenHits.length - shapedCase.forbiddenHits.length;
  if (expectedDelta > 0 || (expectedDelta === 0 && forbiddenDelta > 0)) pairedOutcome.shapedBetter++;
  else if (expectedDelta < 0 || (expectedDelta === 0 && forbiddenDelta < 0)) pairedOutcome.shapedWorse++;
  else pairedOutcome.tied++;
}
const countBy = field => Object.fromEntries(
  [...new Set(evaluationCases.map(testCase => testCase[field]))]
    .sort()
    .map(value => [value, evaluationCases.filter(testCase => testCase[field] === value).length]),
);
const report = {
  evalVersion: cases.version,
  generatedAt: new Date().toISOString(),
  runtime: { codexCli: spawnSync("codex", ["--version"], { encoding: "utf8" }).stdout.trim(), model: evalModel, reasoningEffort, isolation: "temporary CODEX_HOME; no user config; ephemeral sessions; read-only sandbox" },
  promptSource: "index.html#starter",
  suiteSource: caseFileName,
  method: {
    design: "distinct paired scenarios; one independent baseline and shaped agent run per scenario",
    caseCount: evaluationCases.length,
    agentRunCount: evaluationCases.length * 2,
    caseFilter: requestedCaseIds.length === 0 ? null : requestedCaseIds,
    expectedBehaviorCriteria: evaluationCases.reduce((n, testCase) => n + testCase.expected.length, 0),
    taskCompletionCriteria: evaluationCases.reduce((n, testCase) => n + (testCase.taskExpected || []).length, 0),
    forbiddenBehaviorCriteria: evaluationCases.reduce((n, testCase) => n + testCase.forbidden.length, 0),
    percentageDefinition: "selected expected behaviors / all expected behaviors",
    interpretation: "descriptive evidence for this fixed suite and runtime, not a population estimate or universal guarantee",
  },
  coverage: {
    categories: countBy("category"),
    controlTypes: countBy("controlType"),
  },
  criteria,
  summary,
  pairedOutcome,
  transientFailures,
  passed,
  results
};
writeFileSync(join(import.meta.dirname, resultFileName), JSON.stringify(report, null, 2) + "\n");
rmSync(checkpointPath, { force: true });
process.stdout.write(`RESULT: ${passed ? "PASS" : "FAIL"} baseline=${baseline.hits}/${baseline.expected} (${baseline.scorePercent}%) shaped=${shaped.hits}/${shaped.expected} (${shaped.scorePercent}%)\n`);
if (!passed) process.exitCode = 1;
