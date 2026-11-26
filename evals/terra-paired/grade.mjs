import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";

const [id,file] = process.argv.slice(2);
const digest = text => createHash("sha256").update(text,"utf8").digest("hex");
function freeze(input) {
  if (input && typeof input === "object") {
    for (const value of Object.values(input)) freeze(value);
    Object.freeze(input);
  }
  return input;
}
const version = "v0.8.2";
const css = "body{color:#17201d}";
const js = "export const version = 'static'";
const cssName = "site."+digest(css).slice(0,12)+".css";
const jsName = "app."+digest(js).slice(0,12)+".js";
function bundle(v=version) {
  const pages = Object.fromEntries(["en","ko","ja","zh"].map((locale,i) => {
    const prefix = i===0?"./":"../";
    return [locale, '<meta content="'+v+'" name="application-version">\n<span data-site-version> '+v+' </span>\n<script src="'+prefix+'site-assets/'+jsName+'"></script>\n<link href="'+prefix+'site-assets/'+cssName+'" rel="stylesheet">'];
  }));
  return {version:v,pages,assets:{["site-assets/"+jsName]:js,["site-assets/"+cssName]:css}};
}
const active=freeze({version:"v0.8.1",pages:{},assets:{}});
function acceptRelease(fn,candidate) {
  assert.deepEqual(fn(active,freeze(candidate)),{ok:true,active:candidate,errors:[]});
}
function rejectRelease(fn,candidate) {
  const result=fn(active,freeze(candidate));
  assert.equal(result.ok,false);
  assert.deepEqual(result.active,active);
  assert.ok(Array.isArray(result.errors)&&result.errors.some(x=>typeof x==="string"&&x.trim()));
}
const releaseCases = [
  ["valid-four-locales",fn=>acceptRelease(fn,bundle())],
  ["multi-digit-version",fn=>acceptRelease(fn,bundle("v12.34.10"))],
  ["missing-literal-version",fn=>{const b=bundle();b.pages.ko=b.pages.ko.replace(/<span[^>]*>[^<]*<\/span>/,"");rejectRelease(fn,b);}],
  ["disagreement-and-duplicate",fn=>{
    const b=bundle();b.pages.ja=b.pages.ja.replace("<span data-site-version> "+version,"<span data-site-version> v0.8.1");rejectRelease(fn,b);
    const c=bundle();c.pages.zh=c.pages.zh+'<span data-site-version>'+version+'</span>';rejectRelease(fn,c);
  }],
  ["asset-content-mismatch",fn=>{const b=bundle();b.assets["site-assets/"+jsName]+="\n// changed";rejectRelease(fn,b);}],
  ["asset-url-and-availability",fn=>{
    const b=bundle();b.pages.en=b.pages.en.replace(jsName,jsName+"?v=1");rejectRelease(fn,b);
    const c=bundle();c.pages.ko=c.pages.ko.replace("../site-assets/"+cssName,"https://example.invalid/site-assets/"+cssName);rejectRelease(fn,c);
    const d=bundle();delete d.assets["site-assets/"+cssName];rejectRelease(fn,d);
  }],
  ["locale-and-version-shape",fn=>{
    const b=bundle();delete b.pages.zh;b.pages.fr=b.pages.en;rejectRelease(fn,b);
    const c=bundle("v0.8");rejectRelease(fn,c);
  }],
  ["nested-relative-normalization",fn=>{const b=bundle();b.pages.ja=b.pages.ja.replaceAll("../site-assets/","../site-assets/../site-assets/");acceptRelease(fn,b);}],
];

const ev=(seq,id,from,to,amount)=>({seq,id,from,to,amount});
const empty=()=>({nextSeq:1,balances:{A:100,B:20,C:5},applied:[]});
const e1=ev(1,"e1","A","B",40), e2=ev(2,"e2","B","C",45);
const before=()=>({nextSeq:2,balances:{A:60,B:60,C:5},applied:[e1]});
function acceptLedger(fn,s,events,state) {
  assert.deepEqual(fn(freeze(s),freeze(events)),{ok:true,state});
}
function rejectLedger(fn,s,events) {
  const out=fn(freeze(s),freeze(events));
  assert.equal(out.ok,false);
  assert.deepEqual(out.state,s);
  assert.ok(typeof out.error==="string"&&out.error.trim());
}
const ledgerCases=[
  ["out-of-order-and-dependent-balance",fn=>acceptLedger(fn,empty(),[e2,e1],{nextSeq:3,balances:{A:60,B:15,C:50},applied:[e1,e2]})],
  ["replay-with-reordered-properties",fn=>acceptLedger(fn,before(),[{amount:40,to:"B",id:"e1",from:"A",seq:1}],before())],
  ["replayed-and-new-duplicates",fn=>acceptLedger(fn,before(),[{...e2},e1,{...e2}],{nextSeq:3,balances:{A:60,B:15,C:50},applied:[e1,e2]})],
  ["known-id-changed-payload",fn=>rejectLedger(fn,before(),[{...e1,amount:41}])],
  ["sequence-collision-and-gap",fn=>{rejectLedger(fn,before(),[{...e1,id:"new"}]);rejectLedger(fn,empty(),[e1,{...e2,seq:3}]);}],
  ["malformed-replay-and-account",fn=>{
    rejectLedger(fn,before(),[{...e1,extra:true}]);rejectLedger(fn,empty(),[{...e1,amount:1.5}]);
    rejectLedger(fn,empty(),[{...e1,to:"unknown"}]);rejectLedger(fn,empty(),[{...e1,to:"A"}]);
  }],
  ["insufficient-funds-rolls-back",fn=>rejectLedger(fn,empty(),[e1,{...e2,amount:61}])],
  ["safe-integer-overflow-rolls-back",fn=>rejectLedger(fn,{nextSeq:1,balances:{A:100,B:0,C:Number.MAX_SAFE_INTEGER},applied:[]},[e1,{...e2,amount:1}])],
];

