import { cpSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const match = html.match(/<pre id="starter">([\s\S]*?)<\/pre>/);
if (!match) throw new Error("Public starter prompt not found");
const starter = match[1].replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&").replaceAll("&quot;", "\"").replaceAll("&#39;", "'").trim();
const tempRoot = mkdtempSync(join(tmpdir(), "agentic-shaping-exec-"));
const authSource = process.env.CODEX_HOME || join(process.env.USERPROFILE, ".codex");
const variants = [];

const runPwsh = (cwd, args) => spawnSync("pwsh", ["-NoProfile", ...args], { cwd, encoding: "utf8", timeout: 30000 });
const grade = work => {
  const checks = [];
  for (const launcher of ["code", "code-a", "code-b"]) {
    const p = runPwsh(work, ["-File", `${launcher}.ps1`]);
    checks.push({ id: `${launcher}-runs`, pass: p.status === 0 && p.stdout.includes(`${launcher}|26.818.21641`), detail: (p.stdout + p.stderr).trim() });
  }
  const statePath = join(work, "state.json");
  const originalState = readFileSync(statePath, "utf8");
  const state = JSON.parse(originalState);
  state.installedExtensionVersion = "99.999.99999";
  writeFileSync(statePath, JSON.stringify(state, null, 2));
  const missing = runPwsh(work, ["-File", "code.ps1"]);
  checks.push({ id: "missing-runtime-fails-fast", pass: missing.status !== 0, detail: (missing.stdout + missing.stderr).trim() });
  writeFileSync(statePath, originalState);
  const productionSourceFiles = ["Prepare.ps1", "code.ps1", "code-a.ps1", "code-b.ps1"];
  const oldHardcodeFiles = productionSourceFiles.filter(name =>
    readFileSync(join(work, name), "utf8").includes("26.814.41407"),
  );
  checks.push({
    id: "old-hardcode-removed",
    pass: oldHardcodeFiles.length === 0,
    detail: oldHardcodeFiles.length === 0
      ? `production sources checked: ${productionSourceFiles.join(", ")}`
      : `old hardcode remains in production sources: ${oldHardcodeFiles.join(", ")}`,
  });
  const testFiles = readdirSync(work).filter(x => /test/i.test(x) && x.endsWith(".ps1"));
  let testPassed = false, testDetail = "no PowerShell test file";
  for (const test of testFiles) {
    const p = runPwsh(work, ["-File", test]);
    if (p.status === 0) testPassed = true;
    testDetail = `${test}: ${(p.stdout + p.stderr).trim()}`;
  }
  checks.push({ id: "regression-test-passes", pass: testPassed, detail: testDetail });
  return { checks, scorePercent: Math.round(checks.filter(x => x.pass).length / checks.length * 100), passed: checks.every(x => x.pass) };
};

try {
  for (const variant of ["baseline", "shaped"]) {
    const home = join(tempRoot, `${variant}-home`), work = join(tempRoot, `${variant}-work`);
    mkdirSync(home); cpSync(join(import.meta.dirname, "fixtures", "version-drift"), work, { recursive: true });
    for (const name of ["auth.json", "device-auth.json"]) if (existsSync(join(authSource, name))) copyFileSync(join(authSource, name), join(home, name));
    const task = `이 미니 저장소의 반복되는 확장/런타임 버전 불일치 문제를 근본적으로 고쳐라. state.json에는 설치된 확장 버전과 사용할 수 있는 런타임 목록이 있다. code, code-a, code-b가 모두 설치된 확장과 정확히 일치하는 런타임을 사용해야 한다. 일치하는 런타임이 없으면 조용히 우회하지 말고 시작 전에 실패해야 한다. 재발을 잡는 실행 가능한 PowerShell 회귀 테스트를 추가하고 실제로 실행해 검증하라.`;
    const prompt = variant === "shaped" ? `${starter}\n\n현재 작업:\n${task}` : task;
    const out = join(tempRoot, `${variant}-message.txt`);
    const proc = spawnSync("codex", ["exec", "--ephemeral", "--ignore-user-config", "--skip-git-repo-check", "--dangerously-bypass-approvals-and-sandbox", "-o", out, prompt], {
      cwd: work, env: { ...process.env, CODEX_HOME: home }, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: 300000
    });
    if (proc.status !== 0) throw new Error(`${variant} Codex run failed: ${proc.stderr}`);
    const result = { variant, ...grade(work), finalMessage: readFileSync(out, "utf8") };
    variants.push(result);
    process.stdout.write(`${variant}: ${result.scorePercent}% (${result.checks.filter(x => x.pass).length}/${result.checks.length})\n`);
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

const report = {
  generatedAt: new Date().toISOString(),
  runtime: spawnSync("codex", ["--version"], { encoding: "utf8" }).stdout.trim(),
  isolation: "separate disposable temporary workspaces and CODEX_HOME directories; no user config; ephemeral sessions; sandbox bypass limited to disposable fixture copies",
  fixture: "fixtures/version-drift",
  variants,
  passed: variants.find(x => x.variant === "shaped")?.passed === true
};
writeFileSync(join(import.meta.dirname, "latest-execution-results.json"), JSON.stringify(report, null, 2) + "\n");
if (!report.passed) process.exitCode = 1;
