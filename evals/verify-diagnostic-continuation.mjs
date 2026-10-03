import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluateDiagnosticContinuation as evaluate, sha256 } from './diagnostic-continuation.mjs';

const suite=JSON.parse(readFileSync(new URL('./diagnostic-continuation-cases.json',import.meta.url)));
const contract=JSON.parse(readFileSync(new URL('./diagnostic-continuation-contract.json',import.meta.url)));
const folder=mkdtempSync(join(tmpdir(),'as-diagnostic-'));
const recordPath=join(folder,'prior.json');
const record=Buffer.from(JSON.stringify({status:'timed-out',inputsStable:true,processesStopped:true}));
writeFileSync(recordPath,record);
const ref={path:recordPath,sha256:sha256(record)};
const marker=join(folder,'child-started');
function fixture(changes) {
  const p={ruleId:'AS-DC-001',purpose:'diagnostic',completionMode:'diagnostic-only',mode:'focused',
    authorizedScope:'project',requestedScope:'project',inputFingerprint:'a'.repeat(64),
    acceptance:{inputFingerprint:'a'.repeat(64),timeoutMs:1200000},
    command:{executable:process.execPath,args:['-e',`require('node:fs').writeFileSync(${JSON.stringify(marker)},'yes')`],cwd:folder,expectedCostMs:1200000,timeoutMs:1200000},
    maximumWholeInputRuns:2,priorRuns:[{mode:'whole-input',record:ref}],
    targetIds:['phase-A','phase-B'],outcomes:[{id:'A',remainingIds:['phase-A']},{id:'B',remainingIds:['phase-B']}],
    observation:{stride:1,maximumRecords:8192,requiredRecords:7683},
    alternatives:['source-review','focused-reproduction','checkpoint-reuse'].map(kind=>({kind,disposition:'unavailable',reason:'Inspected; selected state cannot yet be reconstructed.',record:ref,expectedCostMs:1000})),evidence:[ref]};
  for(const k of ['mode','purpose','completionMode','requestedScope','maximumWholeInputRuns']) if(Object.hasOwn(changes,k))p[k]=changes[k];
  for(const k of ['expectedCostMs','timeoutMs'])if(Object.hasOwn(changes,k))p.command[k]=changes[k];
  for(const k of ['stride','maximumRecords'])if(Object.hasOwn(changes,k))p.observation[k]=changes[k];
  if(changes.noGain)p.outcomes=[{id:'renamed',remainingIds:[...p.targetIds]}];
  if(changes.cheaperAvailable)p.alternatives[1].disposition='available';
  if(Object.hasOwn(changes,'reuseReason'))p.alternatives[2].reason=changes.reuseReason;
  if(changes.omitFocused)p.alternatives=p.alternatives.filter(x=>x.kind!=='focused-reproduction');
  if(changes.staleEvidence)p.evidence=[{...ref,sha256:'b'.repeat(64)}];
  if(changes.omitEvidence)p.evidence=[];
  if(changes.unknownFields)p.looksImproved=true;
  if(changes.omitCandidate)p.outcomes.pop();
  return p;
}
let passed=0;
for(const c of suite.cases){
  if(!contract.evaluation.cases.some(([id,code])=>id===c.id&&code===c.expected))throw new Error('FROZEN-SUITE-DRIFT');
  const p=fixture(c.changes), decision=evaluate(p);
  if(decision.code!==c.expected || decision.allowed!==(c.expected==='OK'))throw new Error(`${c.id}: ${JSON.stringify(decision)}`);
  // Every rejection exercises the real launch path with a child that would leave evidence.
  if(!decision.allowed){
    const plan=join(folder,c.id+'.json'),result=join(folder,c.id+'.result.json');writeFileSync(plan,JSON.stringify(p));
    const child=spawnSync(process.execPath,[resolve(import.meta.dirname,'../scripts/launch-diagnostic.mjs'),plan,result,'--launch'],{encoding:'utf8'});
    const output=JSON.parse(readFileSync(result));
    if(child.status!==2 || output.childStarted || existsSync(marker))throw new Error(`${c.id}: forbidden child launch`);
  }
  passed++;
}
const allowedPath=join(folder,'allowed.json'),allowedResult=join(folder,'allowed.result.json');
writeFileSync(allowedPath,JSON.stringify(fixture({})));
const allowed=spawnSync(process.execPath,[resolve(import.meta.dirname,'../scripts/launch-diagnostic.mjs'),allowedPath,allowedResult,'--launch'],{encoding:'utf8'});
if(allowed.status!==0 || !existsSync(marker) || JSON.parse(readFileSync(allowedResult)).status!=='command-returned')throw new Error('Normal child did not execute');
if(passed!==contract.evaluation.cases.length)throw new Error('CASE-COUNT-DRIFT');
process.stdout.write(JSON.stringify({ruleId:'AS-DC-001',summary:`PASS ${passed}/${suite.cases.length}`,passed,total:suite.cases.length,forbiddenLaunches:0,normalChildExecuted:true,
  contractSha256:sha256(readFileSync(new URL('./diagnostic-continuation-contract.json',import.meta.url))),
  suiteSha256:sha256(readFileSync(new URL('./diagnostic-continuation-cases.json',import.meta.url))),evidenceDirectory:folder})+'\n');
