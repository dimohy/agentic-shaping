import { readFileSync } from "node:fs";
import { join } from "node:path";

export const collaborationRoutingContract = JSON.parse(
  readFileSync(join(import.meta.dirname, "collaboration-routing-contract.json"), "utf8")
);

const uniqueKnownTargets = targets => Array.isArray(targets)
  && targets.length > 0
  && new Set(targets).size === targets.length
  && targets.every(target => collaborationRoutingContract.requestTargets.includes(target));

const validEvidence = evidence => Array.isArray(evidence)
  && evidence.length > 0
  && evidence.every(item => typeof item === "string" && item.trim().length > 0);

export function evaluateCollaborationRouting(trace) {
  const base = { allowed: false, code: "invalid-trace", targets: 0, materialChanges: 0, verifiedTargets: 0 };
  if (trace === null || typeof trace !== "object" || Array.isArray(trace)
      || !uniqueKnownTargets(trace.requestTargets)
      || !collaborationRoutingContract.phases.includes(trace.phase)
      || !Array.isArray(trace.actions)
      || !Array.isArray(trace.forbiddenActions)) return base;
  if (trace.forbiddenActions.length > collaborationRoutingContract.forbiddenActionsMaximum) {
    return { ...base, code: "forbidden-action", targets: trace.requestTargets.length };
  }
  if (trace.phase === "final" && collaborationRoutingContract.finalRequiresCurrentTaskComplete
      && trace.currentTaskComplete !== true) {
    return { ...base, code: "current-task-incomplete", targets: trace.requestTargets.length };
  }
  if (trace.phase === "in-progress" && trace.currentTaskComplete !== false) {
    return { ...base, code: "phase-completion-mismatch", targets: trace.requestTargets.length };
  }
  for (const action of trace.actions) {
    if (action === null || typeof action !== "object" || Array.isArray(action)
        || !collaborationRoutingContract.requestTargets.includes(action.target)
        || !validEvidence(action.evidence)) return base;
  }

  const requestedSystems = trace.requestTargets.filter(target => collaborationRoutingContract.systemTargets.includes(target));
  const systemMutations = trace.actions.filter(action => collaborationRoutingContract.systemTargets.includes(action.target)
    && collaborationRoutingContract.materialActionKinds.includes(action.kind));
  if (requestedSystems.length === 0) {
    if (systemMutations.length > 0) {
      return { ...base, code: "ordinary-memory-mutated-system", targets: trace.requestTargets.length, materialChanges: systemMutations.length };
    }
    return { allowed: true, code: "memory-route-isolated", targets: trace.requestTargets.length, materialChanges: 0, verifiedTargets: 0 };
  }

  if (trace.phase === "in-progress") {
    let progressedTargets = 0;
    for (const target of requestedSystems) {
      const targetActions = trace.actions.filter(action => action.target === target);
      if (!targetActions.some(action => action.kind === "evaluation-contract")) {
        return { ...base, code: "evaluation-contract-missing", targets: trace.requestTargets.length, materialChanges: systemMutations.length, verifiedTargets: progressedTargets };
      }
      if (!targetActions.some(action => collaborationRoutingContract.inProgressActionKinds.includes(action.kind))) {
        return { ...base, code: "requested-target-not-progressed", targets: trace.requestTargets.length, materialChanges: systemMutations.length, verifiedTargets: progressedTargets };
      }
      progressedTargets += 1;
    }
    return { allowed: true, code: "system-evolution-in-progress", targets: trace.requestTargets.length, materialChanges: systemMutations.length, verifiedTargets: progressedTargets };
  }

  if (systemMutations.length === 0) {
    const memoryActivity = trace.actions.some(action => action.target === "memory");
    return { ...base, code: memoryActivity ? "system-evolution-replaced-by-memory" : "system-evolution-not-materialized", targets: trace.requestTargets.length };
  }

  let verifiedTargets = 0;
  for (const target of requestedSystems) {
    const targetActions = trace.actions.filter(action => action.target === target);
    if (!targetActions.some(action => collaborationRoutingContract.materialActionKinds.includes(action.kind))) {
      return { ...base, code: "requested-target-not-materialized", targets: trace.requestTargets.length, materialChanges: systemMutations.length, verifiedTargets };
    }
    if (!targetActions.some(action => action.kind === "evaluation-contract")) {
      return { ...base, code: "evaluation-contract-missing", targets: trace.requestTargets.length, materialChanges: systemMutations.length, verifiedTargets };
    }
    if (!targetActions.some(action => action.kind === "behavioral-verification")) {
      return { ...base, code: "behavioral-verification-missing", targets: trace.requestTargets.length, materialChanges: systemMutations.length, verifiedTargets };
    }
    verifiedTargets += 1;
  }
  return { allowed: true, code: "system-evolution-routed", targets: trace.requestTargets.length, materialChanges: systemMutations.length, verifiedTargets };
}
