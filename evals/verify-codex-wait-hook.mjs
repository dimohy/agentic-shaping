import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const hookPath = join(root, "hooks", "codex-pretooluse-companion-queue.mjs");
const examplePath = join(root, "hooks", "codex-hooks.example.json");
let failures = 0;

function check(id, condition, detail = "") {
  if (condition) {
    process.stdout.write(`${id}: PASS\n`);
  } else {
    failures += 1;
    process.stderr.write(`${id}: FAIL${detail ? ` ${detail}` : ""}\n`);
  }
}

const bash = spawnSync(process.execPath, [hookPath], {
  input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "build" } }),
  encoding: "utf8"
});
const output = JSON.parse(bash.stdout);
const context = output?.hookSpecificOutput?.additionalContext ?? "";
check("codex-bash-hook-exits-zero", bash.status === 0);
check("codex-bash-hook-injects-contract", context.includes("AS-BI-001 wait interlock"));
check("codex-hook-requires-evidence-before-first-poll", context.includes("before the first poll and every later poll"));
check("codex-hook-has-no-orientation-poll-exception", !context.includes("orientation poll"));
check("codex-hook-discloses-transport-gap", context.includes("write_stdin transport is not intercepted"));
check("codex-hook-rejects-hard-enforcement-claim", context.includes("do not claim this hook alone enforces"));

const other = spawnSync(process.execPath, [hookPath], {
  input: JSON.stringify({ hook_event_name: "PreToolUse", tool_name: "update_plan", tool_input: {} }),
  encoding: "utf8"
});
check("codex-non-bash-hook-is-silent", other.status === 0 && other.stdout === "");

const malformed = spawnSync(process.execPath, [hookPath], { input: "not-json", encoding: "utf8" });
check("codex-malformed-hook-fails-closed", malformed.status === 64);

const example = JSON.parse(readFileSync(examplePath, "utf8"));
const handler = example?.hooks?.PreToolUse?.[0];
check("codex-hook-example-matches-bash", handler?.matcher === "Bash");
check("codex-hook-example-has-windows-command", Boolean(handler?.hooks?.[0]?.commandWindows));

if (failures > 0) process.exit(1);
process.stdout.write("[codex wait hook] PASS 10/10; first-poll evidence required, start-time context only, transport enforcement unclaimed.\n");
