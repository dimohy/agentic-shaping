import { readFileSync } from "node:fs";
import { join } from "node:path";

export const cancellationTerminalContract = JSON.parse(
  readFileSync(join(import.meta.dirname, "cancellation-terminal-contract.json"), "utf8")
);

const exactKeys = (value, keys) => value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.keys(value).sort().join("\n") === [...keys].sort().join("\n");

export function evaluateCancellationTerminal(trace) {
  const fail = code => ({ ruleId: cancellationTerminalContract.ruleId, allowed: false, code });
  if (!exactKeys(trace, ["requestKind", "cancellationMechanism", "processTerminated", "completionRecord", "orphanProcessCount"])) {
    return fail("AS-CT-001-INVALID-TRACE");
  }
  if (!Number.isInteger(trace.orphanProcessCount) || trace.orphanProcessCount < 0) {
    return fail("AS-CT-001-INVALID-TRACE");
  }
  if (trace.requestKind === "cancel") {
    if (!cancellationTerminalContract.supportedCancellationMechanisms.includes(trace.cancellationMechanism)) {
      return fail("AS-CT-001-UNSUPPORTED-CANCELLATION");
    }
    if (trace.processTerminated !== true || trace.orphanProcessCount !== 0) {
      return fail("AS-CT-001-INCOMPLETE-TERMINATION");
    }
    const record = trace.completionRecord;
    if (!exactKeys(record, ["status", "exitCode", "failureIds", "orphanProcessIds"])
        || record.status !== cancellationTerminalContract.cancelledStatus
        || !Number.isInteger(record.exitCode) || record.exitCode === 0
        || !Array.isArray(record.failureIds)
        || record.failureIds.length !== 1
        || record.failureIds[0] !== cancellationTerminalContract.cancelledFailureId
        || !Array.isArray(record.orphanProcessIds)
        || record.orphanProcessIds.length !== 0) {
      return fail("AS-CT-001-MISSING-TERMINAL-RECORD");
    }
    return { ruleId: cancellationTerminalContract.ruleId, allowed: true, code: "OK" };
  }
  if (trace.requestKind === "natural") {
    const record = trace.completionRecord;
    if (trace.cancellationMechanism !== "none" || trace.processTerminated !== true
        || trace.orphanProcessCount !== 0
        || !exactKeys(record, ["status", "exitCode", "failureIds", "orphanProcessIds"])
        || record.status !== "passed" || record.exitCode !== 0
        || !Array.isArray(record.failureIds) || record.failureIds.length !== 0
        || !Array.isArray(record.orphanProcessIds) || record.orphanProcessIds.length !== 0) {
      return fail("AS-CT-001-INVALID-NATURAL-EXIT");
    }
    return { ruleId: cancellationTerminalContract.ruleId, allowed: true, code: "OK" };
  }
  return fail("AS-CT-001-INVALID-TRACE");
}
