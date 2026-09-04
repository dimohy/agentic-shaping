import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const behavioralInterlockContract = JSON.parse(
  readFileSync(join(here, "behavioral-interlock-contract.json"), "utf8")
);

const traceSchema = JSON.parse(
  readFileSync(join(here, behavioralInterlockContract.traceSchema), "utf8")
);
const allowedEvidence = new Set(behavioralInterlockContract.evidenceKinds);
const systemEvolutionEvidence = new Set(behavioralInterlockContract.systemEvolutionEvidenceKinds);
const systemEvolutionTargets = new Set(behavioralInterlockContract.systemEvolutionTargets);
const eventKeys = new Map(traceSchema.properties.events.items.oneOf.map(shape => [
  shape.properties.kind.const,
  new Set(Object.keys(shape.properties))
]));

function fail(code) {
  const guidance = behavioralInterlockContract.failureGuidance?.[code];
  if (!guidance) return { allowed: false, code };
  return {
    allowed: false,
    code,
    guidance,
    allowedEvidenceKinds: [
      ...behavioralInterlockContract.evidenceKinds,
      ...behavioralInterlockContract.systemEvolutionEvidenceKinds
    ]
  };
}

export function evaluateBehavioralInterlock(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return fail("AS-BI-001-INVALID-TRACE");
  }
  let running = false;
  let pendingSafeWork = 0;
  let pollsSinceEvidence = 0;
  let emptyQueueExplained = false;
  let state = null;
  const completedActionIds = new Set();

  function refreshState(nextActionId = state?.nextActionId ?? "") {
    state = {
      runId: state.runId,
      pendingSafeWork,
      pollsSinceEvidence,
      nextActionId
    };
    return Buffer.byteLength(JSON.stringify(state), "utf8") <=
      behavioralInterlockContract.maxInjectedStateBytes;
  }

  for (const event of events) {
    if (event === null || typeof event !== "object" || Array.isArray(event)) {
      return fail("AS-BI-001-INVALID-EVENT");
    }
    const allowedKeys = eventKeys.get(event.kind);
    if (allowedKeys && Object.keys(event).some(key => !allowedKeys.has(key))) {
      return fail("AS-BI-001-INVALID-EVENT");
    }
    if (event.kind === "start") {
      if (running) return fail("AS-BI-001-NESTED-RUN");
      if (typeof event.runId !== "string" || event.runId.length === 0 ||
          !Number.isInteger(event.pendingSafeWork) || event.pendingSafeWork < 0 ||
          typeof event.nextActionId !== "string" ||
          (event.pendingSafeWork > 0 && event.nextActionId.length === 0) ||
          (event.pendingSafeWork === 0 && event.nextActionId.length > 0)) {
        return fail("AS-BI-001-INVALID-START");
      }
      running = true;
      completedActionIds.clear();
      pendingSafeWork = event.pendingSafeWork;
      // A run starts without companion evidence. Seed the counter at the
      // limit so the first poll is blocked until the harness records the
      // exact selected action; accepted evidence resets it to zero.
      pollsSinceEvidence = behavioralInterlockContract.maxConsecutivePollsWithoutEvidence;
      emptyQueueExplained = false;
      state = {
        runId: event.runId,
        pendingSafeWork,
        pollsSinceEvidence,
        nextActionId: event.nextActionId
      };
      const stateBytes = Buffer.byteLength(JSON.stringify(state), "utf8");
      if (stateBytes > behavioralInterlockContract.maxInjectedStateBytes) {
        return fail("AS-BI-001-CONTEXT-BUDGET");
      }
      continue;
    }

    if (!running) return fail("AS-BI-001-NO-ACTIVE-RUN");

    if (event.kind === "evidence") {
      if ((!allowedEvidence.has(event.evidenceKind) && !systemEvolutionEvidence.has(event.evidenceKind)) ||
          typeof event.actionId !== "string" || event.actionId.length === 0 ||
          typeof event.nextActionId !== "string" ||
          typeof event.conflictsActiveInputs !== "boolean" ||
          typeof event.competesHighLoad !== "boolean") {
        return fail("AS-BI-001-INVALID-EVIDENCE");
      }
      const hasArtifactEvidence = "artifactEvidence" in event;
      const artifactEvidenceIsValid = Array.isArray(event.artifactEvidence)
        && event.artifactEvidence.length > 0
        && !event.artifactEvidence.some(item => typeof item !== "string" || item.trim().length === 0);
      if (hasArtifactEvidence && !artifactEvidenceIsValid) {
        return fail("AS-BI-001-INVALID-EVIDENCE");
      }
      if (systemEvolutionEvidence.has(event.evidenceKind)) {
        if (!systemEvolutionTargets.has(event.systemTarget) || !artifactEvidenceIsValid) {
          return fail("AS-BI-001-SYSTEM-EVIDENCE");
        }
      } else if ("systemTarget" in event) {
        return fail("AS-BI-001-INVALID-EVIDENCE");
      }
      if (event.conflictsActiveInputs) return fail("AS-BI-001-INPUT-CONFLICT");
      if (event.competesHighLoad) return fail("AS-BI-001-RESOURCE-CONFLICT");
      if (event.actionId !== state.nextActionId) return fail("AS-BI-001-WRONG-ACTION");
      if (completedActionIds.has(event.actionId)) return fail("AS-BI-001-EVIDENCE-REPLAY");
      completedActionIds.add(event.actionId);
      pendingSafeWork = Math.max(0, pendingSafeWork - 1);
      pollsSinceEvidence = 0;
      if ((pendingSafeWork > 0 && event.nextActionId.length === 0) ||
          (pendingSafeWork === 0 && event.nextActionId.length > 0)) {
        return fail("AS-BI-001-INVALID-EVIDENCE");
      }
      if (!refreshState(event.nextActionId)) return fail("AS-BI-001-CONTEXT-BUDGET");
      if (pendingSafeWork === 0) emptyQueueExplained = true;
      continue;
    }

    if (event.kind === "queue-empty") {
      if (typeof event.reason !== "string" || event.reason.trim().length === 0) {
        return fail("AS-BI-001-EMPTY-REASON");
      }
      if (pendingSafeWork !== 0) return fail("AS-BI-001-QUEUE-NOT-EMPTY");
      emptyQueueExplained = true;
      continue;
    }

    if (event.kind === "poll") {
      if (!Number.isInteger(event.waitedMs) || event.waitedMs < 0) {
        return fail("AS-BI-001-INVALID-POLL-TIME");
      }
      if (pendingSafeWork === 0 && !emptyQueueExplained) {
        return fail("AS-BI-001-EMPTY-REASON");
      }
      if (pendingSafeWork > 0 &&
          event.waitedMs > behavioralInterlockContract.maxIdleWaitMs) {
        return fail("AS-BI-001-WAIT-BUDGET");
      }
      if (pendingSafeWork > 0 && pollsSinceEvidence >=
          behavioralInterlockContract.maxConsecutivePollsWithoutEvidence) {
        return fail("AS-BI-001-IDLE-WAIT");
      }
      pollsSinceEvidence += 1;
      if (!refreshState()) return fail("AS-BI-001-CONTEXT-BUDGET");
      continue;
    }

    if (event.kind === "finish") {
      running = false;
      continue;
    }

    return fail("AS-BI-001-UNKNOWN-EVENT");
  }

  return { allowed: true, code: "OK" };
}

function parseTrace(path) {
  const trace = JSON.parse(readFileSync(path, "utf8"));
  if (trace === null || typeof trace !== "object" || Array.isArray(trace) ||
      Object.keys(trace).some(key => key !== "events") ||
      !Array.isArray(trace.events)) {
    throw new Error("trace JSON must match the behavioral interlock trace schema");
  }
  return trace.events;
}

export function runBehavioralInterlockCli(args, io = process) {
  if (args.length !== 2 || args[0] !== "--trace" || args[1].length === 0) {
    io.stderr.write("usage: node behavioral-interlock.mjs --trace <runtime-trace.json>\n");
    return 64;
  }
  try {
    const result = evaluateBehavioralInterlock(parseTrace(args[1]));
    io.stdout.write(`${JSON.stringify({ ruleId: behavioralInterlockContract.ruleId, ...result })}\n`);
    return result.allowed ? 0 : 2;
  } catch (error) {
    io.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 64;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = runBehavioralInterlockCli(process.argv.slice(2));
}
