import { readFileSync, realpathSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

export const digest = value => createHash('sha256').update(value).digest('hex');
export const catalogBytes = readFileSync(new URL('../workflows/catalog.v1.json', import.meta.url));
export const workflowCatalog = JSON.parse(catalogBytes);
const text = value => typeof value === 'string' && value.trim().length > 0;
const fail = code => ({ allowed: false, code });

export function validateWorkflowPlan(plan) {
  if (!plan || plan.schemaVersion !== 1 || !/^[a-zA-Z0-9_-]{1,80}$/.test(plan.runId ?? '')
      || plan.scopeAuthorized !== true || !text(plan.task?.summary) || !text(plan.selectionReason)) return fail('workflow-plan-invalid');
  const chosen = workflowCatalog.workflows.find(x => x.id === plan.workflowId);
  if (!chosen || !chosen.kinds.includes(plan.task.kind)) return fail('workflow-kind-mismatch');
  if (!Array.isArray(plan.stages) || !Array.isArray(plan.omittedStages)) return fail('workflow-stages-invalid');
  const selected = plan.stages.map(x => x.id);
  if (new Set(selected).size !== selected.length) return fail('workflow-stage-duplicate');
  if (chosen.stages.some(x => x.required && !selected.includes(x.id))) return fail('workflow-required-stage-missing');
  const ordered = chosen.stages.filter(x => selected.includes(x.id)).map(x => x.id);
  if (JSON.stringify(ordered) !== JSON.stringify(selected)) return fail('workflow-stage-order');
  const omitted = chosen.stages.filter(x => !selected.includes(x.id));
  if (plan.omittedStages.length !== omitted.length || omitted.some(x =>
      !plan.omittedStages.some(o => o.id === x.id && text(o.reason)))) return fail('workflow-omission-unexplained');
  for (const stage of plan.stages) {
    if (!Array.isArray(stage.inputs) || !stage.inputs.length || stage.inputs.some(x => !text(x))
        || !Array.isArray(stage.actions) || !Array.isArray(stage.checks) || !stage.checks.length
        || !Array.isArray(stage.repairs) || !Number.isInteger(stage.maxAttempts) || stage.maxAttempts < 1 || stage.maxAttempts > 5
        || !Number.isInteger(stage.maxDurationMs) || stage.maxDurationMs < 100 || stage.maxDurationMs > 3_600_000)
      return fail('workflow-stage-contract');
    if (stage.checks.some(c => !text(c.id)) || new Set(stage.checks.map(c => c.id)).size !== stage.checks.length)
      return fail('workflow-check-contract');
    for (const command of [...stage.actions, ...stage.checks.map(x => x.command), ...stage.repairs]) {
      if (!command || !text(command.executable) || !text(command.cwd) || !text(command.label)
          || !Array.isArray(command.args) || command.args.some(x => typeof x !== 'string')
          || !Number.isInteger(command.timeoutMs) || command.timeoutMs < 10 || command.timeoutMs > stage.maxDurationMs)
        return fail('workflow-command-contract');
    }
  }
  return { allowed: true, code: 'workflow-plan-ready', workflow: chosen };
}

// Hash declared input files and actual executable bytes; callers must declare the
// complete dependency set. This does not discover undeclared semantic dependencies.
export function stageFingerprint(stage) {
  const files = stage.inputs.map(path => [realpathSync(path), digest(readFileSync(path))]);
  const commands = [...stage.actions, ...stage.checks.map(x => x.command), ...stage.repairs].map(c => {
    if (!statSync(c.cwd).isDirectory()) throw Error('workflow-working-directory-missing');
    const executable = realpathSync(c.executable);
    return { executable, sha256: digest(readFileSync(executable)), args: c.args, cwd: resolve(c.cwd) };
  });
  return digest(JSON.stringify({ files, commands }));
}

export function validateWorkflowState(plan, state, verifyLocalLogs = false) {
  const choice = validateWorkflowPlan(plan);
  if (!choice.allowed || state.contractId !== 'AS-WF-001' || state.workflowId !== plan.workflowId
      || state.runId !== plan.runId || state.scopePreserved !== true || state.stages?.length !== plan.stages.length)
    return fail('workflow-state-binding');
  let unfinished = false;
  for (let i = 0; i < plan.stages.length; i++) {
    const row = state.stages[i], step = plan.stages[i];
    if (row.id !== step.id || row.label !== choice.workflow.stages.find(x => x.id === step.id).label
        || !Array.isArray(row.attempts) || row.attempts.length > step.maxAttempts) return fail('workflow-state-coverage');
    if (unfinished && row.status !== 'pending') return fail('workflow-stage-skip');
    if (row.status !== 'completed') { unfinished = true; continue; }
    const last = row.attempts.at(-1);
    if (!last || last.status !== 'passed' || last.verificationInputSha256 !== row.inputSha256
        || last.actions?.length !== step.actions.length || last.checks?.length !== step.checks.length)
      return fail('workflow-completion-unverified');
    for (const [j, record] of [...last.actions, ...last.checks].entries()) {
      if (record.status !== 'passed' || record.exitCode !== 0 || !/^[a-f0-9]{64}$/.test(record.stdoutSha256 ?? '')
          || !/^[a-f0-9]{64}$/.test(record.stderrSha256 ?? '') || !/^[a-f0-9]{64}$/.test(record.executableSha256 ?? ''))
        return fail('workflow-completion-unverified');
      if (j >= last.actions.length && record.id !== step.checks[j - last.actions.length].id)
        return fail('workflow-check-coverage');
      if (verifyLocalLogs && (digest(readFileSync(record.stdoutPath)) !== record.stdoutSha256
          || digest(readFileSync(record.stderrPath)) !== record.stderrSha256)) return fail('workflow-log-changed');
    }
  }
  if ((state.status === 'completed') !== state.stages.every(x => x.status === 'completed')) return fail('workflow-completion-unverified');
  return { allowed: true, code: 'workflow-state-valid' };
}

const labels = { pending: '대기', running: '실행 중', verifying: '검증 중', 'needs-rework': '수정 필요',
  retrying: '수정·재검증', blocked: '중단', cancelled: '취소', completed: '검증 완료' };
const cell = value => String(value).replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ');
export function renderWorkflow(state) {
  const current = state.stages.find(x => x.status !== 'completed');
  return `워크플로우: ${cell(state.workflowLabel)} (${state.workflowId}@${state.workflowVersion})\n`
    + `현재 단계: ${current ? `${state.stages.indexOf(current) + 1}/${state.stages.length} ${cell(current.label)}` : '전체 단계 검증 완료'}\n\n`
    + '| 단계 | 상태 | 검증·다음 행동 |\n| --- | --- | --- |\n'
    + state.stages.map((x, i) => `| ${i + 1}. ${cell(x.label)} | ${labels[x.status] ?? cell(x.status)} | ${cell(x.note ?? '실행 전')} |`).join('\n');
}
