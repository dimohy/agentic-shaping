import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync, openSync, closeSync, writeSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { catalogBytes, digest, renderWorkflow, stageFingerprint, validateWorkflowPlan, validateWorkflowState } from '../evals/workflow-execution.mjs';

export async function runWorkflow(planPath, statePath, options = {}) {
  planPath = resolve(planPath); statePath = resolve(statePath);
  const raw = readFileSync(planPath), plan = JSON.parse(raw), decision = validateWorkflowPlan(plan);
  if (!decision.allowed) throw Error(decision.code);
  // Probe every declared file/executable before launching any action.
  plan.stages.forEach(stageFingerprint);
  mkdirSync(dirname(statePath), { recursive: true });
  const lock = `${statePath}.lock`;
  mkdirSync(lock); // Concurrent writers and abandoned locks fail closed.
  writeFileSync(join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, startedUtc: new Date().toISOString() }));
  let state, cancelled = false, activeChild, lastDisplay;
  const stopChild = child => {
    if (!child?.pid) return;
    if (process.platform === 'win32') spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else { try { process.kill(-child.pid, 'SIGKILL'); } catch {} }
  };
  const cancel = () => { cancelled = true; stopChild(activeChild); };
  process.on('SIGINT', cancel); process.on('SIGTERM', cancel);
  options.signal?.addEventListener('abort', cancel, { once: true });
  const save = () => {
    state.updatedUtc = new Date().toISOString();
    writeFileSync(`${statePath}.tmp`, JSON.stringify(state, null, 2) + '\n');
    renameSync(`${statePath}.tmp`, statePath);
    const display = renderWorkflow(state);
    writeFileSync(`${statePath}.md`, display + '\n');
    if (display !== lastDisplay) options.onDisplay?.(display);
    lastDisplay = display;
  };
  const invalidateFrom = index => {
    for (const row of state.stages.slice(index)) {
      row.history = [...(row.history ?? []), { reason: 'inputs-changed', inputSha256: row.inputSha256,
        startedUtc: row.startedUtc, attempts: row.attempts }];
      row.status = 'pending'; row.attempts = []; row.inputSha256 = null;
      row.note = '입력이 바뀌어 다시 검증합니다'; delete row.startedUtc;
    }
  };
  const staleCompleted = () => state.stages.findIndex((x, i) => x.status === 'completed'
    && x.inputSha256 !== stageFingerprint(plan.stages[i]));
  try {
    if (existsSync(statePath)) {
      if (!options.resume) throw Error('workflow-state-exists-use-resume');
      state = JSON.parse(readFileSync(statePath, 'utf8'));
      let dependencyRevision = -1;
      if (state.planSha256 !== digest(raw) && options.replanFrom && options.reason?.trim()) {
        const previousRaw = readFileSync(options.replanFrom), previous = JSON.parse(previousRaw);
        if (digest(previousRaw) !== state.planSha256) throw Error('workflow-replan-source-mismatch');
        const withoutInputs = value => ({ ...value, stages: value.stages.map(({ inputs, ...rest }) => rest) });
        if (JSON.stringify(withoutInputs(previous)) !== JSON.stringify(withoutInputs(plan))
            || previous.stages.some((stage, i) => stage.inputs.some(path => !plan.stages[i].inputs.includes(path))))
          throw Error('workflow-replan-scope-or-check-change');
        dependencyRevision = plan.stages.findIndex((stage, i) => JSON.stringify(stage.inputs) !== JSON.stringify(previous.stages[i].inputs));
        if (dependencyRevision < 0) throw Error('workflow-replan-without-new-dependencies');
        state.planHistory = [...(state.planHistory ?? []), { previousPlanSha256: state.planSha256,
          nextPlanSha256: digest(raw), reason: options.reason, atUtc: new Date().toISOString(), firstAffectedStage: plan.stages[dependencyRevision].id }];
        state.planSha256 = digest(raw);
      }
      if (state.planSha256 !== digest(raw) || state.catalogSha256 !== digest(catalogBytes)) throw Error('workflow-resume-plan-changed');
      if (state.activeCommand?.pid) throw Error('workflow-interrupted-child-requires-inspection');
      const stateDecision = validateWorkflowState(plan, state, true);
      if (!stateDecision.allowed) throw Error(stateDecision.code);
      const observedStale = staleCompleted();
      const stale = dependencyRevision < 0 ? observedStale : observedStale < 0 ? dependencyRevision : Math.min(dependencyRevision, observedStale);
      if (stale >= 0) invalidateFrom(stale);
    } else {
      state = { schemaVersion: 1, contractId: 'AS-WF-001', runId: plan.runId, planSha256: digest(raw),
        catalogSha256: digest(catalogBytes), workflowId: decision.workflow.id, workflowVersion: JSON.parse(catalogBytes).version,
        workflowLabel: decision.workflow.label, taskKind: plan.task.kind, selectionReason: plan.selectionReason,
        scopePreserved: true, status: 'running', stages: plan.stages.map(x => ({ id: x.id,
          label: decision.workflow.stages.find(s => s.id === x.id).label, status: 'pending', attempts: [], note: '실행 전' })) };
    }
    const currentIndex = state.stages.findIndex(x => x.status !== 'completed');
    if (options.step && state.stages[currentIndex]?.id !== options.step) throw Error('workflow-out-of-order-launch');
    save();
    async function execute(command, stage, row, attempt, type, index) {
      if (cancelled) return { status: 'cancelled', exitCode: null };
      const remaining = stage.maxDurationMs - (Date.now() - Date.parse(row.startedUtc));
      if (remaining <= 0) return { status: 'timeout', exitCode: null };
      const logDir = `${statePath}.logs`; mkdirSync(logDir, { recursive: true });
      const prefix = `${row.id}-${row.history?.length ?? 0}-${attempt.number}-${type}-${index}`;
      const stdoutPath = join(logDir, `${prefix}.stdout.log`), stderrPath = join(logDir, `${prefix}.stderr.log`);
      const out = openSync(stdoutPath, 'wx'), err = openSync(stderrPath, 'wx');
      const result = { label: command.label, executableSha256: digest(readFileSync(command.executable)),
        startedUtc: new Date().toISOString(), status: 'running', exitCode: null, stdoutPath, stderrPath };
      let timedOut = false, overflow = false, bytes = 0;
      const child = spawn(command.executable, command.args, { cwd: command.cwd, shell: false,
        windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
      activeChild = child; state.activeCommand = { pid: child.pid, stageId: row.id, label: command.label }; save();
      const timer = setTimeout(() => { timedOut = true; stopChild(child); }, Math.min(command.timeoutMs, remaining));
      for (const [stream, fd] of [[child.stdout, out], [child.stderr, err]]) stream.on('data', buffer => {
        bytes += buffer.length;
        if (bytes > 16 * 1024 * 1024) { overflow = true; stopChild(child); return; }
        writeSync(fd, buffer);
      });
      await new Promise(resolve => { child.once('error', e => { result.error = e.message; }); child.once('close', (code, signal) => {
        result.exitCode = code; result.signal = signal; resolve();
      }); });
      clearTimeout(timer); closeSync(out); closeSync(err); activeChild = undefined; delete state.activeCommand;
      result.finishedUtc = new Date().toISOString();
      result.status = cancelled ? 'cancelled' : timedOut ? 'timeout' : overflow ? 'log-limit' : result.exitCode === 0 ? 'passed' : 'failed';
      result.stdoutSha256 = digest(readFileSync(stdoutPath)); result.stderrSha256 = digest(readFileSync(stderrPath));
      save(); return result;
    }
    for (let i = 0; i < plan.stages.length; i++) {
      const stage = plan.stages[i], row = state.stages[i];
      if (row.status === 'completed') continue;
      const stale = staleCompleted();
      if (stale >= 0) { invalidateFrom(stale); state.status = 'needs-rework'; save(); return state; }
      row.startedUtc ??= new Date().toISOString();
      while (!cancelled && row.attempts.length < stage.maxAttempts && Date.now() - Date.parse(row.startedUtc) < stage.maxDurationMs) {
        const input = stageFingerprint(stage), last = row.attempts.at(-1);
        if (last && last.status === 'failed' && last.inputSha256 === input) {
          row.status = 'needs-rework'; row.note = '같은 실패 입력의 재실행을 중단했습니다'; break;
        }
        const attempt = { number: row.attempts.length + 1, inputSha256: input, actions: [], checks: [], repairs: [], status: 'running' };
        row.attempts.push(attempt); row.status = 'running'; state.status = 'running'; row.note = `시도 ${attempt.number}/${stage.maxAttempts}`; save();
        for (let j = 0; j < stage.actions.length; j++) {
          const result = await execute(stage.actions[j], stage, row, attempt, 'action', j); attempt.actions.push(result);
          if (result.status !== 'passed') break;
        }
        const actionPassed = attempt.actions.length === stage.actions.length && attempt.actions.every(x => x.status === 'passed');
        if (actionPassed && !cancelled) {
          attempt.verificationInputSha256 = stageFingerprint(stage);
          row.status = 'verifying'; row.note = '단계 완료 조건 검사 중'; save();
          for (let j = 0; j < stage.checks.length; j++) {
            const result = await execute(stage.checks[j].command, stage, row, attempt, 'check', j);
            attempt.checks.push({ id: stage.checks[j].id, ...result });
            if (result.status !== 'passed') break;
          }
        }
        if (!cancelled && actionPassed && attempt.checks.length === stage.checks.length && attempt.checks.every(x => x.status === 'passed')
            && attempt.verificationInputSha256 === stageFingerprint(stage)) {
          attempt.status = 'passed'; row.status = 'completed'; row.inputSha256 = stageFingerprint(stage);
          row.note = `검증 ${attempt.checks.length}/${stage.checks.length} 통과`; save(); break;
        }
        attempt.status = cancelled ? 'cancelled' : 'failed';
        if (!cancelled && stage.repairs.length && row.attempts.length < stage.maxAttempts) {
          row.status = 'retrying'; row.note = '실패한 단계 수정 후 재검증'; save();
          for (let j = 0; j < stage.repairs.length; j++) {
            const result = await execute(stage.repairs[j], stage, row, attempt, 'repair', j); attempt.repairs.push(result);
            if (result.status !== 'passed') break;
          }
          if (attempt.repairs.every(x => x.status === 'passed')) continue;
        }
        row.status = cancelled ? 'cancelled' : 'needs-rework'; row.note = '검증 미완료: 다음 단계 실행 금지'; save(); break;
      }
      if (row.status !== 'completed') {
        if (row.attempts.length >= stage.maxAttempts || Date.now() - Date.parse(row.startedUtc) >= stage.maxDurationMs) {
          row.status = 'blocked'; row.note = '정해 둔 시도·시간 한도에 도달했습니다';
        }
        state.status = cancelled ? 'cancelled' : row.status; save(); return state;
      }
      if (options.step) break;
    }
    const stale = staleCompleted();
    if (stale >= 0) { invalidateFrom(stale); state.status = 'needs-rework'; save(); return state; }
    state.status = state.stages.every(x => x.status === 'completed') ? 'completed' : 'running'; save(); return state;
  } finally {
    process.off('SIGINT', cancel); process.off('SIGTERM', cancel); options.signal?.removeEventListener('abort', cancel);
    rmSync(lock, { recursive: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [plan, state, ...args] = process.argv.slice(2);
  const parsed = {}; let valid = true;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--resume') parsed.resume = true;
    else if (['--step', '--replan-from', '--reason'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) {
      parsed[args[i] === '--step' ? 'step' : args[i] === '--replan-from' ? 'replanFrom' : 'reason'] = args[++i];
    } else { valid = false; break; }
  }
  if (!plan || !state || !valid || (parsed.replanFrom && (!parsed.reason || !parsed.resume))) {
    console.error('Usage: run-workflow.mjs PLAN STATE [--resume] [--step ID] [--replan-from PREVIOUS --reason TEXT]'); process.exitCode = 64;
  }
  else try {
    const result = await runWorkflow(plan, state, { ...parsed,
      onDisplay: text => process.stdout.write(text + '\n\n') });
    process.exitCode = result.status === 'completed' || (parsed.step && result.status === 'running') ? 0 : 2;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
