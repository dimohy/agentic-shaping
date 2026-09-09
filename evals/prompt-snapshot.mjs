import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sha256 } from "./run-identity.mjs";

export const persistPromptSnapshot = (directory, prompt) => {
  const promptSha256 = sha256(prompt);
  const fileName = `prompt-${promptSha256}.md`;
  const path = join(directory, fileName);
  if (existsSync(path)) {
    const existing = readFileSync(path, "utf8");
    if (sha256(existing) !== promptSha256) throw new Error(`Prompt snapshot content mismatch: ${path}`);
  } else {
    writeFileSync(path, prompt);
  }
  return { fileName, promptSha256 };
};
