import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const root=resolve(import.meta.dirname,'..'), dir=mkdtempSync(join(tmpdir(),'as-i18n-'));
mkdirSync(join(dir,'scripts')); cpSync(join(root,'scripts/build-localized-content.mjs'),join(dir,'scripts/build-localized-content.mjs'));
cpSync(join(root,'site'),join(dir,'site'),{recursive:true});
for(const f of ['styles.css','script.js'])cpSync(join(root,f),join(dir,f));
const hook=join(dir,'spawn-hook.mjs'), marker=join(dir,'external-process');
writeFileSync(hook,`import {createRequire,syncBuiltinESMExports} from 'node:module';const require=createRequire(import.meta.url);const cp=require('node:child_process');cp.spawn=()=>{require('node:fs').writeFileSync(${JSON.stringify(marker)},'attempted');throw new Error('FORBIDDEN-EXTERNAL-SPAWN');};syncBuiltinESMExports();`);
const run=args=>spawnSync(process.execPath,['--import',pathToFileURL(hook).href,join(dir,'scripts/build-localized-content.mjs'),...args],{encoding:'utf8'});
const originals=Object.fromEntries(['en','ja','zh-CN'].map(code=>[code,readFileSync(join(dir,'site/locales',code+'.json'))]));
for(const code of Object.keys(originals))writeFileSync(join(dir,'site/locales',code+'.json'),'{}');
let passed=0;
for(const args of [[],['--check'],['--refresh']]){
  const r=run(args);if(r.status===0 || !r.stderr.includes('AS-I18N-001-MISSING-CATALOG') || existsSync(marker))throw new Error('Missing catalog check failed: '+r.stderr);passed++;
}
const conflict=run(['--check','--translate']);
if(conflict.status===0 || !conflict.stderr.includes('AS-I18N-001-CHECK-CANNOT-TRANSLATE') || existsSync(marker))throw new Error('Invalid check translated');passed++;
for(const [code,bytes] of Object.entries(originals))writeFileSync(join(dir,'site/locales',code+'.json'),bytes);
const complete=run([]);
if(complete.status!==0 || existsSync(marker))throw new Error('Complete catalog build failed: '+complete.stderr);passed++;
const generated=['index.html','ko/index.html','ja/index.html','zh/index.html','README.md','README.ko.md','README.ja.md','README.zh-CN.md'];
const baseline=Object.fromEntries(generated.map(file=>[file,readFileSync(join(dir,file))]));
for(const ending of ['\r\n','\r']){
  for(const file of ['index.ko.source.html','README.ko.source.md']){
    const path=join(dir,'site',file), source=readFileSync(path,'utf8').replace(/\r\n?/g,'\n');
    writeFileSync(path,source.replaceAll('\n',ending));
  }
  const same=run(['--check']);
  if(same.status!==0 || existsSync(marker)
      || generated.some(file=>!readFileSync(join(dir,file)).equals(baseline[file])))throw new Error('Source newline changed catalog identity or generated output: '+same.stderr);
  passed++;
}
// The dedicated, freshly created fixture is the only owned cleanup target.
const parent=resolve(dir,'..');
if(parent!==resolve(tmpdir()) || !dir.split(/[\\/]/).at(-1).startsWith('as-i18n-'))throw new Error('Fixture cleanup boundary mismatch');
rmSync(dir,{recursive:true});
process.stdout.write(JSON.stringify({ruleId:'AS-I18N-001',summary:`PASS ${passed}/7`,passed,total:7,externalLaunches:0,temporaryFixtureRemoved:!existsSync(dir)})+'\n');
