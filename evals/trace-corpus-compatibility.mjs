import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateUnstructuredToStructured } from "./unstructured-to-structured.mjs";

const ruleId = "AS-US-COMPAT-001";

const collectTraceFiles = root => {
  const files = [];
  const visit = path => {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile() && entry.name.toLowerCase() === "as-us-001.json") files.push(child);
    }
  };
  visit(root);
  return files.sort((left, right) => left.localeCompare(right));
};

export function evaluateTraceCorpusCompatibility(traceRoots) {
  if (!Array.isArray(traceRoots) || traceRoots.length === 0) {
    return { ruleId, allowed: false, code: `${ruleId}-MISSING-TRACE-ROOT`, total: 0, passed: 0, failures: [] };
  }

  const failures = [];
  const files = [];
  for (const value of traceRoots) {
    const root = resolve(value);
    if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
      failures.push({ path: root, code: `${ruleId}-INVALID-TRACE-ROOT` });
      continue;
    }
    files.push(...collectTraceFiles(root));
  }
  if (files.length === 0) {
    return { ruleId, allowed: false, code: `${ruleId}-EMPTY-CORPUS`, total: 0, passed: 0, failures };
  }

  let passed = 0;
  for (const path of files) {
    let trace;
    try {
      trace = JSON.parse(readFileSync(path, "utf8"));
    } catch {
      failures.push({ path, code: `${ruleId}-MALFORMED-TRACE` });
      continue;
    }
    const result = evaluateUnstructuredToStructured(trace);
    if (result.allowed) passed++;
    else failures.push({ path, code: result.code });
  }
  const allowed = failures.length === 0 && passed === files.length;
  return {
    ruleId,
    allowed,
    code: allowed ? `${ruleId}-COMPATIBLE` : `${ruleId}-INCOMPATIBLE`,
    total: files.length,
    passed,
    failures,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const roots = [];
  for (let index = 2; index < process.argv.length; index++) {
    if (process.argv[index] === "--trace-root" && process.argv[index + 1]) roots.push(process.argv[++index]);
  }
  const result = evaluateTraceCorpusCompatibility(roots);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.allowed) process.exitCode = result.code.endsWith("MISSING-TRACE-ROOT") ? 64 : 2;
}
