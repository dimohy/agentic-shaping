import { readFileSync } from "node:fs";
import { join } from "node:path";

export const llmWikiApplicationContract = JSON.parse(
  readFileSync(join(import.meta.dirname, "llm-wiki-application-contract.json"), "utf8")
);

const nonEmptyStrings = values => Array.isArray(values)
  && values.length > 0
  && values.every(value => typeof value === "string" && value.trim().length > 0);

export function evaluateLlmWikiApplication(trace) {
  if (trace === null || typeof trace !== "object" || Array.isArray(trace)) {
    return { allowed: false, code: "invalid-trace", relevant: 0, applied: 0, excluded: 0, unaccounted: 0 };
  }
  if (!Array.isArray(trace.memories) || !Array.isArray(trace.forbiddenActions)) {
    return { allowed: false, code: "invalid-trace", relevant: 0, applied: 0, excluded: 0, unaccounted: 0 };
  }
  if (trace.forbiddenActions.length > llmWikiApplicationContract.forbiddenActionsMaximum) {
    return { allowed: false, code: "forbidden-action", relevant: 0, applied: 0, excluded: 0, unaccounted: 0 };
  }
  const phase = trace.phase ?? "final";
  if (!["before-action", "final"].includes(phase)) {
    return { allowed: false, code: "invalid-phase", relevant: 0, applied: 0, excluded: 0, unaccounted: 0 };
  }
  const beforeAction = phase === "before-action";
  if (beforeAction && (!["planItemId", "target", "expectedObservation", "stopCondition"].every(
      key => typeof trace.nextAction?.[key] === "string" && trace.nextAction[key].trim().length > 0))) {
    return { allowed: false, code: "pre-action-contract-incomplete", relevant: 0, applied: 0, excluded: 0, unaccounted: 0 };
  }
  if (!beforeAction && llmWikiApplicationContract.requireCurrentTaskComplete && trace.currentTaskComplete !== true) {
    return { allowed: false, code: "current-task-incomplete", relevant: 0, applied: 0, excluded: 0, unaccounted: 0 };
  }

  const ids = new Set();
  const required = trace.requiredMemoryIds ?? [];
  if (!Array.isArray(required) || required.some(id => typeof id !== "string" || !id.trim())
      || new Set(required).size !== required.length) {
    return { allowed: false, code: "invalid-required-memory-ids", relevant: 0, applied: 0, excluded: 0, unaccounted: 0 };
  }
  for (const id of required) {
    const memory = trace.memories.find(value => value?.id === id);
    if (!memory) return { allowed: false, code: "required-memory-missing", relevant: 0, applied: 0, excluded: 0, unaccounted: 0 };
    if (memory.relevant !== true || memory.sensitive === true || memory.disposition !== (beforeAction ? "planned" : "applied")) {
      return { allowed: false, code: "required-memory-not-applied", relevant: 0, applied: 0, excluded: 0, unaccounted: 0 };
    }
  }
  let relevant = 0, applied = 0, excluded = 0, unaccounted = 0, planned = 0;
  for (const memory of trace.memories) {
    if (memory === null || typeof memory !== "object" || Array.isArray(memory)
        || typeof memory.id !== "string" || memory.id.trim().length === 0
        || ids.has(memory.id)) {
      return { allowed: false, code: "invalid-memory", relevant, applied, excluded, unaccounted };
    }
    ids.add(memory.id);
    if (!llmWikiApplicationContract.allowedDispositions.includes(memory.disposition)
        && !(beforeAction && memory.disposition === "planned")) {
      return { allowed: false, code: "invalid-disposition", relevant, applied, excluded, unaccounted };
    }
    if (memory.relevant === true) relevant += 1;

    if (memory.sensitive === true || memory.relevant !== true) {
      if (memory.disposition !== "excluded" || typeof memory.exclusionReason !== "string" || memory.exclusionReason.trim().length === 0) {
        return { allowed: false, code: memory.sensitive === true ? "sensitive-memory-applied" : "irrelevant-memory-applied", relevant, applied, excluded, unaccounted };
      }
      excluded += 1;
      continue;
    }

    if (beforeAction) {
      if (memory.disposition === "excluded" && typeof memory.exclusionReason === "string" && memory.exclusionReason.trim()) {
        excluded += 1;
        continue;
      }
      if (memory.disposition !== "planned" || memory.planItemId !== trace.nextAction.planItemId) unaccounted += 1;
      else planned += 1;
      continue;
    }

    if (memory.disposition === "applied") {
      const mapped = typeof memory.planItemId === "string" && memory.planItemId.trim().length > 0;
      const acted = nonEmptyStrings(memory.actionEvidence);
      const verified = nonEmptyStrings(memory.verificationEvidence);
      if (!mapped || !acted || !verified) {
        unaccounted += 1;
        continue;
      }
      applied += 1;
      continue;
    }

    if (typeof memory.exclusionReason !== "string" || memory.exclusionReason.trim().length === 0) {
      unaccounted += 1;
      continue;
    }
    excluded += 1;
  }

  if (unaccounted > llmWikiApplicationContract.relevantUnaccountedMaximum) {
    return { allowed: false, code: "relevant-memory-unaccounted", relevant, applied, excluded, unaccounted };
  }
  return { allowed: true, code: beforeAction ? "pre-action-plan-ready" : "application-trace-complete", relevant, applied, planned, excluded, unaccounted };
}
