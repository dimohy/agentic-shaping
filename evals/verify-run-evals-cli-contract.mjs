import { spawnSync } from "node:child_process";
import { join } from "node:path";

const runner = join(import.meta.dirname, "run-evals.mjs");
const rejected = spawnSync(process.execPath, [runner, "--validate-only"], {
  encoding: "utf8",
  env: process.env,
});
if (rejected.status === 0) throw new Error("Unsupported CLI arguments must fail before evaluation starts");
if (!`${rejected.stdout}${rejected.stderr}`.includes("accepts no CLI arguments")) {
  throw new Error("Unsupported CLI argument failure must provide actionable guidance");
}

const accepted = spawnSync(process.execPath, [runner], {
  encoding: "utf8",
  env: {
    ...process.env,
    AGENTIC_SHAPING_EVAL_SUITE: "interlock-activation-cases.json",
    AGENTIC_SHAPING_EVAL_RESULT: "interlock-activation-latest-results.json",
    AGENTIC_SHAPING_EVAL_MODE: "development",
    AGENTIC_SHAPING_EVAL_VALIDATE_ONLY: "1",
  },
});
if (accepted.status !== 0) throw new Error(`Environment-configured validation failed: ${accepted.stderr}`);
if (!accepted.stdout.includes("VALIDATION PASS")) {
  throw new Error("Environment-configured validation did not report success");
}

process.stdout.write("run-evals CLI contract PASS: unsupported arguments fail fast; environment validation succeeds\n");
