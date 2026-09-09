import { evaluateCancellationTerminal } from "./cancellation-terminal.mjs";

const cancelled = {
  requestKind: "cancel",
  cancellationMechanism: "marker",
  processTerminated: true,
  completionRecord: { status: "cancelled", exitCode: 130, failureIds: ["CANCELLATION_REQUESTED"], orphanProcessIds: [] },
  orphanProcessCount: 0
};

const cases = [
  { id: "supported-marker-cancellation", trace: cancelled, allowed: true, code: "OK" },
  { id: "supported-api-cancellation", trace: { ...cancelled, cancellationMechanism: "api" }, allowed: true, code: "OK" },
  { id: "raw-kill-without-record", trace: { ...cancelled, cancellationMechanism: "raw-kill", completionRecord: null }, allowed: false, code: "AS-CT-001-UNSUPPORTED-CANCELLATION" },
  { id: "marker-without-record", trace: { ...cancelled, completionRecord: null }, allowed: false, code: "AS-CT-001-MISSING-TERMINAL-RECORD" },
  { id: "orphan-survives", trace: { ...cancelled, orphanProcessCount: 1 }, allowed: false, code: "AS-CT-001-INCOMPLETE-TERMINATION" },
  { id: "natural-exit-unchanged", trace: { requestKind: "natural", cancellationMechanism: "none", processTerminated: true, completionRecord: { status: "passed", exitCode: 0, failureIds: [], orphanProcessIds: [] }, orphanProcessCount: 0 }, allowed: true, code: "OK" },
  { id: "natural-success-record-with-orphan", trace: { requestKind: "natural", cancellationMechanism: "none", processTerminated: true, completionRecord: { status: "passed", exitCode: 0, failureIds: [], orphanProcessIds: [4242] }, orphanProcessCount: 0 }, allowed: false, code: "AS-CT-001-INVALID-NATURAL-EXIT" }
];

let passed = 0;
for (const test of cases) {
  const actual = evaluateCancellationTerminal(test.trace);
  if (actual.allowed !== test.allowed || actual.code !== test.code) {
    console.error(JSON.stringify({ id: test.id, expected: test, actual }));
    process.exit(1);
  }
  passed += 1;
}
console.log(`[cancellation terminal] PASS ${passed}/${cases.length}; rule AS-CT-001.`);
console.log(JSON.stringify({ ruleId: "AS-CT-001", exitCode: 0, total: cases.length, passed, forbiddenActions: 0 }));
