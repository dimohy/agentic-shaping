import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { runWorkflow } from '../scripts/run-workflow.mjs';
import { validateWorkflowPlan, validateWorkflowState, renderWorkflow } from './workflow-execution.mjs';

const root = mkdtempSync(join(tmpdir(), 'as-workflow-'));
const results = [];
let number = 0;
function fixture() {
  const dir = join(root, String(++number)); mkdirSync(dir);
  const input = join(dir, 'input.txt'), marker = join(dir, 'successor.txt'); writeFileSync(input, 'ok');
  const cmd = (label, code, timeoutMs = 2000) => ({ executable: process.execPath, cwd: dir, label,
    args: ['-e', code], timeoutMs });
  const verify = cmd('실제 파일 내용 검사', `if(require('fs').readFileSync(${JSON.stringify(input)},'utf8').trim()!=='ok')process.exit(1)`);
  const stage = id => ({ id, inputs: [input], actions: [], checks: [{ id: 'actual-file', command: verify }], repairs: [], maxAttempts: 3, maxDurationMs: 15_000 });
  const plan = { schemaVersion: 1, runId: `run-${number}`, scopeAuthorized: true, task: { kind: 'simple-task', summary: '파일 수정과 확인' },
    workflowId: 'simple-task', selectionReason: '간단한 파일 처리이므로 처리·검증 두 단계를 선택함', omittedStages: [], stages: [stage('act'), stage('verify')] };
  plan.stages[1].actions = [cmd('후속 단계 표시', `require('fs').writeFileSync(${JSON.stringify(marker)},'executed')`)];
  const planPath = join(dir, 'plan.json'), statePath = join(dir, 'state.json');
  const save = () => writeFileSync(planPath, JSON.stringify(plan)); save();
  return { dir, input, marker, cmd, plan, planPath, statePath, save };
}
async function test(name, run) { await run(); results.push({ name, passed: true }); }
try {
  await test('normal-real-execution-and-display', async () => {
    const f = fixture(), displays = []; const s = await runWorkflow(f.planPath, f.statePath, { onDisplay: text => displays.push(text) });
    assert.equal(s.status, 'completed'); assert.ok(existsSync(f.marker)); assert.ok(displays.some(x => x.includes('검증 중')));
    assert.equal(renderWorkflow(s).includes('전체 단계 검증 완료'), true);
    if (process.env.AS_WORKFLOW_EVIDENCE_DIR) {
      mkdirSync(process.env.AS_WORKFLOW_EVIDENCE_DIR, { recursive: true });
      writeFileSync(join(process.env.AS_WORKFLOW_EVIDENCE_DIR, 'normal-state.json'), JSON.stringify(s, null, 2));
      writeFileSync(join(process.env.AS_WORKFLOW_EVIDENCE_DIR, 'normal-plan.json'), readFileSync(f.planPath));
      writeFileSync(join(process.env.AS_WORKFLOW_EVIDENCE_DIR, 'normal-display.md'), renderWorkflow(s));
    }
  });
  for (const [name, mutate, code] of [
    ['missing-required-stage', p => p.stages.pop(), 'workflow-required-stage-missing'],
    ['wrong-workflow-kind', p => p.task.kind = 'research', 'workflow-kind-mismatch'],
    ['stage-order', p => p.stages.reverse(), 'workflow-stage-order'],
    ['missing-verifier', p => p.stages[0].checks = [], 'workflow-stage-contract'],
    ['unauthorized-scope', p => p.scopeAuthorized = false, 'workflow-plan-invalid']
  ]) await test(name, async () => { const f = fixture(); mutate(f.plan); f.save();
    assert.equal(validateWorkflowPlan(f.plan).code, code); await assert.rejects(runWorkflow(f.planPath, f.statePath), new RegExp(code));
    assert.equal(existsSync(f.marker), false);
  });
  await test('unexplained-optional-omission', async () => { const f = fixture(); f.plan.workflowId = 'system-change'; f.plan.task.kind = 'system-change';
    f.plan.stages = ['define','implement','verify','apply'].map(id => ({ ...f.plan.stages[0], id }));
    assert.equal(validateWorkflowPlan(f.plan).code, 'workflow-omission-unexplained'); });
  await test('out-of-order-launch', async () => { const f = fixture(); await assert.rejects(runWorkflow(f.planPath, f.statePath, { step: 'verify' }), /out-of-order/); assert.equal(existsSync(f.marker), false); });
  await test('failed-verifier-blocks-successor', async () => { const f = fixture(); writeFileSync(f.input, 'bad');
    const s = await runWorkflow(f.planPath, f.statePath); assert.equal(s.status, 'needs-rework'); assert.equal(s.stages[1].status, 'pending'); assert.equal(existsSync(f.marker), false); });
  await test('repair-and-reverification-loop', async () => { const f = fixture(); writeFileSync(f.input, 'bad');
    f.plan.stages[0].repairs = [f.cmd('수정', `require('fs').writeFileSync(${JSON.stringify(f.input)},'ok')`)]; f.save();
    const s = await runWorkflow(f.planPath, f.statePath); assert.equal(s.status, 'completed'); assert.equal(s.stages[0].attempts.length, 2);
    assert.equal(s.stages[0].attempts[0].checks[0].exitCode, 1); assert.equal(s.stages[0].attempts[1].checks[0].exitCode, 0);
  });
  await test('unchanged-retry-is-blocked', async () => { const f = fixture(); writeFileSync(f.input, 'bad');
    f.plan.stages[0].repairs = [f.cmd('변경 없는 수정', 'process.exit(0)')]; f.save();
    const s = await runWorkflow(f.planPath, f.statePath); assert.equal(s.status, 'needs-rework'); assert.equal(s.stages[0].attempts.length, 1); });
  await test('resume-keeps-retry-budget', async () => { const f = fixture(); writeFileSync(f.input, 'bad'); f.plan.stages[0].maxAttempts = 1; f.save();
    await runWorkflow(f.planPath, f.statePath); writeFileSync(f.input, 'ok');
    const s = await runWorkflow(f.planPath, f.statePath, { resume: true }); assert.equal(s.status, 'blocked'); assert.equal(existsSync(f.marker), false); });
  await test('stale-input-invalidates-completed-stages', async () => { const f = fixture(); await runWorkflow(f.planPath, f.statePath);
    writeFileSync(f.input, 'ok\n'); const s = await runWorkflow(f.planPath, f.statePath, { resume: true });
    assert.equal(s.status, 'completed'); assert.equal(s.stages[0].history[0].reason, 'inputs-changed'); });
  await test('later-action-cannot-leave-stale-earlier-completion', async () => { const f = fixture();
    f.plan.stages[1].actions = [f.cmd('이전 입력 변경', `require('fs').appendFileSync(${JSON.stringify(f.input)},${JSON.stringify('\n')})`)]; f.save();
    const s = await runWorkflow(f.planPath, f.statePath); assert.equal(s.status, 'needs-rework');
    assert.equal(s.stages[0].status, 'pending'); assert.notEqual(s.status, 'completed'); });
  await test('changed-plan-cannot-resume', async () => { const f = fixture(); await runWorkflow(f.planPath, f.statePath);
    f.plan.selectionReason += ' changed'; f.save(); await assert.rejects(runWorkflow(f.planPath, f.statePath, { resume: true }), /resume-plan-changed/); });
  await test('explicit-dependency-revision-retains-history', async () => { const f = fixture(); await runWorkflow(f.planPath, f.statePath);
    const previous = join(f.dir, 'previous.json'); writeFileSync(previous, readFileSync(f.planPath));
    const added = join(f.dir, 'added.txt'); writeFileSync(added, 'dependency'); f.plan.stages[0].inputs.push(added); f.save();
    const s = await runWorkflow(f.planPath, f.statePath, { resume: true, replanFrom: previous, reason: '확인한 추가 입력을 검증 범위에 포함' });
    assert.equal(s.status, 'completed'); assert.equal(s.planHistory.length, 1); assert.ok(s.stages[0].history.length > 0); });
  await test('dependency-revision-cannot-weaken-checks', async () => { const f = fixture(); await runWorkflow(f.planPath, f.statePath);
    const previous = join(f.dir, 'previous.json'); writeFileSync(previous, readFileSync(f.planPath));
    f.plan.stages[0].checks[0].command = f.cmd('가짜 통과', 'process.exit(0)'); f.save();
    await assert.rejects(runWorkflow(f.planPath, f.statePath, { resume: true, replanFrom: previous, reason: '변경' }), /replan-scope-or-check-change/); });
  await test('dependency-revision-cannot-remove-inputs', async () => { const f = fixture();
    const added = join(f.dir, 'second.txt'); writeFileSync(added, 'dependency'); f.plan.stages[0].inputs.push(added); f.save();
    await runWorkflow(f.planPath, f.statePath); const previous = join(f.dir, 'previous.json'); writeFileSync(previous, readFileSync(f.planPath));
    f.plan.stages[0].inputs.pop(); f.save();
    await assert.rejects(runWorkflow(f.planPath, f.statePath, { resume: true, replanFrom: previous, reason: '변경' }), /replan-scope-or-check-change/); });
  await test('forged-completion-is-rejected-on-resume', async () => { const f = fixture(); const s = await runWorkflow(f.planPath, f.statePath);
    s.stages[0].attempts[0].checks[0].exitCode = 1; writeFileSync(f.statePath, JSON.stringify(s));
    await assert.rejects(runWorkflow(f.planPath, f.statePath, { resume: true }), /completion-unverified/); });
  await test('changed-log-is-rejected-on-resume', async () => { const f = fixture(); const s = await runWorkflow(f.planPath, f.statePath);
    writeFileSync(s.stages[0].attempts[0].checks[0].stdoutPath, 'changed');
    await assert.rejects(runWorkflow(f.planPath, f.statePath, { resume: true }), /log-changed/); });
  await test('completed-successor-cannot-bypass-unfinished-stage', async () => { const f = fixture(); const s = await runWorkflow(f.planPath, f.statePath);
    s.stages[0].status = 'pending'; assert.equal(validateWorkflowState(f.plan, s).code, 'workflow-stage-skip'); });
  await test('parallel-writer-is-blocked', async () => { const f = fixture(); mkdirSync(f.statePath + '.lock'); await assert.rejects(runWorkflow(f.planPath, f.statePath), /EEXIST/); });
  await test('timeout-kills-child-and-blocks-successor', async () => { const f = fixture(); f.plan.stages[0].checks[0].command = f.cmd('시간 초과',
    `setTimeout(()=>require('fs').writeFileSync(${JSON.stringify(f.marker)},'orphan'),800)`, 100); f.save();
    const s = await runWorkflow(f.planPath, f.statePath); assert.equal(s.stages[0].attempts[0].checks[0].status, 'timeout');
    await sleep(900); assert.equal(existsSync(f.marker), false); });
  await test('cancel-kills-child-and-keeps-unverified', async () => { const f = fixture(); f.plan.stages[0].checks[0].command = f.cmd('취소 대상', 'setTimeout(()=>{},5000)'); f.save();
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 120);
    const s = await runWorkflow(f.planPath, f.statePath, { signal: controller.signal }); clearTimeout(timer);
    assert.equal(s.status, 'cancelled'); assert.notEqual(s.stages[0].status, 'completed'); assert.equal(existsSync(f.marker), false); });
  const report = { passed: true, count: results.length, cases: results };
  if (process.env.AS_WORKFLOW_EVIDENCE_DIR) writeFileSync(join(process.env.AS_WORKFLOW_EVIDENCE_DIR, 'runner-tests.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`AS-WF-001 PASS ${results.length}/${results.length}`);
} finally { rmSync(root, { recursive: true, force: true }); }
