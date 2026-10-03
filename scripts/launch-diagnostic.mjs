import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { evaluateDiagnosticContinuation, sha256 } from '../evals/diagnostic-continuation.mjs';

const [planPath,resultPath,mode,...extra]=process.argv.slice(2);
if (!planPath || !resultPath || !['--check','--launch'].includes(mode) || extra.length) {
  process.stderr.write('Usage: node scripts/launch-diagnostic.mjs PLAN NEW_RESULT --check|--launch\n');
  process.exit(64);
}
if (existsSync(resultPath)) throw new Error('AS-DC-001-RESULT-EXISTS');
const bytes=readFileSync(planPath), plan=JSON.parse(bytes);
const decision=evaluateDiagnosticContinuation(plan);
const result={schemaVersion:1,ruleId:'AS-DC-001',planSha256:sha256(bytes),...decision,
  status:decision.allowed?'preflight-passed':'blocked',childStarted:false};
writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
if (!decision.allowed || mode==='--check') {
  process.stdout.write(JSON.stringify(result)+'\n'); process.exit(decision.allowed?0:2);
}
// Retain the project's supervised runner as the command; do not invent a new acceptance runner.
const child=spawn(plan.command.executable,plan.command.args,{cwd:plan.command.cwd,shell:false,stdio:'inherit'});
result.childStarted=true;result.status='running';result.pid=child.pid;
writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n');
child.once('error',error=>{
  result.status='launch-failed';result.failureId='AS-DC-001-SPAWN';result.message=error.message;
  writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n');process.exitCode=1;
});
child.once('exit',(code,signal)=>{
  result.status=code===0?'command-returned':'command-failed';result.exitCode=code;result.signal=signal;
  writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n');process.exitCode=code??1;
});