const graph=()=>({
  a:{input:"a1",deps:[]},b:{input:"b1",deps:[]},c:{input:"c1",deps:["b","a"]},
  d:{input:"d1",deps:["a"]},e:{input:"e1",deps:["d","c"]},unused:{input:"u1",deps:[]}
});
const fp=(input,deps=[])=>digest(JSON.stringify([input,deps]));
function fingerprints(aInput="a1",dInput="d1") {
  const a=fp(aInput), b=fp("b1"), c=fp("c1",[["a",a],["b",b]]), d=fp(dInput,[["a",a]]);
  return {a,b,c,d,e:fp("e1",[["c",c],["d",d]])};
}
const ordered=["a","b","c","d","e"];
function acceptPlan(fn,g,cache,targets,order,rebuild,values) {
  assert.deepEqual(fn(freeze(g),freeze(cache),freeze(targets)),{ok:true,order,rebuild,fingerprints:values});
}
function rejectPlan(fn,g,targets) {
  const out=fn(freeze(g),freeze({}),freeze(targets));
  assert.equal(out.ok,false);
  assert.ok(typeof out.error==="string"&&out.error.trim());
  assert.equal(Object.hasOwn(out,"order"),false);
}
const plannerCases=[
  ["transitive-closure-and-fingerprints",fn=>acceptPlan(fn,graph(),{},["e"],ordered,ordered,fingerprints())],
  ["unchanged-closure-cached",fn=>acceptPlan(fn,graph(),{...fingerprints(),unused:"old"},["e"],ordered,[],fingerprints())],
  ["transitive-invalidation",fn=>{const g=graph();g.a.input="a2";acceptPlan(fn,g,fingerprints(),["e"],ordered,["a","c","d","e"],fingerprints("a2"));}],
  ["input-and-target-order-independent",fn=>{
    const g=graph();g.c.deps.reverse();g.e.deps.reverse();
    acceptPlan(fn,g,{},["e","d","e","a"],ordered,ordered,fingerprints());
  }],
  ["lexically-first-ready",fn=>{
    const g={z:{input:"z",deps:[]},a:{input:"a",deps:[]},b:{input:"b",deps:["a"]}};
    const a=fp("a");
    acceptPlan(fn,g,{},["z","b"],["a","b","z"],["a","b","z"],{a,b:fp("b",[["a",a]]),z:fp("z")});
  }],
  ["unreachable-cycle-and-missing-link",fn=>{
    const g=graph();g.unused.deps=["unused"];rejectPlan(fn,g,["e"]);
    const h=graph();h.unused.deps=["absent"];rejectPlan(fn,h,["e"]);
  }],
  ["invalid-entry-and-target",fn=>{
    const g=graph();g.unused.deps=["a","a"];rejectPlan(fn,g,["e"]);
    const h=graph();h.unused.input=42;rejectPlan(fn,h,["e"]);
    rejectPlan(fn,graph(),["absent"]);
  }],
  ["empty-targets-still-validate",fn=>{
    acceptPlan(fn,graph(),{},[],[],[],{});
    const g=graph();g.unused.deps=["unused"];rejectPlan(fn,g,[]);
  }],
];
const definitions={
  "localized-publish":["promoteRelease",releaseCases],
  "payment-replay":["applyBatch",ledgerCases],
  "build-plan":["planBuild",plannerCases],
};
const [entry,cases]=definitions[id];
let implementation, loadError;
try {
  implementation=(await import(pathToFileURL(file).href))[entry];
  assert.equal(typeof implementation,"function");
} catch(error) {
  loadError=error.message;
}
const checks=cases.map(([id,run])=>{
  if(loadError)return {id,passed:false,reason:"Cannot load entry point: "+loadError};
  try {
    run(implementation);
    return {id,passed:true};
  } catch(error) {
    return {id,passed:false,reason:error.message.split("\n")[0].slice(0,160)};
  }
});
console.log(JSON.stringify({checks,passed:checks.filter(row=>row.passed).length,total:checks.length}));
