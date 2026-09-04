import process from "node:process";

const MAX_INPUT_BYTES = 64 * 1024;
const chunks = [];
let inputBytes = 0;

for await (const chunk of process.stdin) {
  inputBytes += chunk.length;
  if (inputBytes > MAX_INPUT_BYTES) {
    process.stderr.write("AS-BI-001 hook input exceeds 64 KiB\n");
    process.exit(64);
  }
  chunks.push(chunk);
}

let event;
try {
  event = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
  process.stderr.write("AS-BI-001 hook requires one JSON event on stdin\n");
  process.exit(64);
}

if (event?.hook_event_name !== "PreToolUse" || event?.tool_name !== "Bash") {
  process.exit(0);
}

const additionalContext = [
  "AS-BI-001 wait interlock: if this command returns a live session, create a bounded,",
  "non-conflicting companion-work queue before polling it. Complete the exact next queued",
  "action or explicitly prove the queue empty before the first poll and every later poll.",
  "Progress text and memory writes are not work evidence. Codex",
  "write_stdin transport is not intercepted by PreToolUse, so do not claim this hook",
  "alone enforces polling behavior; retain an orchestrator trace and Stop-time audit."
].join(" ");

process.stdout.write(`${JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext
  }
})}\n`);
