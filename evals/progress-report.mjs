import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const progressReportContract = JSON.parse(
  readFileSync(join(import.meta.dirname, "progress-report-contract.json"), "utf8")
);

const exactKeys = (value, allowed) => value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.keys(value).every(key => allowed.has(key));
const text = value => typeof value === "string" && value.trim().length > 0;
const base = code => ({ allowed: false, code, axes: 0, knownAxes: 0, unknownAxes: 0 });

export function evaluateProgressReport(trace) {
  const topKeys = new Set(["runId", "requiredAxisIds", "axes"]);
  if (!exactKeys(trace, topKeys) || !text(trace.runId)
      || !Array.isArray(trace.requiredAxisIds) || trace.requiredAxisIds.length === 0
      || new Set(trace.requiredAxisIds).size !== trace.requiredAxisIds.length
      || !trace.requiredAxisIds.every(text)
      || !Array.isArray(trace.axes) || trace.axes.length === 0) return base("invalid-trace");

  const axisKeys = new Set([
    "id", "label", "status", "denominatorKind", "completed", "total", "percent",
    "scopeLabel", "unknownReason", "failureGroups", "currentStage", "nextGate"
  ]);
  const axisIds = trace.axes.map(axis => axis?.id);
  if (new Set(axisIds).size !== axisIds.length) return base("duplicate-axis");
  if (trace.requiredAxisIds.some(id => !axisIds.includes(id))) return base("required-axis-missing");
  if (axisIds.some(id => !trace.requiredAxisIds.includes(id))) return base("undeclared-axis");

  let knownAxes = 0;
  let unknownAxes = 0;
  for (const axis of trace.axes) {
    if (!exactKeys(axis, axisKeys) || !text(axis.id) || !text(axis.label)
        || !["active", "blocked", "complete"].includes(axis.status)
        || !["known", "unknown"].includes(axis.denominatorKind)
        || !Array.isArray(axis.failureGroups)
        || axis.failureGroups.some(group => !exactKeys(group, new Set(["label", "count"]))
          || !text(group.label) || !Number.isInteger(group.count) || group.count < 1)
        || !text(axis.currentStage) || !text(axis.nextGate)) return base("invalid-axis");

    if (axis.denominatorKind === "known") {
      knownAxes += 1;
      if (!Number.isInteger(axis.completed) || !Number.isInteger(axis.total)
          || axis.total < 1 || axis.completed < 0 || axis.completed > axis.total
          || typeof axis.percent !== "number"
          || "scopeLabel" in axis || "unknownReason" in axis) return base("invalid-known-denominator");
      const expected = Number((axis.completed * 100 / axis.total).toFixed(progressReportContract.percentageDecimals));
      if (axis.percent !== expected) return base("percentage-mismatch");
      if (axis.status === "complete" && axis.completed !== axis.total) return base("incomplete-axis-marked-complete");
      if (axis.status !== "complete" && axis.completed === axis.total) return base("complete-axis-not-marked-complete");
    } else {
      unknownAxes += 1;
      if (!text(axis.scopeLabel) || !text(axis.unknownReason)
          || "completed" in axis || "total" in axis || "percent" in axis
          || axis.status === "complete") return base("invalid-unknown-denominator");
    }
  }
  return { allowed: true, code: "multi-axis-progress-valid", axes: trace.axes.length, knownAxes, unknownAxes };
}

export function runProgressReportCli(args, io = process) {
  if (args.length !== 2 || args[0] !== "--trace" || !text(args[1])) {
    io.stderr.write("usage: node progress-report.mjs --trace <progress-report-trace.json>\n");
    return 64;
  }
  try {
    const verdict = evaluateProgressReport(JSON.parse(readFileSync(args[1], "utf8")));
    io.stdout.write(`${JSON.stringify({ ruleId: progressReportContract.ruleId, ...verdict })}\n`);
    return verdict.allowed ? 0 : 2;
  } catch (error) {
    io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 64;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = runProgressReportCli(process.argv.slice(2));
}
