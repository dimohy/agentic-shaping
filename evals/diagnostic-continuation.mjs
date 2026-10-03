import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const nonempty = x => typeof x === 'string' && x.trim().length > 0;
const hash = x => typeof x === 'string' && /^[a-f0-9]{64}$/i.test(x);
const integer = x => Number.isSafeInteger(x) && x >= 0;
const keys = (x, required) => x && typeof x === 'object' && !Array.isArray(x)
  && Object.keys(x).length === required.length && required.every(k => Object.hasOwn(x,k));
const fail = code => ({ allowed:false, code:`AS-DC-001-${code}` });
const reference = x => keys(x,['path','sha256']) && nonempty(x.path) && hash(x.sha256);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// The caller supplies actual files, never a model-authored evidence-authority string.
export function evaluateDiagnosticContinuation(p, read = readFileSync) {
  if (!keys(p,['ruleId','purpose','completionMode','mode','authorizedScope','requestedScope',
    'inputFingerprint','acceptance','command','maximumWholeInputRuns','priorRuns',
    'targetIds','outcomes','observation','alternatives','evidence'])
    || p.ruleId !== 'AS-DC-001' || !['diagnostic','acceptance'].includes(p.purpose)
    || !['diagnostic-only','acceptance'].includes(p.completionMode)
    || !['focused','whole-input'].includes(p.mode)
    || !nonempty(p.authorizedScope) || !nonempty(p.requestedScope) || !hash(p.inputFingerprint)
    || !keys(p.acceptance,['inputFingerprint','timeoutMs']) || !hash(p.acceptance.inputFingerprint)
    || !integer(p.acceptance.timeoutMs) || p.acceptance.timeoutMs === 0
    || !keys(p.command,['executable','args','cwd','expectedCostMs','timeoutMs'])
    || !nonempty(p.command.executable) || !nonempty(p.command.cwd)
    || !Array.isArray(p.command.args) || !p.command.args.every(x=>typeof x==='string')
    || !integer(p.command.expectedCostMs) || !integer(p.command.timeoutMs) || p.command.timeoutMs === 0
    || !integer(p.maximumWholeInputRuns) || !Array.isArray(p.priorRuns)
    || !p.priorRuns.every(x=>keys(x,['mode','record']) && ['focused','whole-input'].includes(x.mode) && reference(x.record))
    || !Array.isArray(p.evidence) || p.evidence.length === 0 || !p.evidence.every(reference)
    || !Array.isArray(p.targetIds) || !p.targetIds.every(nonempty) || new Set(p.targetIds).size!==p.targetIds.length
    || !Array.isArray(p.outcomes) || !p.outcomes.every(x=>keys(x,['id','remainingIds']) && nonempty(x.id)
      && Array.isArray(x.remainingIds) && x.remainingIds.every(nonempty))
    || !keys(p.observation,['stride','maximumRecords','requiredRecords'])
    || !Object.values(p.observation).every(integer)
    || !Array.isArray(p.alternatives) || !p.alternatives.every(x=>keys(x,['kind','disposition','reason','record','expectedCostMs'])
      && ['source-review','focused-reproduction','checkpoint-reuse'].includes(x.kind)
      && ['available','exhausted','unavailable'].includes(x.disposition)
      && typeof x.reason === 'string' && reference(x.record) && integer(x.expectedCostMs))) return fail('INVALID-PLAN');
  if (p.authorizedScope !== p.requestedScope) return fail('SCOPE');
  if ((p.purpose === 'diagnostic' && p.completionMode !== 'diagnostic-only')
    || (p.purpose === 'acceptance' && (p.completionMode !== 'acceptance'
      || p.inputFingerprint !== p.acceptance.inputFingerprint
      || p.command.timeoutMs !== p.acceptance.timeoutMs))) return fail('ACCEPTANCE');
  const refs=[...p.evidence,...p.priorRuns.map(x=>x.record),...p.alternatives.map(x=>x.record)];
  const files=new Map();
  for (const ref of refs) {
    let bytes;
    try { bytes=read(ref.path); } catch { return fail('EVIDENCE-DRIFT'); }
    if (sha256(bytes).toLowerCase()!==ref.sha256.toLowerCase()) return fail('EVIDENCE-DRIFT');
    files.set(ref.path,bytes);
  }
  for (const run of p.priorRuns) {
    let record;
    try { record=JSON.parse(files.get(run.record.path)); } catch { return fail('INVALID-PLAN'); }
    if (!['passed','failed','timed-out','cancelled','observed'].includes(record.status)
      || !(record.inputsStable===true || record.inputStable===true)
      || record.processesStopped!==true) return fail('INVALID-PLAN');
  }
  if (p.purpose==='acceptance') return {allowed:true,code:'OK'};
  if (p.mode==='whole-input' && p.priorRuns.filter(x=>x.mode==='whole-input').length >= p.maximumWholeInputRuns) return fail('BUDGET');
  const covered=new Set(p.outcomes.flatMap(x=>x.remainingIds));
  if (p.targetIds.length<2 || p.outcomes.length<2 || new Set(p.outcomes.map(x=>x.id)).size!==p.outcomes.length
    || p.outcomes.some(x=>x.remainingIds.length===0 || x.remainingIds.length>=p.targetIds.length
      || new Set(x.remainingIds).size!==x.remainingIds.length || x.remainingIds.some(id=>!p.targetIds.includes(id)))
    || covered.size!==p.targetIds.length || p.targetIds.some(x=>!covered.has(x))) return fail('NO-DISCRIMINATION');
  if (p.observation.stride!==1 || p.observation.requiredRecords===0
    || p.observation.maximumRecords<p.observation.requiredRecords) return fail('OBSERVATION-GAP');
  if (p.mode==='whole-input') {
    if (new Set(p.alternatives.map(x=>x.kind)).size!==3 || p.alternatives.length!==3
      || p.alternatives.some(x=>!nonempty(x.reason))) return fail('ALTERNATIVE-AUDIT');
    if (p.alternatives.some(x=>x.disposition==='available' && x.expectedCostMs<p.command.expectedCostMs)) return fail('CHEAPER-AVAILABLE');
  }
  return {allowed:true,code:'OK'};
}
