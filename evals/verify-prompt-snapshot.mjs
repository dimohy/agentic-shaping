import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { persistPromptSnapshot } from "./prompt-snapshot.mjs";

const root = mkdtempSync(join(tmpdir(), "agentic-shaping-prompt-snapshot-"));
try {
  const prompt = "frozen prompt\n";
  const first = persistPromptSnapshot(root, prompt);
  if (readFileSync(join(root, first.fileName), "utf8") !== prompt) throw new Error("Snapshot bytes changed");
  const second = persistPromptSnapshot(root, prompt);
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("Snapshot identity is not deterministic");
  writeFileSync(join(root, first.fileName), "corrupt");
  let rejected = false;
  try {
    persistPromptSnapshot(root, prompt);
  } catch (error) {
    rejected = String(error).includes("Prompt snapshot content mismatch");
  }
  if (!rejected) throw new Error("Corrupt content-addressed snapshot was accepted");
  process.stdout.write("PASS prompt snapshot: content-addressed, idempotent, corruption rejected 3/3\n");
} finally {
  rmSync(root, { recursive: true, force: true });
}
