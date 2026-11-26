import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {cpSync,mkdtempSync,readFileSync,realpathSync,rmSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {basename,dirname,join,relative,resolve,sep} from "node:path";

const suite=import.meta.dirname;
const read=(file)=>readFileSync(join(suite,file));
const hash=(value)=>createHash("sha256").update(value).digest("hex");
const frozenBytes=read("frozen.json");
const frozen=JSON.parse(frozenBytes);
const result=JSON.parse(read("results.json"));
assert.equal(hash(frozenBytes),result.manifestSha256);
assert.equal(hash(read("starter-v0.8.2.txt").toString("utf8").trimEnd()),frozen.prompt.sha256);
for(const [file,expected] of Object.entries(frozen.files))assert.equal(hash(read(file)),expected,file);
assert.equal(result.rows.length,frozen.matching.order.length);
assert.deepEqual(result.rows.map(({caseId,arm})=>({caseId,arm})),frozen.matching.order);
const tasks=JSON.parse(read("tasks.json"));
const tempRoot=realpathSync(tmpdir());
const temp=realpathSync(mkdtempSync(join(tempRoot,"as-terra-replay-")));
const insideTemp=relative(tempRoot,temp);
assert.ok(insideTemp.startsWith("as-terra-replay-")&&!insideTemp.includes(sep));

function run(directory,args) {
  return spawnSync(process.execPath,[
    "--permission","--allow-fs-read="+directory,"--allow-fs-read="+join(suite,"grade.mjs"),...args
  ],{cwd:directory,encoding:"utf8",timeout:15000,maxBuffer:600000,windowsHide:true});
}
function testRun(directory,files) {
  for(const file of files) {
    const path=relative(directory,resolve(directory,file));
    assert.ok(path&&!path.startsWith("..")&&!path.includes(":"));
  }
  const result=run(directory,["--test","--test-isolation=none","--test-reporter=tap",...files]);
  return {exit:result.status,tests:Number(result.stdout?.match(/^# tests (\d+)$/m)?.[1]??0),
    failed:Number(result.stdout?.match(/^# fail (\d+)$/m)?.[1]??0)};
}

try {
  for(const row of result.rows) {
    const task=tasks.find(t=>t.id===row.caseId);
    const archive=join(suite,"runs",row.caseId,row.arm);
    const work=join(temp,String(row.index));
    cpSync(archive,work,{recursive:true});
    const source=join(work,task.file);
    assert.equal(hash(readFileSync(source)),row.implementationSha256,source);
    const grade=run(work,[join(suite,"grade.mjs"),task.id,source]);
    assert.equal(grade.status,0,grade.stderr);
    const observed=JSON.parse(grade.stdout.trim().split(/\r?\n/).at(-1));
    const verdicts=value=>value.checks.map(({id,passed})=>({id,passed}));
    assert.deepEqual(verdicts(observed),verdicts(row.functionality));
    assert.equal(observed.passed,row.functionality.passed);

    let detected=false;
    if(row.regression.tests.length) {
      const check=testRun(work,row.regression.tests);
      if(check.exit===0&&check.tests>0) {
        writeFileSync(source,read("fixtures/"+task.id+"/"+task.file));
        const broken=testRun(work,row.regression.tests);
        detected=broken.exit===1&&broken.failed>0;
      }
    }
    assert.equal(detected,row.regression.passed,"Seed detection result differs for "+row.caseId+"/"+row.arm);
    console.log(row.caseId,row.arm,observed.passed+"/"+observed.total,"seed-detecting tests:",detected);
  }
} finally {
  assert.equal(dirname(temp),tempRoot);
  assert.ok(basename(temp).startsWith("as-terra-replay-"));
  rmSync(temp,{recursive:true,force:true});
}
console.log("Terra paired execution replay: "+result.rows.length+"/"+frozen.matching.order.length+" matching runs");
